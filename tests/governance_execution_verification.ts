/**
 * @file governance_execution_verification.ts
 * @description Comprehensive test suite verifying SYNAPSE-OS authoritative governance,
 * tool interception, approval lifecycle, stream deduplication, model pricing, durable queues,
 * and evidence sealing.
 */

import { ToolGateway } from '../packages/tool-gateway/src/ToolGateway.js';
import { PolicyEngine } from '../packages/policy-engine/src/PolicyEngine.js';
import { SafetyEngine } from '../packages/safety-engine/src/SafetyEngine.js';
import { ApprovalEngine } from '../packages/approval-engine/src/ApprovalEngine.js';
import { CapabilityRegistry } from '../packages/capabilities/src/CapabilityRegistry.js';
import { EvidenceStore, EvidenceChain } from '../packages/evidence/src/index.js';
import { AuditEngine } from '../packages/audit-engine/src/AuditEngine.js';
import { EventBus } from '../packages/event-bus/src/EventBus.js';
import { SecretRedactor } from '../packages/secrets/src/SecretRedactor.js';
import { ClineEngine } from '../packages/engine-adapter/src/ClineEngine.js';
import { ClineSession } from '../packages/engine-adapter/src/ClineSession.js';
import { RuntimeManager } from '../packages/runtime-manager/src/RuntimeManager.js';
import { TaskController } from '../packages/control-plane/src/TaskController.js';
import { DurableJobQueue } from '../apps/worker/src/queues/DurableJobQueue.js';
import { TaskStateValidator } from '../packages/control-plane/src/state/TaskState.js';

