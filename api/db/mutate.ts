import { mutateDatabase, initializeDatabaseIfNeeded } from '../../server/webdav';

let dbInitialized = false;

const ensureDb = async () => {
    if (!dbInitialized) {
        await initializeDatabaseIfNeeded();
        dbInitialized = true;
    }
};

export default async function handler(req: any, res: any) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  try {
    await ensureDb();
    
    const { action, operations } = req.body || {};
    let opsToRun = [];
    if (action === 'batch' && Array.isArray(operations)) {
      opsToRun = operations;
    } else if (req.body && Object.keys(req.body).length > 0) {
      opsToRun = [req.body];
    }
    
    const newData = await mutateDatabase(opsToRun);
    res.status(200).json({ success: true, data: newData });
  } catch (e: any) {
    console.log("Error processing POST:", e.message);
    res.status(500).json({ error: 'Failed to process POST', message: e.message });
  }
}
