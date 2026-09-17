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

app.get('*', async (req, res) => {
  try {
    await ensureDb();
    const data = await getDatabase();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch database', message: e.message });
  }
});

app.post('*', async (req, res) => {
  try {
    await ensureDb();
    
    // Check if it's a restore request (has 'data' property, no 'operations')
    if (req.body && req.body.data && !req.body.operations && req.body.action !== 'batch') {
      const { data } = req.body;
      const newData = await mutateDatabase([{ action: 'overwrite', payload: data }]);
      return res.json({ success: true, data: newData });
    }
    
    // Otherwise it's a mutate request
    const { action, operations } = req.body || {};
    let opsToRun = [];
    if (action === 'batch' && Array.isArray(operations)) {
      opsToRun = operations;
    } else if (req.body && Object.keys(req.body).length > 0) {
      opsToRun = [req.body];
    }
    const newData = await mutateDatabase(opsToRun);
    res.json({ success: true, data: newData });
  } catch (e: any) {
    console.log("Error processing POST:", e.message);
    res.status(500).json({ error: 'Failed to process POST', message: e.message });
  }
});

export default app;
