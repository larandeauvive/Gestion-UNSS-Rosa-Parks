import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    const escapedElements = val.map(item => `"${String(item).replace(/"/g, '""')}"`);
    return `'{${escapedElements.join(',')}}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportAll() {
  console.log('Extraction des données Firestore...');

  // 1. Students
  const studentsSnap = await getDocs(collection(db, 'students'));
  const students: any[] = [];
  studentsSnap.forEach(d => {
    students.push({ id: d.id, ...d.data() });
  });
  console.log(`Élèves récupérés : ${students.length}`);

  // 2. Sessions
  const sessionsSnap = await getDocs(collection(db, 'sessions'));
  const sessions: any[] = [];
  sessionsSnap.forEach(d => {
    sessions.push({ id: d.id, ...d.data() });
  });
  console.log(`Séances récupérées : ${sessions.length}`);

  // 3. Teachers
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  const teachers: any[] = [];
  teachersSnap.forEach(d => {
    teachers.push({ id: d.id, ...d.data() });
  });
  console.log(`Enseignants récupérés : ${teachers.length}`);

  // 4. Convocations
  const convSnap = await getDocs(collection(db, 'convocations'));
  const convocations: any[] = [];
  convSnap.forEach(d => {
    convocations.push({ id: d.id, ...d.data() });
  });

  // Sauvegarde JSON
  const backupData = {
    exportDate: new Date().toISOString(),
    students,
    sessions,
    teachers,
    convocations
  };
  fs.writeFileSync('firestore-data-backup.json', JSON.stringify(backupData, null, 2));
  console.log('Fichier firestore-data-backup.json enregistré avec succès.');

  // Génération du fichier SQL complet
  let sql = `-- ==============================================================================
-- IMPORT COMPLET BASE DE DONNÉES SUPABASE (AS ROSA PARKS - GESTION UNSS)
-- Date d'export : ${new Date().toLocaleString('fr-FR')}
-- Contenu : Schéma complet + ${students.length} Élèves + ${sessions.length} Séances + ${teachers.length} Enseignants
-- Instructions : Copier et coller tout ce fichier dans https://supabase.com/dashboard/project/jgzcznwurnqefcseougm/sql/new et cliquer sur "RUN".
-- ==============================================================================

-- 1. CRÉATION DES TABLES
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  class_group TEXT NOT NULL DEFAULT '',
  gender TEXT DEFAULT 'M',
  school_year TEXT NOT NULL,
  license_number TEXT DEFAULT '',
  paid TEXT DEFAULT 'NON',
  amount TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  check_number TEXT,
  parental_auth TEXT DEFAULT 'NON',
  image_rights TEXT DEFAULT 'NON',
  swimming_certificate TEXT DEFAULT 'NON',
  tshirt TEXT DEFAULT 'NON',
  size TEXT DEFAULT '',
  birth_date TEXT,
  opuss_checked BOOLEAN DEFAULT FALSE,
  is_adult BOOLEAN DEFAULT FALSE,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  teacher_ids TEXT[],
  need_snack BOOLEAN DEFAULT FALSE,
  description TEXT,
  require_license BOOLEAN DEFAULT FALSE,
  school_year TEXT NOT NULL,
  enrolled_student_ids TEXT[],
  present_student_ids TEXT[],
  convocation_id TEXT,
  max_participants INTEGER,
  target_audience TEXT DEFAULT 'students',
  meeting_time TEXT,
  meeting_location TEXT,
  cafeteria_time TEXT,
  return_time TEXT,
  registration_open_date TEXT,
  registration_close_date TEXT
);

CREATE TABLE IF NOT EXISTS public.convocations (
  id TEXT PRIMARY KEY,
  competition_name TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  return_date TEXT NOT NULL,
  guides TEXT DEFAULT '',
  teacher_ids TEXT[],
  need_snack TEXT DEFAULT 'NON',
  need_picnic TEXT DEFAULT 'NON',
  school_year TEXT NOT NULL,
  student_ids TEXT[],
  tshirt_manager_id TEXT,
  snack_manager_ids TEXT[],
  session_id TEXT,
  target_audience TEXT DEFAULT 'students',
  meeting_time TEXT,
  meeting_location TEXT,
  cafeteria_time TEXT,
  return_time TEXT
);

