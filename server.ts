import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDatabase, mutateDatabase, initializeDatabaseIfNeeded } from './server/webdav.js';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  
  // Get entire database
  app.get('/api/db', async (req, res) => {
    try {
      const data = await getDatabase();
      res.json(data);
    } catch (e: any) {
      
      res.status(500).json({ error: 'Failed to fetch database', message: e.message });
    }
  });

  // Mutate database
  // Body format: { collection: 'students', action: 'add', payload: { ... } }
  // or { collection: 'sessions', action: 'update', id: '123', payload: { ... } }
  // or { collection: 'students', action: 'delete', id: '123' }
  // or { action: 'batch', operations: [ { collection, action, id?, payload? } ] }
  app.post('/api/db/mutate', async (req, res) => {
    try {
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

  // Overwrite entire database (for restore)
  app.post('/api/db/restore', async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ error: 'No data provided' });
      
      const newData = await mutateDatabase([{ action: 'overwrite', payload: data }]);
      res.json({ success: true, data: newData });
    } catch (e: any) {
      console.log("Error restoring db:", e.message);
      res.status(500).json({ error: 'Failed to restore database', message: e.message });
    }
  });

  // Initialize DB if it doesn't exist on WebDAV
  await initializeDatabaseIfNeeded();

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
