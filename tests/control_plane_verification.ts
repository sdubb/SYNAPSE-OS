/**
 * @file control_plane_verification.ts
 * @description Comprehensive end-to-end integration and unit verification test suite for Synapse OS Control Plane, Agent Registry, and Runtime Manager.
 */

import { AgentRegistry, AgentCapabilities } from '../packages/agent-registry/src/index.js';
import { RuntimeManager } from '../packages/runtime-manager/src/index.js';
import {
  ControlPlane,
  TaskStateRecord,
  DependencyCycleError,
  StateReducer,
  SynapseEventEnvelope,
} from '../packages/control-plane/src/index.js';
import * as os from 'node:os';
import * as path from 'node:path';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

async function runTests() {
  console.log('=== 1. Testing @synapse/agent-registry ===');
  const registry = new AgentRegistry(true);
  assert(registry.size() === 3, `Expected 3 default seeded agents, found ${registry.size()}`);

  const devAgent = registry.get('synapse-general-developer');
  assert(devAgent !== undefined, 'General developer agent must exist');
  assert(devAgent!.capabilities.isToolAllowed('bash'), 'Dev agent must allow bash');
  assert(!devAgent!.capabilities.isToolAllowed('fake_tool'), 'Unknown tool must be denied');

  // Test shell security check
  const rootCheck = devAgent!.capabilities.canExecuteShellCommand('sudo rm -rf /');
  assert(!rootCheck.allowed, 'Sudo commands must be forbidden');

  const dangerousCheck = devAgent!.capabilities.canExecuteShellCommand('rm -rf /');
  assert(!dangerousCheck.allowed, 'Dangerous root rm -rf pattern must be forbidden');

  const safeCheck = devAgent!.capabilities.canExecuteShellCommand('npm test');
  assert(safeCheck.allowed, 'Safe npm test command must be allowed');

  // Test custom registration
  const customAgent = registry.register({
    id: 'custom-qa-agent',
    name: 'Custom QA Specialist',
    description: 'Specialist for smoke testing',
    version: '1.0.0',
    author: 'Test Suite',
    systemPrompt: 'You are a smoke tester in {{WORKSPACE}}.',
    modelConfig: {
      provider: 'openai',
      modelId: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 4096,
      contextWindowTokens: 128_000,
      stream: true,
    },
    capabilities: AgentCapabilities.createDefaultReadOnly(),
    ownership: {
      agentId: 'custom-qa-agent',
      ownerId: 'user-1',
      tenantId: 'tenant-alpha',
      visibility: 'TENANT_SHARED',
      acl: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tags: ['qa', 'smoke-test'],
  });
  assert(registry.size() === 4, 'Custom agent should be registered');

  // Test discovery
  const discovery = registry.list({ tenantId: 'tenant-alpha', query: 'smoke' });
  assert(discovery.items.length === 1, `Discovery should match 1 agent, found ${discovery.items.length}`);
  assert(discovery.items[0].id === 'custom-qa-agent', 'Discovered agent must match custom-qa-agent');

  console.log('✓ @synapse/agent-registry passed all checks.');

  console.log('\n=== 2. Testing @synapse/runtime-manager ===');
  const runtimeManager = new RuntimeManager({ maxGlobalConcurrency: 10 });
  const tmpRoot = path.join(os.tmpdir(), 'synapse_test_ws');

  const runtime = await runtimeManager.createRuntime({
    agentId: 'synapse-general-developer',
    sessionId: 'test-session-001',
    tenantId: 'tenant-alpha',
    workspaceRoot: tmpRoot,
  });
  assert(runtime.getStatus() === 'READY', 'Runtime instance should be READY');

  // Path Isolation checks
  const safeResolved = runtime.workspaceIsolation.resolveSafePath('src/index.ts', 'read');
  assert(safeResolved.includes('src'), 'Safe path should resolve');

  let pathEscapeCaught = false;
  try {
    runtime.workspaceIsolation.resolveSafePath('../../escaped.txt', 'read');
  } catch (err) {
    pathEscapeCaught = true;
  }
  assert(pathEscapeCaught, 'Path escaping workspace root must be rejected');

  // Resource limit evaluation
  runtime.resourceLimits.recordTokenUsage(1000, 500, 0.05);
  const snap = runtime.resourceLimits.getSnapshot();
  assert(snap.totalTokens === 1500, `Total tokens must be 1500, got ${snap.totalTokens}`);
  assert(snap.totalCostUsd === 0.05, `Cost must be 0.05, got ${snap.totalCostUsd}`);

  await runtimeManager.terminateRuntime(runtime.instanceId);
  await runtimeManager.shutdown();
  console.log('✓ @synapse/runtime-manager passed all checks.');

  console.log('\n=== 3. Testing @synapse/control-plane ===');
  const cp = new ControlPlane({ maxGlobalConcurrency: 10, defaultWorkspaceBaseDir: tmpRoot });

  // Test Task State Machine & DAG
  const task1 = cp.tasks.createTask({
    tenantId: 'tenant-alpha',
    title: 'Initialize Repository',
    description: 'Set up package.json and tsconfig',
  });
  assert(task1.status === 'QUEUED', 'Independent task should automatically advance to QUEUED');

  const task2 = cp.tasks.createTask({
    tenantId: 'tenant-alpha',
    title: 'Implement Core Feature',
    description: 'Write business logic modules',
    dependencies: [task1.taskId],
  });
  assert(task2.status === 'PLANNED', 'Dependent task should start in PLANNED');

  const task3 = cp.tasks.createTask({
    tenantId: 'tenant-alpha',
    title: 'Run Integration Tests',
    description: 'Verify end-to-end functionality',
    dependencies: [task2.taskId],
  });
  assert(task3.status === 'PLANNED', 'Dependent task should start in PLANNED');

  // Test DAG Cycle Detection
  let cycleCaught = false;
  try {
    // Attempt to make task1 depend on task3 (1 -> 2 -> 3 -> 1)
    cp.tasks.addDependency(task1.taskId, task3.taskId);
  } catch (err) {
    if (err instanceof DependencyCycleError) {
      cycleCaught = true;
    }
  }
  assert(cycleCaught, 'Cyclic dependency (1->2->3->1) must throw DependencyCycleError');

  // Execute Task 1
  cp.tasks.setTaskStatus(task1.taskId, 'RUNNING');
  cp.tasks.setTaskStatus(task1.taskId, 'VERIFYING');
  cp.tasks.setTaskStatus(task1.taskId, 'COMPLETED');

  // Verify task2 automatically unblocked to QUEUED
  const task2Updated = cp.tasks.getTaskOrThrow(task2.taskId);
  assert(task2Updated.status === 'QUEUED', `Task2 should now be QUEUED, is ${task2Updated.status}`);

  // Test Topological Sorting
  const topo = cp.tasks.getTopologicalOrder();
  assert(topo.indexOf(task1.taskId) < topo.indexOf(task2.taskId), 'Task1 must precede Task2 in topological sort');
  assert(topo.indexOf(task2.taskId) < topo.indexOf(task3.taskId), 'Task2 must precede Task3 in topological sort');

  // Test Team Controller & Governance
  const team = cp.teams.createTeam({
    tenantId: 'tenant-alpha',
    name: 'Core Platform Squad',
    leadAgentId: 'synapse-general-developer',
    budget: { maxTokens: 100_000, maxCostUsd: 10.0, maxSubAgentDepth: 2 },
  });
  assert(team.members.length === 1, 'Team should have 1 member initially');

  cp.teams.addMember(team.teamId, 'synapse-test-engineer', 'WORKER');
  const updatedTeam = cp.teams.getTeamOrThrow(team.teamId);
  assert(updatedTeam.members.length === 2, 'Team should have 2 members after addition');

  const delegation = cp.teams.registerDelegation(
    team.teamId,
    'parent-sess-1',
    'synapse-general-developer',
    'child-sess-1',
    'synapse-test-engineer',
    1,
    'Write automated test suites'
  );
  assert(delegation.status === 'ACTIVE', 'Delegation should be ACTIVE');
  cp.teams.completeDelegation(team.teamId, delegation.delegationId, 'COMPLETED');

  // Test Agent Lifecycle (Start -> Pause -> Resume -> Stop)
  const startResult = await cp.startAgent({
    tenantId: 'tenant-alpha',
    agentId: 'synapse-general-developer',
    taskId: task2.taskId,
    workspaceRoot: tmpRoot,
  });
  assert(startResult.success, 'StartAgent command must succeed');

  const agentRunning = cp.agents.getAgentStateOrThrow('synapse-general-developer');
  assert(agentRunning.status === 'RUNNING', 'Agent must be in RUNNING state');

  await cp.pauseAgent({
    tenantId: 'tenant-alpha',
    agentId: 'synapse-general-developer',
    reason: 'Pausing for user inspection',
  });
  const agentPaused = cp.agents.getAgentStateOrThrow('synapse-general-developer');
  assert(agentPaused.status === 'PAUSED', 'Agent must be in PAUSED state');

  await cp.resumeAgent({
    tenantId: 'tenant-alpha',
    agentId: 'synapse-general-developer',
  });
  const agentResumed = cp.agents.getAgentStateOrThrow('synapse-general-developer');
  assert(agentResumed.status === 'RUNNING', 'Agent must be in RUNNING state');

  await cp.stopAgent({
    tenantId: 'tenant-alpha',
    agentId: 'synapse-general-developer',
    reason: 'Task finished',
  });
  const agentStopped = cp.agents.getAgentStateOrThrow('synapse-general-developer');
  assert(agentStopped.status === 'STOPPED', 'Agent must be in STOPPED state');

  // Test Deterministic State Reducer
  const mockInitial = StateReducer.reduceAgentState(agentStopped, {
    eventId: 'evt-1',
    eventType: 'AGENT_SESSION_COMPLETED',
    correlationId: 'synapse-general-developer',
    tenantId: 'tenant-alpha',
    timestamp: new Date(),
    payload: {
      tokensConsumed: 2500,
      costUsd: 0.12,
      toolCalls: 4,
      taskSuccess: true,
    },
  });
  assert(mockInitial.status === 'IDLE', 'State reducer should reset status to IDLE after session completion');
  assert(mockInitial.metrics.totalTokensConsumed === 2500, 'Metrics should accumulate 2500 tokens');

  // Health check
  const health = cp.getHealth();
  assert(health.status === 'HEALTHY', 'Control plane health should be HEALTHY');

  await cp.shutdown();
  console.log('✓ @synapse/control-plane passed all checks.');
  console.log('\n🎉 ALL VERIFICATION TESTS PASSED PERFECTLY!');
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test suite failed with error:', err);
    process.exit(1);
  });
