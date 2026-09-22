import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 1. Lire configuration Firebase
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);

// 2. Initialiser client Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jgzcznwurnqefcseougm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AlAV1AxacxXkLL8n7Su02g_0idiSK_L';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('--- Démarrage de la migration Firestore -> Supabase ---');
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Firebase Project: ${firebaseConfig.projectId || 'N/A'}`);

async function migrateCollection(collectionName: string, supabaseTable: string, mapper?: (data: any) => any) {
  try {
    console.log(`\nLecture de la collection Firestore "${collectionName}"...`);
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.log(`Aucun document trouvé dans "${collectionName}".`);
      return;
    }

    const items: any[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const item = mapper ? mapper({ id: docSnap.id, ...data }) : { id: docSnap.id, ...data };
      items.push(item);
    });

    console.log(`Importation de ${items.length} enregistrements vers la table Supabase "${supabaseTable}"...`);
    
    // Insérer / upsert par blocs de 100
    const CHUNK_SIZE = 100;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(supabaseTable).upsert(chunk);
      if (error) {
        console.error(`Erreur lors de l'insertion dans "${supabaseTable}":`, error.message);
      } else {
        console.log(`Lot ${Math.floor(i / CHUNK_SIZE) + 1} inséré avec succès (${chunk.length} lignes).`);
      }
    }
  } catch (err: any) {
    console.warn(`Information lors de la migration de "${collectionName}":`, err.message);
  }
}

async function runMigration() {
  // Migration des élèves (students)
  await migrateCollection('students', 'students', (item) => ({
    id: item.id,
    last_name: item.lastName || item.last_name || '',
    first_name: item.firstName || item.first_name || '',
    class_group: item.classGroup || item.class_group || '',
    gender: item.gender || 'M',
    school_year: item.schoolYear || item.school_year || '2025-2026',
    license_number: item.licenseNumber || item.license_number || '',
    paid: item.paid || 'NON',
    amount: item.amount || '',
    payment_method: item.paymentMethod || item.payment_method || '',
    check_number: item.checkNumber || item.check_number || null,
    parental_auth: item.parentalAuth || item.parental_auth || 'NON',
    image_rights: item.imageRights || item.image_rights || 'NON',
    swimming_certificate: item.swimmingCertificate || item.swimming_certificate || 'NON',
    tshirt: item.tshirt || 'NON',
    size: item.size || '',
    birth_date: item.birthDate || item.birth_date || null,
    opuss_checked: Boolean(item.opussChecked ?? item.opuss_checked),
    is_adult: Boolean(item.isAdult ?? item.is_adult),
    created_at: item.createdAt || item.created_at || new Date().toISOString(),
    updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
  }));

  // Migration des séances d'activités (sessions)
  await migrateCollection('sessions', 'sessions', (item) => ({
    id: item.id,
    name: item.name || '',
    date: item.date || '',
    time: item.time || '',
    end_time: item.endTime || item.end_time || null,
    location: item.location || '',
    teacher_ids: item.teacherIds || item.teacher_ids || [],
    need_snack: Boolean(item.needSnack ?? item.need_snack),
    description: item.description || null,
    require_license: Boolean(item.requireLicense ?? item.require_license),
    school_year: item.schoolYear || item.school_year || '2025-2026',
    enrolled_student_ids: item.enrolledStudentIds || item.enrolled_student_ids || [],
    present_student_ids: item.presentStudentIds || item.present_student_ids || [],
    convocation_id: item.convocationId || item.convocation_id || null,
    max_participants: item.maxParticipants || item.max_participants || null,
    target_audience: item.targetAudience || item.target_audience || 'students',
    meeting_time: item.meetingTime || item.meeting_time || null,
    meeting_location: item.meetingLocation || item.meeting_location || null,
    cafeteria_time: item.cafeteriaTime || item.cafeteria_time || null,
    return_time: item.returnTime || item.return_time || null,
    registration_open_date: item.registrationOpenDate || item.registration_open_date || null,
    registration_close_date: item.registrationCloseDate || item.registration_close_date || null
  }));

  // Migration des enseignants (teachers)
  await migrateCollection('teachers', 'teachers', (item) => ({
    id: item.id,
    name: item.name || ''
  }));

  // Migration des convocations
  await migrateCollection('convocations', 'convocations', (item) => ({
    id: item.id,
    competition_name: item.competitionName || item.competition_name || '',
    departure_date: item.departureDate || item.departure_date || '',
    return_date: item.returnDate || item.return_date || '',
    guides: item.guides || '',
    teacher_ids: item.teacherIds || item.teacher_ids || [],
    need_snack: item.needSnack || item.need_snack || 'NON',
    need_picnic: item.needPicnic || item.need_picnic || 'NON',
    school_year: item.schoolYear || item.school_year || '2025-2026',
    student_ids: item.studentIds || item.student_ids || [],
    tshirt_manager_id: item.tshirtManagerId || item.tshirt_manager_id || null,
    snack_manager_ids: item.snackManagerIds || item.snack_manager_ids || [],
    session_id: item.sessionId || item.session_id || null,
    target_audience: item.targetAudience || item.target_audience || 'students',
    meeting_time: item.meetingTime || item.meeting_time || null,
    meeting_location: item.meetingLocation || item.meeting_location || null,
    cafeteria_time: item.cafeteriaTime || item.cafeteria_time || null,
    return_time: item.returnTime || item.return_time || null
  }));

  // Migration des créneaux AS soir
  await migrateCollection('evening_slots', 'evening_slots', (item) => ({
    id: item.id,
    name: item.name || '',
    day_of_week: item.dayOfWeek || item.day_of_week || '',
    start_time: item.startTime || item.start_time || '',
    end_time: item.endTime || item.end_time || '',
    location: item.location || '',
    description: item.description || null,
    coach_or_supervisor: item.coachOrSupervisor || item.coach_or_supervisor || null,
    school_year: item.schoolYear || item.school_year || '2025-2026',
    active: item.active ?? true
  }));

  // Migration des membres personnels
  await migrateCollection('staff_members', 'staff_members', (item) => ({
    id: item.id,
    first_name: item.firstName || item.first_name || '',
    last_name: item.lastName || item.last_name || '',
    role: item.role || '',
    discipline: item.discipline || null,
    email: item.email || null,
    phone: item.phone || null,
    school_year: item.schoolYear || item.school_year || '2025-2026',
    is_license_up_to_date: Boolean(item.isLicenseUpToDate ?? item.is_license_up_to_date),
    license_number: item.licenseNumber || item.license_number || null,
    paid: Boolean(item.paid),
    payment_amount: item.paymentAmount || item.payment_amount || null,
    payment_method: item.paymentMethod || item.payment_method || null,
    medical_cert_or_quiz: Boolean(item.medicalCertOrQuiz ?? item.medical_cert_or_quiz),
    parental_or_personal_auth: Boolean(item.parentalOrPersonalAuth ?? item.parental_or_personal_auth),
    evening_slot_ids: item.eveningSlotIds || item.evening_slot_ids || [],
    notes: item.notes || null,
    created_at: item.createdAt || item.created_at || new Date().toISOString(),
    updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
  }));

  console.log('\nMigration terminée.');
}

runMigration().catch(err => {
  console.error('Erreur globale de migration:', err);
});
