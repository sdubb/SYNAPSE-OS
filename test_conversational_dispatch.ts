async function main() {
  const sessionRes = await fetch('http://localhost:3000/api/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: JSON.stringify({
      title: 'Conversational Dispatch Test',
      agentId: '1946a913-bf63-4713-95f8-4c180ca97bec',
      workspaceId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    })
  });
  const session = await sessionRes.json();
  console.log('Session Created Successfully:', session.id);

  const promptRes = await fetch(`http://localhost:3000/api/v1/sessions/${session.id}/interventions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: JSON.stringify({
      instruction: 'Decompose goal: Audit payment auth and spawn verification subagents.'
    })
  });
  console.log('Intervention Dispatched Status:', promptRes.status);
  console.log('Intervention Response:', await promptRes.json());
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
