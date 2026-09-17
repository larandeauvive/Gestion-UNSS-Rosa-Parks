import { getDatabase, initializeDatabaseIfNeeded } from '../server-utils/webdav';

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
    const data = await getDatabase();
    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch database', message: e.message });
  }
}
