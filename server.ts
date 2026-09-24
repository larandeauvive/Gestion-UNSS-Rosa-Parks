import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getAllStudents,
  getPublicStudentsDirectory,
  insertStudent,
  updateStudentById,
  deleteStudentById,
  deleteMultipleStudentsByIds,
  updateMultipleStudentsByIds,
  batchUpsertStudents,
  getTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  getSessions,
  getSessionById,
  createSession,
  updateSessionById,
  deleteSessionById,
  getConvocations,
  createConvocation,
  updateConvocationById,
  deleteConvocationById,
  getEveningSlots,
  saveEveningSlot,
  deleteEveningSlotById,
  getStaffMembers,
  saveStaffMember,
  deleteStaffMemberById,
  getStaffAttendance,
  saveStaffAttendance,
  deleteStaffAttendanceById,
  getSetting,
  saveSetting,
  deleteSetting,
  resetDatabase,
  getFullDatabaseBackup,
  restoreDatabaseBackup
} from './src/db/queries.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: 'supabase',
      supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://jgzcznwurnqefcseougm.supabase.co',
      region: 'EU'
    });
  });

  // --------------------------------------------------------------------------
  // SUPABASE MIGRATION & BACKUP ENDPOINTS
  // --------------------------------------------------------------------------
  app.get('/api/migration/supabase-sql', (req, res) => {
    const sqlPath = path.resolve(process.cwd(), 'supabase-import-all.sql');
    if (fs.existsSync(sqlPath)) {
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', 'attachment; filename="supabase-import-all.sql"');
      return res.sendFile(sqlPath);
    }
    res.status(404).json({ error: 'Fichier SQL introuvable.' });
  });

  app.get('/api/migration/data-json', (req, res) => {
    const jsonPath = path.resolve(process.cwd(), 'firestore-data-backup.json');
    if (fs.existsSync(jsonPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="firestore-data-backup.json"');
      return res.sendFile(jsonPath);
    }
    res.status(404).json({ error: 'Fichier JSON introuvable.' });
  });

  app.post('/api/migration/sync-supabase', async (req, res) => {
    try {
      const jsonPath = path.resolve(process.cwd(), 'firestore-data-backup.json');
      if (!fs.existsSync(jsonPath)) {
        return res.status(400).json({ error: 'Données sauvegardées introuvables.' });
      }
      const backup = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL || 'https://jgzcznwurnqefcseougm.supabase.co',
        process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AlAV1AxacxXkLL8n7Su02g_0idiSK_L'
      );

      // Tester l'accès à la table
      const { error: testErr } = await supabase.from('students').select('count', { count: 'exact', head: true });
      if (testErr) {
        return res.status(400).json({
          success: false,
          error: `Table non trouvée dans Supabase (${testErr.message}). Veuillez exécuter le fichier supabase-import-all.sql dans le SQL Editor de Supabase pour créer les tables et importer les données en 1 clic.`,
          requiresSqlRun: true
        });
      }

      // Upsert students
      let insertedCount = 0;
      const CHUNK = 50;
      for (let i = 0; i < backup.students.length; i += CHUNK) {
        const chunk = backup.students.slice(i, i + CHUNK).map((s: any) => ({
          id: s.id,
          last_name: s.lastName || s.last_name || '',
          first_name: s.firstName || s.first_name || '',
          class_group: s.classGroup || s.class_group || '',
          gender: s.gender || 'M',
          school_year: s.schoolYear || s.school_year || '2025-2026',
          license_number: s.licenseNumber || s.license_number || '',
          paid: s.paid || 'NON',
          amount: s.amount || '',
          payment_method: s.paymentMethod || s.payment_method || '',
          check_number: s.checkNumber || s.check_number || null,
          parental_auth: s.parentalAuth || s.parental_auth || 'NON',
          image_rights: s.imageRights || s.image_rights || 'NON',
          swimming_certificate: s.swimmingCertificate || s.swimming_certificate || 'NON',
          tshirt: s.tshirt || 'NON',
          size: s.size || '',
          birth_date: s.birthDate || s.birth_date || null,
          opuss_checked: Boolean(s.opussChecked ?? s.opuss_checked),
          is_adult: Boolean(s.isAdult ?? s.is_adult),
          created_at: s.createdAt || s.created_at || new Date().toISOString(),
          updated_at: s.updatedAt || s.updated_at || new Date().toISOString()
        }));
        const { error: insErr } = await supabase.from('students').upsert(chunk);
        if (!insErr) insertedCount += chunk.length;
      }

      res.json({
        success: true,
        message: `${insertedCount} élèves synchronisés avec Supabase.`,
        studentsCount: insertedCount
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // AUTH & LOGIN ENDPOINT
  // --------------------------------------------------------------------------
  app.post('/api/auth/login', (req, res) => {
    const { id, password } = req.body;
    if (id === 'AS Rosa Parks' && password === 'Rostrenn2026-2027') {
      return res.json({ success: true, token: 'admin-secret-passkey' });
    }
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
  });

  // --------------------------------------------------------------------------
  // SETTINGS
  // --------------------------------------------------------------------------
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const data = await getSetting(req.params.key, null);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings/:key', async (req, res) => {
    try {
      await saveSetting(req.params.key, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/settings/:key', async (req, res) => {
    try {
      await deleteSetting(req.params.key);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // STUDENTS
  // --------------------------------------------------------------------------
  app.get('/api/students', async (req, res) => {
    try {
      const year = req.query.schoolYear as string | undefined;
      const list = await getAllStudents(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/public-directory', async (req, res) => {
    try {
      const year = (req.query.schoolYear as string) || '';
      const list = await getPublicStudentsDirectory(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/students', async (req, res) => {
    try {
      const newId = await insertStudent(req.body);
      res.json({ id: newId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/students/:id', async (req, res) => {
    try {
      await updateStudentById(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      await deleteStudentById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/students/batch-delete', async (req, res) => {
    try {
      const { ids } = req.body;
      await deleteMultipleStudentsByIds(ids);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/students/batch-update', async (req, res) => {
    try {
      const { ids, data } = req.body;
      await updateMultipleStudentsByIds(ids, data);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/students/batch-upsert', async (req, res) => {
    try {
      const { students, schoolYear } = req.body;
      const count = await batchUpsertStudents(students, schoolYear || '2025-2026');
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // TEACHERS
  // --------------------------------------------------------------------------
  app.get('/api/teachers', async (req, res) => {
    try {
      const list = await getTeachers();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/teachers', async (req, res) => {
    try {
      const id = await addTeacher(req.body.name);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/teachers/:id', async (req, res) => {
    try {
      await updateTeacher(req.params.id, req.body.name);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    try {
      await deleteTeacher(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // SESSIONS
  // --------------------------------------------------------------------------
  app.get('/api/sessions', async (req, res) => {
    try {
      const year = req.query.schoolYear as string | undefined;
      const list = await getSessions(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const item = await getSessionById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Séance non trouvée' });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const id = await createSession(req.body);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/sessions/:id', async (req, res) => {
    try {
      await updateSessionById(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      await deleteSessionById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public/self-enrollment endpoint
  app.post('/api/sessions/:id/enroll', async (req, res) => {
    try {
      const { studentId } = req.body;
      const session = await getSessionById(req.params.id);
      if (!session) return res.status(404).json({ error: 'Séance non trouvée' });

      const enrolled = new Set(session.enrolledStudentIds || []);
      enrolled.add(studentId);
      await updateSessionById(req.params.id, { enrolledStudentIds: Array.from(enrolled) });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public/team enrollment endpoint
  app.post('/api/sessions/:id/enroll-team', async (req, res) => {
    try {
      const { team } = req.body;
      const session = await getSessionById(req.params.id);
      if (!session) return res.status(404).json({ error: 'Séance non trouvée' });

      const enrolled = new Set(session.enrolledStudentIds || []);
      (team.studentIds || []).forEach((id: string) => enrolled.add(id));

      const teams = [...(session.teams || []), team];
      await updateSessionById(req.params.id, { 
        enrolledStudentIds: Array.from(enrolled),
        teams
      });
      res.json({ success: true, team });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CONVOCATIONS
  // --------------------------------------------------------------------------
  app.get('/api/convocations', async (req, res) => {
    try {
      const year = req.query.schoolYear as string | undefined;
      const list = await getConvocations(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/convocations', async (req, res) => {
    try {
      const id = await createConvocation(req.body);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/convocations/:id', async (req, res) => {
    try {
      await updateConvocationById(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/convocations/:id', async (req, res) => {
    try {
      await deleteConvocationById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // STAFF & EVENING SLOTS
  // --------------------------------------------------------------------------
  app.get('/api/evening-slots', async (req, res) => {
    try {
      const year = req.query.schoolYear as string | undefined;
      const list = await getEveningSlots(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/evening-slots', async (req, res) => {
    try {
      const id = await saveEveningSlot(req.body);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/evening-slots/:id', async (req, res) => {
    try {
      await deleteEveningSlotById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/staff-members', async (req, res) => {
    try {
      const year = req.query.schoolYear as string | undefined;
      const list = await getStaffMembers(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/staff-members', async (req, res) => {
    try {
      const id = await saveStaffMember(req.body);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/staff-members/:id', async (req, res) => {
    try {
      await deleteStaffMemberById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/staff-attendance', async (req, res) => {
    try {
      const year = req.query.schoolYear as string | undefined;
      const list = await getStaffAttendance(year);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/staff-attendance', async (req, res) => {
    try {
      const id = await saveStaffAttendance(req.body);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/staff-attendance/:id', async (req, res) => {
    try {
      await deleteStaffAttendanceById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // BACKUP & RESET
  // --------------------------------------------------------------------------
  app.get('/api/backup', async (req, res) => {
    try {
      const data = await getFullDatabaseBackup();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/restore', async (req, res) => {
    try {
      await restoreDatabaseBackup(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/reset', async (req, res) => {
    try {
      const { type } = req.body;
      await resetDatabase(type || 'calendar');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // VITE / STATIC SERVING
  // --------------------------------------------------------------------------
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
