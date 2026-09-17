import { mutateDatabase, initializeDatabaseIfNeeded } from '../../server-utils/webdav';

let dbInitialized = false;
const ensureDb = async () => {
    if (!dbInitialized) {
        await initializeDatabaseIfNeeded();
        dbInitialized = true;
    }
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await ensureDb();
    const { action, operations } = req.body;
    
    let opsToRun = [];
    if (action === 'batch' && Array.isArray(operations)) {
      opsToRun = operations;
    } else {
      opsToRun = [req.body];
    }
    const newData = await mutateDatabase(opsToRun);
    res.status(200).json({ success: true, data: newData });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mutate database', message: e.message });
  }
}
