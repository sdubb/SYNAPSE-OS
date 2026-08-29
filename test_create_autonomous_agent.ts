async function main() {
  const res = await fetch('http://localhost:3000/api/v1/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: JSON.stringify({
      name: 'Lead Multi-Agent Orchestrator',
      role: 'Autonomous Systems Architect',
      description: 'Decomposes complex enterprise goals, spawns sub-agents, and verifies 24/7.',
      model: { provider: 'openrouter', modelId: 'nvidia/nemotron-3.5-lightning:free', temperature: 0.2 },
      systemPrompt: 'You are the Lead Multi-Agent Orchestrator.',
      capabilities: ['read_file', 'write_to_file', 'run_commands', 'spawn_agent'],
      metadata: {
        canSpawnSubagents: true,
        maxSubagents: 4,
        autoDecomposeTasks: true,
        continuous24x7: true,
        selectedMcps: ['postgres-mcp', 'github-mcp'],
        rules: ['Enforce tenant isolation', 'Run tests before completion'],
        dailyBudgetUsd: 50.0
      }
    })
  });
  console.log('Created Agent Status:', res.status);
  const data = await res.json();
  console.log('Response Body:', JSON.stringify(data, null, 2));
  process.exit(0);
}
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
