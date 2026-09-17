export async function fetchDb() {
  try {
    const res = await fetch('/api/db');
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server is restarting or returned invalid format.");
    }
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch DB');
    }
    
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message === 'Failed to fetch' ? 'Server is unreachable' : err.message);
  }
}

export async function mutateDb(operation: any) {
  try {
    const res = await fetch('/api/db/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation)
    });
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server is restarting or returned invalid format.");
    }
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Mutation failed');
    }
    
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message === 'Failed to fetch' ? 'Server is unreachable' : err.message);
  }
}