CREATE TABLE IF NOT EXISTS public.evening_slots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  coach_or_supervisor TEXT,
  school_year TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.staff_members (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  discipline TEXT,
  email TEXT,
  phone TEXT,
  school_year TEXT NOT NULL DEFAULT '2025-2026',
  is_license_up_to_date BOOLEAN DEFAULT FALSE,
  license_number TEXT,
  paid BOOLEAN DEFAULT FALSE,
  payment_amount INTEGER,
  payment_method TEXT,
  medical_cert_or_quiz BOOLEAN DEFAULT FALSE,
  parental_or_personal_auth BOOLEAN DEFAULT FALSE,
  evening_slot_ids TEXT[],
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  slot_name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  present_staff_ids TEXT[],
  excused_staff_ids TEXT[],
  notes TEXT,
  recorded_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SÉCURITÉ & PERMISSIONS ANONYMES POUR L'APPLICATION WEB
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evening_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon access students" ON public.students;
CREATE POLICY "Anon access students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access teachers" ON public.teachers;
CREATE POLICY "Anon access teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access sessions" ON public.sessions;
CREATE POLICY "Anon access sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access convocations" ON public.convocations;
CREATE POLICY "Anon access convocations" ON public.convocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access evening_slots" ON public.evening_slots;
CREATE POLICY "Anon access evening_slots" ON public.evening_slots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access staff_members" ON public.staff_members;
CREATE POLICY "Anon access staff_members" ON public.staff_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access staff_attendance" ON public.staff_attendance;
CREATE POLICY "Anon access staff_attendance" ON public.staff_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon access app_settings" ON public.app_settings;
CREATE POLICY "Anon access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Permissions d'accès pour les rôles anon et authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. INSERTION DES ENSEIGNANTS (${teachers.length})
`;

  for (const t of teachers) {
    sql += `INSERT INTO public.teachers (id, name) VALUES (${escapeSql(t.id)}, ${escapeSql(t.name)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
  }

  sql += `\n-- 4. INSERTION DES SÉANCES DU CALENDRIER (${sessions.length})\n`;
  for (const s of sessions) {
    sql += `INSERT INTO public.sessions (
  id, name, date, time, end_time, location, teacher_ids, need_snack, description,
  require_license, school_year, enrolled_student_ids, present_student_ids,
  convocation_id, max_participants, target_audience, meeting_time, meeting_location,
  cafeteria_time, return_time, registration_open_date, registration_close_date
) VALUES (
  ${escapeSql(s.id)},
  ${escapeSql(s.name)},
  ${escapeSql(s.date)},
  ${escapeSql(s.time)},
  ${escapeSql(s.endTime || s.end_time)},
  ${escapeSql(s.location)},
  ${escapeSql(s.teacherIds || s.teacher_ids || [])},
  ${escapeSql(s.needSnack ?? s.need_snack ?? false)},
  ${escapeSql(s.description)},
  ${escapeSql(s.requireLicense ?? s.require_license ?? false)},
  ${escapeSql(s.schoolYear || s.school_year || '2025-2026')},
  ${escapeSql(s.enrolledStudentIds || s.enrolled_student_ids || [])},
  ${escapeSql(s.presentStudentIds || s.present_student_ids || [])},
  ${escapeSql(s.convocationId || s.convocation_id)},
  ${escapeSql(s.maxParticipants || s.max_participants)},
  ${escapeSql(s.targetAudience || s.target_audience || 'students')},
  ${escapeSql(s.meetingTime || s.meeting_time)},
  ${escapeSql(s.meetingLocation || s.meeting_location)},
  ${escapeSql(s.cafeteriaTime || s.cafeteria_time)},
  ${escapeSql(s.returnTime || s.return_time)},
  ${escapeSql(s.registrationOpenDate || s.registration_open_date)},
  ${escapeSql(s.registrationCloseDate || s.registration_close_date)}
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  time = EXCLUDED.time,
  location = EXCLUDED.location,
  teacher_ids = EXCLUDED.teacher_ids,
  enrolled_student_ids = EXCLUDED.enrolled_student_ids,
  present_student_ids = EXCLUDED.present_student_ids;\n`;
  }

  sql += `\n-- 5. INSERTION DES ÉLÈVES & INSCRIPTIONS (${students.length})\n`;
  for (const st of students) {
    sql += `INSERT INTO public.students (
  id, last_name, first_name, class_group, gender, school_year,
  license_number, paid, amount, payment_method, check_number,
  parental_auth, image_rights, swimming_certificate, tshirt, size,
  birth_date, opuss_checked, is_adult, created_at, updated_at
) VALUES (
  ${escapeSql(st.id)},
  ${escapeSql(st.lastName || st.last_name || '')},
  ${escapeSql(st.firstName || st.first_name || '')},
  ${escapeSql(st.classGroup || st.class_group || '')},
  ${escapeSql(st.gender || 'M')},
  ${escapeSql(st.schoolYear || st.school_year || '2025-2026')},
  ${escapeSql(st.licenseNumber || st.license_number || '')},
  ${escapeSql(st.paid || 'NON')},
  ${escapeSql(st.amount || '')},
  ${escapeSql(st.paymentMethod || st.payment_method || '')},
  ${escapeSql(st.checkNumber || st.check_number)},
  ${escapeSql(st.parentalAuth || st.parental_auth || 'NON')},
  ${escapeSql(st.imageRights || st.image_rights || 'NON')},
  ${escapeSql(st.swimmingCertificate || st.swimming_certificate || 'NON')},
  ${escapeSql(st.tshirt || 'NON')},
  ${escapeSql(st.size || '')},
  ${escapeSql(st.birthDate || st.birth_date)},
  ${escapeSql(Boolean(st.opussChecked ?? st.opuss_checked))},
  ${escapeSql(Boolean(st.isAdult ?? st.is_adult))},
  ${escapeSql(st.createdAt || st.created_at || new Date().toISOString())},
  ${escapeSql(st.updatedAt || st.updated_at || new Date().toISOString())}
) ON CONFLICT (id) DO UPDATE SET
  last_name = EXCLUDED.last_name,
  first_name = EXCLUDED.first_name,
  class_group = EXCLUDED.class_group,
  license_number = EXCLUDED.license_number,
  paid = EXCLUDED.paid,
  amount = EXCLUDED.amount,
  payment_method = EXCLUDED.payment_method,
  opuss_checked = EXCLUDED.opuss_checked,
  updated_at = EXCLUDED.updated_at;\n`;
  }

  sql += `\n-- NOTIFIER POSTGREST DE RECHARGER LE SCHÉMA\nNOTIFY pgrst, 'reload schema';\n`;

  fs.writeFileSync('supabase-import-all.sql', sql);
  console.log('Fichier supabase-import-all.sql généré avec succès !');
  process.exit(0);
}

exportAll().catch(e => {
  console.error('Erreur export:', e);
  process.exit(1);
});
