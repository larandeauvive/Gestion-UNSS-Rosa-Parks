import express from 'express';
import cors from 'cors';
import { getDatabase, mutateDatabase, initializeDatabaseIfNeeded } from '../server/webdav';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let dbInitialized = false;
const ensureDb = async () => {
    if (!dbInitialized) {
        await initializeDatabaseIfNeeded();
        dbInitialized = true;
    }
};

app.get('/api/db', async (req, res) => {
  try {
    await ensureDb();
    const data = await getDatabase();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch database', message: e.message });
  }
});

app.post('/api/db/mutate', async (req, res) => {
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
    res.json({ success: true, data: newData });
  } catch (e: any) {
    console.log("Error mutating db:", e.message);
    res.status(500).json({ error: 'Failed to mutate database', message: e.message });
  }
});

app.post('/api/db/restore', async (req, res) => {
  try {
    await ensureDb();
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });
    const newData = await mutateDatabase([{ action: 'overwrite', payload: data }]);
    res.json({ success: true, data: newData });
  } catch (e: any) {
    console.log("Error restoring db:", e.message);
    res.status(500).json({ error: 'Failed to restore database', message: e.message });
  }
});

export default app;
