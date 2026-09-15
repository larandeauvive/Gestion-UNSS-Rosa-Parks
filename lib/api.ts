export async function fetchDb() {
  const res = await fetch('/api/db');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch DB');
  }
  return await res.json();
}

export async function mutateDb(operation: any) {
  const res = await fetch('/api/db/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Mutation failed');
  }
  return await res.json();
}
