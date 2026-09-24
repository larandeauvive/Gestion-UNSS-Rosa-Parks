-- ==============================================================================
-- SCHÉMA SUPABASE POSTGRESQL (AS ROSA PARKS - GESTION UNSS)
-- À coller et exécuter directement dans l'Éditeur SQL de votre projet Supabase :
-- https://supabase.com/dashboard/project/jgzcznwurnqefcseougm/sql/new
-- ==============================================================================

-- 1. Table des élèves (students)
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

-- 2. Table des enseignants EPS (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- 3. Table des séances d'activités (sessions)
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
  registration_close_date TEXT,
  is_team_registration BOOLEAN DEFAULT FALSE,
  team_size INTEGER,
  teams JSONB DEFAULT '[]'::jsonb
);

-- Migrations douces si la table existe déjà
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_team_registration BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS team_size INTEGER;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS teams JSONB DEFAULT '[]'::jsonb;

-- 4. Table des convocations compétitions (convocations)
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

-- 5. Table des créneaux AS Soir (evening_slots)
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

-- 6. Table des membres personnels (staff_members)
CREATE TABLE IF NOT EXISTS public.staff_members (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  discipline TEXT,
  email TEXT,
  phone TEXT,
  schoolYear TEXT,
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

-- 7. Table des émargements personnels (staff_attendance)
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

-- 8. Table des paramètres d'application (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ACTIVER LES POLITIQUES DE SÉCURITÉ (Row Level Security & Anon Access)
-- Permet la lecture et l'écriture sécurisée avec la clé publishable Supabase
-- ==============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evening_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Politiques ouvertes pour l'application avec la clé anonyme/publishable
CREATE POLICY "Anon access students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access convocations" ON public.convocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access evening_slots" ON public.evening_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access staff_members" ON public.staff_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access staff_attendance" ON public.staff_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
