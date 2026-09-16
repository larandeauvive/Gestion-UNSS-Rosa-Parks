import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

let URL = process.env.WEBDAV_URL || '';
if (URL && !URL.endsWith('.json')) {
  if (!URL.endsWith('/')) {
    URL += '/';
  }
  URL += 'database.json';
}

const USERNAME = process.env.WEBDAV_USERNAME!;
const PASSWORD = process.env.WEBDAV_PASSWORD!;

const auth = {
  username: USERNAME,
  password: PASSWORD
};

let cachedETag: string | null = null;
let cachedData: any = null;
let isMutating = false;

// Simple mutex queue
const mutateQueue: Array<() => Promise<void>> = [];

async function processQueue() {
  if (isMutating) return;
  isMutating = true;
  
  while (mutateQueue.length > 0) {
    const task = mutateQueue.shift();
    if (task) {
      try {
        await task();
      } catch (e) {
        console.log("Queue task failed:", e);
      }
    }
  }
  
  isMutating = false;
}

export async function initializeDatabaseIfNeeded() {
  try {
    await axios.get(URL, { auth });
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      console.log("Database not found on WebDAV, creating empty initial state...");
      const emptyState = { students: [], sessions: [], convocations: [], teachers: [] };
      await axios.put(URL, emptyState, { auth });
    }
  }
}

export async function getDatabase(forceRefresh = false) {
  try {
    const headers: any = {};
    if (cachedETag && !forceRefresh) {
      headers['If-None-Match'] = cachedETag;
    }
    
    const response = await axios.get(URL, { auth, headers, validateStatus: (status) => status === 200 || status === 304 });
    
    if (response.status === 200) {
      if (typeof response.data === 'string') {
        if (response.data.includes('WebDAV interface')) {
          throw new Error("Invalid WebDAV URL: The URL points to a WebDAV directory or interface, not a file. Please ensure your WEBDAV_URL ends with a filename, for example: '/database.json'");
        }
        try {
          cachedData = JSON.parse(response.data);
        } catch {
          throw new Error("Invalid database format: Expected a JSON object but received text from the server.");
        }
      } else {
        cachedData = response.data;
      }
      cachedETag = response.headers['etag'] || null;
    }
    
    return cachedData;
  } catch (e) {
    
    throw e;
  }
}

export function mutateDatabase(operations: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    mutateQueue.push(async () => {
      try {
        let retries = 3;
        while (retries > 0) {
          try {
            // Fetch latest state and ETag
            const db = await getDatabase(true);
            
            // Deep clone before mutating
            const newData = db ? JSON.parse(JSON.stringify(db)) : { students: [], sessions: [], convocations: [], teachers: [] };
            
            for (const op of operations) {
              if (op.action === 'overwrite') {
                Object.assign(newData, op.payload);
                continue;
              }
              
              const col = newData[op.collection];
              if (!col) newData[op.collection] = [];
              
              if (op.action === 'add') {
                const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                newData[op.collection].push({ id: newId, ...op.payload });
              } else if (op.action === 'update') {
                const idx = newData[op.collection].findIndex((i: any) => i.id === op.id);
                if (idx !== -1) {
                  newData[op.collection][idx] = { ...newData[op.collection][idx], ...op.payload };
                } else {
                  newData[op.collection].push({ id: op.id, ...op.payload });
                }
              } else if (op.action === 'delete') {
                newData[op.collection] = newData[op.collection].filter((i: any) => i.id !== op.id);
              }
            }
            
            // Upload with optimistic concurrency
            const headers: any = { 'Content-Type': 'application/json' };
            // Some WebDAV servers (like Nextcloud) have issues with If-Match ETags
            // if (cachedETag) {
            //  headers['If-Match'] = cachedETag;
            // }
            
            const putRes = await axios.put(URL, newData, { auth, headers });
            
            // Update cache
            cachedData = newData;
            cachedETag = putRes.headers['etag'] || null;
            
            resolve(newData);
            return; // Success, exit retry loop
            
          } catch (e: any) {
            if (e.response && e.response.status === 412) {
              // Precondition failed, ETag mismatch, another user updated the file.
              console.log("Collision detected (412). Retrying...", retries);
              retries--;
              if (retries === 0) throw new Error("Max retries reached on 412 Precondition Failed");
            } else {
              throw e;
            }
          }
        }
      } catch (e) {
        reject(e);
      }
    });
    
    processQueue();
  });
}
