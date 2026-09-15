// Mock Firebase Firestore API using our WebDAV backend

let memoryDb: any = {
  students: [],
  sessions: [],
  convocations: [],
  teachers: []
};

let listeners: Function[] = [];

async function pollDb() {
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      memoryDb = await res.json();
      listeners.forEach(l => l());
    }
  } catch (e) {
    console.error("Polling error:", e);
  }
}

// Poll every 5 seconds
if (typeof window !== 'undefined') {
  setInterval(pollDb, 5000);
  pollDb(); // initial fetch
}

export const db = "MOCK_DB";

export function collection(db: any, path: string) {
  return { path };
}


export function doc(dbOrCol: any, pathOrId?: string, id?: string) {
  if (dbOrCol && dbOrCol.path) { // it's a collection
    return { path: dbOrCol.path, id: pathOrId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) };
  }
  return { path: pathOrId, id };
}


export function query(col: any, ...constraints: any[]) {
  return { ...col, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction?: string) {
  return { type: 'orderBy', field, direction };
}

export function onSnapshot(q: any, callback: Function, errorCb?: Function) {
  const handler = () => {
    let data = memoryDb[q.path] || [];
    
    if (q.constraints) {
      q.constraints.forEach((c: any) => {
        if (c.type === 'where') {
          data = data.filter((item: any) => {
            if (c.op === '==') return item[c.field] === c.value;
            return true;
          });
        } else if (c.type === 'orderBy') {
           // simple mock
           data = [...data].sort((a: any, b: any) => a[c.field] > b[c.field] ? 1 : -1);
        }
      });
    }

    callback({
      forEach: (cb: Function) => {
        data.forEach((item: any) => cb({ id: item.id, data: () => item, exists: () => true }));
      },
      docs: data.map((item: any) => ({ id: item.id, data: () => item, exists: () => true }))
    });
  };

  listeners.push(handler);
  handler(); // Call immediately

  return () => {
    listeners = listeners.filter(l => l !== handler);
  };
}

async function mutate(operation: any) {
  const res = await fetch('/api/db/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation)
  });
  if (res.ok) {
    const json = await res.json();
    memoryDb = json.data;
    listeners.forEach(l => l());
  }
}

export async function addDoc(col: any, data: any) {
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  await mutate({ collection: col.path, action: 'add', payload: { ...data, id } });
  return { id };
}

export async function updateDoc(d: any, data: any) {
  await mutate({ collection: d.path, action: 'update', id: d.id, payload: data });
}

export async function setDoc(d: any, data: any) {
  await mutate({ collection: d.path, action: 'update', id: d.id, payload: data });
}

export async function deleteDoc(d: any) {
  await mutate({ collection: d.path, action: 'delete', id: d.id });
}

export async function getDoc(d: any) {
  const data = (memoryDb[d.path] || []).find((i: any) => i.id === d.id);
  return {
    id: d.id,
    exists: () => !!data,
    data: () => data
  };
}

export async function getDocs(q: any) {
  let data = memoryDb[q.path] || [];
  if (q.constraints) {
    q.constraints.forEach((c: any) => {
      if (c.type === 'where') {
        data = data.filter((item: any) => {
          if (c.op === '==') return item[c.field] === c.value;
          return true;
        });
      }
    });
  }
  return {
    forEach: (cb: Function) => {
      data.forEach((item: any) => cb({ id: item.id, data: () => item, exists: () => true }));
    },
    docs: data.map((item: any) => ({ id: item.id, data: () => item, exists: () => true }))
  };
}

export function writeBatch(db?: any) {
  const operations: any[] = [];
  return {
    set: (d: any, data: any) => operations.push({ collection: d.path, action: 'update', id: d.id, payload: data }),
    update: (d: any, data: any) => operations.push({ collection: d.path, action: 'update', id: d.id, payload: data }),
    delete: (d: any) => operations.push({ collection: d.path, action: 'delete', id: d.id }),
    commit: async () => {
      await fetch('/api/db/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', operations })
      });
      await pollDb();
    }
  };
}