async function runGovernanceExecutionVerification() {
  console.log('================================================================');
  console.log('    SYNAPSE-OS EXECUTION GOVERNANCE & ARCHITECTURE VERIFICATION');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${testName}`);
      if (detail) console.log(`     -> ${detail}`);
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      if (detail) console.error(`     -> Error: ${detail}`);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Tool Gateway Precedence & Multi-Level Interception
  // -------------------------------------------------------------
  console.log('[TEST 1] Testing Tool Gateway Precedence & Path Boundary Enforcement...');
  const policyEngine = new PolicyEngine();
  const safetyEngine = new SafetyEngine();
  const approvalEngine = new ApprovalEngine();
  const capabilityRegistry = new CapabilityRegistry();
  const evidenceStore = new EvidenceStore();
  const auditEngine = new AuditEngine();
  const eventBus = new EventBus();
  const secretRedactor = new SecretRedactor();

  await auditEngine.initialize();
  await eventBus.start();

  const toolGateway = new ToolGateway({
    policyEngine,
    safetyEngine,
    approvalEngine,
    capabilityRegistry,
    evidenceStore,
    auditEngine,
    eventBus,
    secretRedactor,
  });

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const workspaceRoot = 'C:\\sandbox\\workspace';

  // 1.1 Path Traversal Escape Attempt
  const traversalAuth = await toolGateway.evaluateAndAuthorizeToolCall({
    tenantId,
    agentId: 'test-agent',
    sessionId: 'sess-001',
    workspaceRoot,
    toolName: 'read_file',
    toolArguments: { path: '../../../../windows/system32/cmd.exe' },
  });

  assert(
    !traversalAuth.authorized && traversalAuth.decision === 'BLOCK',
    'Path Traversal Boundary Block',
    `Decision: ${traversalAuth.decision}, Reason: ${traversalAuth.reason}`
  );

  // 1.2 System Kill Switch Level 2 Stop
  safetyEngine.getKillSwitch().triggerLevel2('sess-killed-002');
  const killSwitchAuth = await toolGateway.evaluateAndAuthorizeToolCall({
    tenantId,
    agentId: 'test-agent',
    sessionId: 'sess-killed-002',
    workspaceRoot,
    toolName: 'read_file',
    toolArguments: { path: 'valid_file.txt' },
  });

  assert(
    !killSwitchAuth.authorized && killSwitchAuth.decision === 'BLOCK',
    'Emergency Kill Switch Session Stop Enforcement',
    `Decision: ${killSwitchAuth.decision}, Reason: ${killSwitchAuth.reason}`
  );

  // -------------------------------------------------------------
  // TEST 2: Human Approval Requirement & Decision Pipeline
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing Human Approval Requirement & Async Decision Flow...');

  // 2.1 Destructive command requiring approval
  let approvalRequiredEmitted = false;
  eventBus.subscribe('tool.approval_required', () => {
    approvalRequiredEmitted = true;
  });

  const approvalPromise = toolGateway.evaluateAndAuthorizeToolCall({
    tenantId,
    agentId: 'test-agent',
    sessionId: 'sess-003',
    workspaceRoot,
    toolName: 'execute_command',
    toolArguments: { command: 'docker system prune -a' },
  });

  // Wait a microtask to allow approval request creation
  await new Promise((r) => setTimeout(r, 50));

  const pendingApprovals = await approvalEngine.listPending(tenantId);
  assert(pendingApprovals.length > 0, 'Approval Request Created & Stored', `Pending count: ${pendingApprovals.length}`);

  // Operator Approves Request
  const pendingId = pendingApprovals[0].id;
  await approvalEngine.submitDecision(
    { tenantId, requestId: pendingId, decision: 'APPROVED', reason: 'Verified by human operator' },
    { userId: 'admin-user', role: 'ADMIN' }
  );

  const approvedAuth = await approvalPromise;
  assert(
    approvedAuth.authorized && approvedAuth.decision === 'ALLOW',
    'Operator Approval Resolution Grants Execution',
    `Decision: ${approvedAuth.decision}, Reason: ${approvedAuth.reason}`
  );
  assert(approvalRequiredEmitted, 'Approval Required Event Emitted to EventBus');

  // -------------------------------------------------------------
  // TEST 3: Authoritative Tool Execution with Cryptographic Evidence
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Authoritative Tool Execution & Cryptographic Evidence Capture...');

  let toolExecutedSuccessfully = false;
  const test3Context = {
    tenantId,
    agentId: 'test-agent',
    sessionId: 'sess-004',
    callId: 'test-3-call',
    workspaceRoot,
    toolName: 'read_file',
    toolArguments: { path: 'src/index.ts' },
  };
  
  const test3Auth = await toolGateway.evaluateAndAuthorizeToolCall(test3Context);
  assert(test3Auth.authorized, 'Test 3 Execution Authorized');

  const execResult = await toolGateway.executeTool(
    test3Context,
    async (ctx) => {
      toolExecutedSuccessfully = true;
      return 'export const version = "2.0.0"; // API_KEY=sk_secret_val_123';
    },
    test3Auth.authorizationToken
  );

  assert(execResult.success, 'Tool Gateway Execution Succeeded', `Duration: ${execResult.durationMs}ms - Error: ${execResult.error}`);
  assert(toolExecutedSuccessfully, 'Tool Executor Routine Invoked Safely');
  assert(typeof execResult.evidenceId === 'string', 'Cryptographic Evidence Item Captured', `Evidence ID: ${execResult.evidenceId}`);
  assert(typeof execResult.auditEventId === 'string', 'Audit Record Created', `Audit ID: ${execResult.auditEventId}`);

  // -------------------------------------------------------------
  // TEST 4: ClineEngine & Session Hardening (No YOLO, No Duplicates)
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing ClineSession Stream Deduplication & Model Pricing...');

  const clineSession = new ClineSession({
    synapseSessionId: 'syn-sess-100',
    clineSessionId: 'cline-sess-100',
    tenantId,
    agentId: 'test-agent',
    missionId: 'mission-01',
    taskId: 'task-01',
    runId: 'run-01',
    attemptId: 'att-01',
    workspaceId: 'ws-01',
    runtimeId: 'rt-01',
    cline: {} as any,
    modelConfig: {
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet',
      inputPricePer1M: 3.0,
      outputPricePer1M: 15.0,
    },
  });

  // Simulate streaming chunks
  clineSession.dispatchNativeEvent({
    type: 'chunk',
    payload: {
      stream: 'text',
      chunk: 'Hello ',
      ts: Date.now(),
    },
  } as any);

  clineSession.dispatchNativeEvent({
    type: 'chunk',
    payload: {
      stream: 'text',
      chunk: 'World!',
      ts: Date.now(),
    },
  } as any);

  // Check that collectedMessages didn't duplicate every individual token chunk
  assert(
    clineSession.getCollectedMessages().length === 0,
    'Stream Chunks Not Duplicated in Message History'
  );

  // Complete message
  clineSession.dispatchNativeEvent({
    type: 'agent_event',
    payload: {
      event: { type: 'message', content: 'Hello World!' },
    },
  } as any);

  assert(
    clineSession.getCollectedMessages().length === 1 &&
    clineSession.getCollectedMessages()[0].content === 'Hello World!',
    'Consolidated Message Captured on Completion'
  );

  // Simulate tool token usage
  clineSession.dispatchNativeEvent({
    type: 'hook',
    payload: {
      hookEventName: 'tool_result',
      toolName: 'read_file',
      inputTokens: 1000,
      outputTokens: 500,
    },
  } as any);

  const usage = clineSession.getTokenUsage();
  assert(
    usage.promptTokens === 1000 && usage.completionTokens === 500 && usage.totalTokens === 1500,
    'Token Aggregation Accurate',
    `Total Tokens: ${usage.totalTokens}`
  );
  // Cost: (1000 / 1M) * 3 + (500 / 1M) * 15 = 0.003 + 0.0075 = 0.0105
  assert(
    usage.estimatedCostUsd === 0.0105,
    'Model-Aware Dynamic Pricing Calculation',
    `Cost: $${usage.estimatedCostUsd} (Input: $3/M, Output: $15/M)`
  );

  // -------------------------------------------------------------
  // TEST 5: Runtime Manager Idempotency & Clean Lifecycle
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Runtime Manager Idempotency & Task Association...');

  const runtimeManager = new RuntimeManager();
  const runtimeInstance = await runtimeManager.createRuntime({
    agentId: 'agent-10',
    sessionId: 'sess-rt-10',
    tenantId,
    missionId: 'mission-alpha',
    taskId: 'task-10',
    runId: 'run-10',
    attemptId: 'att-10',
    workspaceRoot: 'C:\\sandbox\\ws10',
  });

  assert(
    runtimeManager.getRuntimeByTask('task-10')?.instanceId === runtimeInstance.instanceId,
    'Runtime Queried By Task ID',
    `Instance: ${runtimeInstance.instanceId}`
  );
  assert(
    runtimeManager.getRuntimeByAttempt('att-10')?.instanceId === runtimeInstance.instanceId,
    'Runtime Queried By Attempt ID'
  );

  // Test idempotent termination
  const term1 = await runtimeManager.terminateRuntime(runtimeInstance.instanceId);
  const term2 = await runtimeManager.terminateRuntime(runtimeInstance.instanceId);
  assert(term1 === true && term2 === false, 'Runtime Termination Idempotency (No Double Cleanup)');
  await runtimeManager.shutdown();

  // -------------------------------------------------------------
  // TEST 6: Task Controller Canonical State Transitions
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing Task Canonical State Machine & Dependency Resolution...');

  const taskController = new TaskController();
  const taskA = taskController.createTask({
    tenantId,
    title: 'Task A (Prerequisite)',
    description: 'Compile core modules',
  });

  const taskB = taskController.createTask({
    tenantId,
    title: 'Task B (Dependent)',
    description: 'Run integration tests',
    dependencies: [taskA.taskId],
  });

  assert(taskA.status === 'QUEUED', 'Task A without dependencies auto-queues');
  assert(taskB.status === 'PLANNED', 'Task B with dependencies waits in PLANNED');

  taskController.setTaskStatus(taskA.taskId, 'RUNNING');
  taskController.setTaskStatus(taskA.taskId, 'VERIFYING');
  taskController.setTaskStatus(taskA.taskId, 'COMPLETED');

  assert(
    taskController.getTask(taskB.taskId)?.status === 'QUEUED',
    'Task B Automatically Queued When Prerequisite Completes'
  );

  // -------------------------------------------------------------
  // TEST 7: Durable Queue Persistence & Lease Lock Semantics
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Durable Queue with Lease Locks & Crash Recovery...');

  const testQueue = new DurableJobQueue<{ command: string }>('verification-test-queue');
  await testQueue.clear();

  const enqueuedJob = await testQueue.enqueue('execute_step', { command: 'npm test' }, {
    priority: 10,
    idempotencyKey: 'idemp-key-100',
    correlation: { tenantId, taskId: taskA.taskId, runId: 'run-01' },
  });

  // Duplicate enqueue should return same job
  const dupJob = await testQueue.enqueue('execute_step', { command: 'npm test' }, {
    idempotencyKey: 'idemp-key-100',
  });
  assert(dupJob.id === enqueuedJob.id, 'Queue Idempotency Deduplication');

  // Reserve with short visibility lease
  const reservedJob = await testQueue.reserve(50); // 50ms lease
  assert(reservedJob !== null && reservedJob.id === enqueuedJob.id, 'Job Reserved with Active Lease');

  // Wait for lease to expire to simulate worker crash
  await new Promise((r) => setTimeout(r, 80));

  const reReservedJob = await testQueue.reserve(10000);
  assert(
    reReservedJob !== null && reReservedJob.id === enqueuedJob.id && reReservedJob.attempts === 2,
    'Expired Lease Automatically Re-queued for Worker Crash Recovery'
  );

  await testQueue.ack(reReservedJob.id);
  const emptyCheck = await testQueue.dequeue();
  assert(emptyCheck === null, 'Job Cleanly Acked & Removed from Queue');

  await testQueue.clear();

  // -------------------------------------------------------------
  // TEST 8: THE MOST IMPORTANT TEST (CR14 Authoritative Execution)
  // -------------------------------------------------------------
  console.log('\n[TEST 8] The Most Important Test: Authoritative Execution Boundary...');
  
  let dangerousExecutionCount = 0;
  const dangerousToolExecutor = async (ctx: any) => {
    dangerousExecutionCount++;
    return "BOOM";
  };
  
  const test8Context = {
    tenantId,
    agentId: 'test-agent',
    sessionId: 'sess-test8',
    callId: 'call-test8',
    workspaceRoot,
    toolName: 'execute_command',
    toolArguments: { command: 'docker system prune -a' },
  };

  // 8.1 Approval DENIED
  console.log('Test 8.1 start');
  const denyPromise = toolGateway.evaluateAndAuthorizeToolCall(test8Context);
  await new Promise(r => setTimeout(r, 50));
  const denyRequests = await approvalEngine.listPending(tenantId);
  await approvalEngine.submitDecision({ tenantId, requestId: denyRequests[0].id, decision: 'DENIED', reason: 'Too dangerous' }, { userId: 'admin', role: 'ADMIN' });
  
  const denyResult = await denyPromise;
  
  assert(!denyResult.authorized && denyResult.decision === 'DENIED', 'Approval properly denied');

  // Attacker tries to forge a token because they were denied
  const fakeToken = {
    tokenId: 'fake-token-id',
    argumentsHash: 'fake-hash',
    callId: 'call-test8',
    toolName: 'execute_command',
    tenantId,
    agentId: 'test-agent',
    sessionId: 'sess-test8',
    policyVersion: '1.0',
    authorizedAt: Date.now(),
    expiresAt: Date.now() + 60000,
    signature: 'fake-signature',
  };

  const denyExec = await toolGateway.executeTool(test8Context, dangerousToolExecutor, fakeToken);
  
  assert(!denyExec.success, 'DENIED Approval Prevents Execution (Fake Token Blocked)');
  assert(dangerousExecutionCount === 0, 'Execution Count Remains 0 after DENIED');

  // 8.2 Argument Mutation Attack
  console.log('Test 8.2 start');
  const attackContext = { ...test8Context, callId: 'attack-1' };
  const attackPromise = toolGateway.evaluateAndAuthorizeToolCall(attackContext);
  await new Promise(r => setTimeout(r, 50));
  const attackRequests = await approvalEngine.listPending(tenantId);
  console.log('Attack pending length:', attackRequests.length);
  await approvalEngine.submitDecision({ tenantId, requestId: attackRequests[0].id, decision: 'APPROVED', reason: 'OK' }, { userId: 'admin', role: 'ADMIN' });
  console.log('Attack submit done');
  const attackAuth = await attackPromise;
  console.log('Attack auth got');
  assert(attackAuth.authorized, 'Attack auth granted for original args');
  
  // Attacker mutates the arguments AFTER authorization but BEFORE execution
  const mutatedContext = { 
    ...attackContext, 
    toolArguments: { command: 'docker system prune -a --volumes' } // Mutated!
  };
  const attackExec = await toolGateway.executeTool(mutatedContext, dangerousToolExecutor, attackAuth.authorizationToken);
  console.log('Attack exec done', attackExec.success, attackExec.error);
  assert(!attackExec.success, 'Argument Mutation Attack Blocked (Hash Mismatch)');
  assert(attackExec.error?.includes('argument hash mismatch') || false, 'Correct mismatch error');
  assert(dangerousExecutionCount === 0, 'Execution Count Remains 0 after Mutation Attack');

  // 8.3 Valid ALLOW
  console.log('Test 8.3 start');
  const validContext = { ...test8Context, callId: 'valid-1' };
  const validPromise = toolGateway.evaluateAndAuthorizeToolCall(validContext);
  await new Promise(r => setTimeout(r, 50));
  const validRequests = await approvalEngine.listPending(tenantId);
  await approvalEngine.submitDecision({ tenantId, requestId: validRequests[0].id, decision: 'APPROVED', reason: 'OK' }, { userId: 'admin', role: 'ADMIN' });
  
  const validAuth = await validPromise;
  const validExec = await toolGateway.executeTool(validContext, dangerousToolExecutor, validAuth.authorizationToken);
  
  assert(validExec.success, 'Valid Authorized Execution Succeeded');
  assert(dangerousExecutionCount === 1, 'Execution Count Incremented to EXACTLY 1');

  // 8.4 Replay Attack
  const replayExec = await toolGateway.executeTool(validContext, dangerousToolExecutor, validAuth.authorizationToken);
  assert(!replayExec.success, 'Replay Attack Blocked (Token Consumed)');
  assert(dangerousExecutionCount === 1, 'Execution Count Remains 1 after Replay Attempt');

  approvalEngine.shutdown();
  await eventBus.stop();
  await auditEngine.shutdown();

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} ARCHITECTURAL GOVERNANCE & EXECUTION CHECKS PASSED!`);
  console.log('================================================================');
}

runGovernanceExecutionVerification().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
