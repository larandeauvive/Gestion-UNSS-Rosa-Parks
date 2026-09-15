export async function fetchDb() {
  const res = await fetch('/api/db');
  if (!res.ok) throw new Error('Failed to fetch DB');
  return await res.json();
}

export async function mutateDb(operation: any) {
  const res = await fetch('/api/db/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation)
  });
  if (!res.ok) throw new Error('Mutation failed');
  return await res.json();
}
