export async function fetchDb() {
  try {
    const res = await fetch('/api/db');
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text().catch(() => "");
      console.error("Invalid response format. Status:", res.status, "Text snippet:", text.substring(0, 100));
      if (res.status === 404) throw new Error("Erreur de configuration (404) : La route /api/db est introuvable. Vérifiez que l'application est bien déployée (ex: Vercel) et que le dossier 'api' est présent.");
      if (res.status >= 500) throw new Error(`Erreur serveur (${res.status}) : Le backend n'arrive pas à démarrer ou à contacter Nextcloud.`);
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
      if (res.status === 404) throw new Error("Erreur de configuration (404) : La route API est introuvable.");
      if (res.status >= 500) throw new Error(`Erreur serveur (${res.status}) lors de l'enregistrement.`);
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
