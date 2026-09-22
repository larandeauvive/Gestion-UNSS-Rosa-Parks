import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

// Élèves (students)
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  classGroup: text('class_group').notNull().default(''),
  gender: text('gender'),
  schoolYear: text('school_year').notNull(),
  licenseNumber: text('license_number').default(''),
  paid: text('paid').default('NON'),
  amount: text('amount').default(''),
  paymentMethod: text('payment_method').default(''),
  checkNumber: text('check_number'),
  parentalAuth: text('parental_auth').default('NON'),
  imageRights: text('image_rights').default('NON'),
  swimmingCertificate: text('swimming_certificate').default('NON'),
  tshirt: text('tshirt').default('NON'),
  size: text('size').default(''),
  birthDate: text('birth_date'),
  opussChecked: boolean('opuss_checked').default(false),
  isAdult: boolean('is_adult').default(false),
  createdAt: text('created_at'),
  updatedAt: text('updated_at')
});

// Enseignants EPS (teachers)
export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  name: text('name').notNull()
});

// Séances (sessions)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  endTime: text('end_time'),
  location: text('location'),
  teacherIds: text('teacher_ids').array(),
  needSnack: boolean('need_snack').default(false),
  description: text('description'),
  requireLicense: boolean('require_license').default(false),
  schoolYear: text('school_year').notNull(),
  enrolledStudentIds: text('enrolled_student_ids').array(),
  presentStudentIds: text('present_student_ids').array(),
  convocationId: text('convocation_id'),
  maxParticipants: integer('max_participants'),
  targetAudience: text('target_audience').default('students'),
  meetingTime: text('meeting_time'),
  meetingLocation: text('meeting_location'),
  cafeteriaTime: text('cafeteria_time'),
  returnTime: text('return_time'),
  registrationOpenDate: text('registration_open_date'),
  registrationCloseDate: text('registration_close_date')
});

// Convocations compétitions (convocations)
export const convocations = pgTable('convocations', {
  id: text('id').primaryKey(),
  competitionName: text('competition_name').notNull(),
  departureDate: text('departure_date').notNull(),
  returnDate: text('return_date').notNull(),
  guides: text('guides').default(''),
  teacherIds: text('teacher_ids').array(),
  needSnack: text('need_snack').default('NON'),
  needPicnic: text('need_picnic').default('NON'),
  schoolYear: text('school_year').notNull(),
  studentIds: text('student_ids').array(),
  tshirtManagerId: text('tshirt_manager_id'),
  snackManagerIds: text('snack_manager_ids').array(),
  sessionId: text('session_id'),
  targetAudience: text('target_audience').default('students'),
  meetingTime: text('meeting_time'),
  meetingLocation: text('meeting_location'),
  cafeteriaTime: text('cafeteria_time'),
  returnTime: text('return_time')
});

// Créneaux AS Soir personnels (evening_slots)
export const eveningSlots = pgTable('evening_slots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  dayOfWeek: text('day_of_week').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  location: text('location').notNull(),
  description: text('description'),
  coachOrSupervisor: text('coach_or_supervisor'),
  schoolYear: text('school_year').notNull(),
  active: boolean('active').default(true)
});

// Membres personnels (staff_members)
export const staffMembers = pgTable('staff_members', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull(),
  discipline: text('discipline'),
  email: text('email'),
  phone: text('phone'),
  schoolYear: text('school_year').notNull(),
  isLicenseUpToDate: boolean('is_license_up_to_date').default(false),
  licenseNumber: text('license_number'),
  paid: boolean('paid').default(false),
  paymentAmount: integer('payment_amount'),
  paymentMethod: text('payment_method'),
  medicalCertOrQuiz: boolean('medical_cert_or_quiz').default(false),
  parentalOrPersonalAuth: boolean('parental_or_personal_auth').default(false),
  eveningSlotIds: text('evening_slot_ids').array(),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at')
});

// Émargements personnels (staff_attendance)
export const staffAttendance = pgTable('staff_attendance', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  slotId: text('slot_id').notNull(),
  slotName: text('slot_name').notNull(),
  schoolYear: text('school_year').notNull(),
  presentStaffIds: text('present_staff_ids').array(),
  excusedStaffIds: text('excused_staff_ids').array(),
  notes: text('notes'),
  recordedBy: text('recorded_by'),
  createdAt: text('created_at').notNull()
});

// Paramètres et documents (settings / registration form)
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});
