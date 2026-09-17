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
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });
    
    const newData = await mutateDatabase([{ action: 'overwrite', payload: data }]);
    res.status(200).json({ success: true, data: newData });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to restore database', message: e.message });
  }
}
