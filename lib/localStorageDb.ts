import { Student, Teacher, Session, Convocation, EveningSlot, StaffMember, StaffAttendanceRecord } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'as_students_data',
  TEACHERS: 'as_teachers_data',
  SESSIONS: 'as_sessions_data',
  CONVOCATIONS: 'as_convocations_data',
  EVENING_SLOTS: 'as_evening_slots_data',
  STAFF_MEMBERS: 'as_staff_members_data',
  STAFF_ATTENDANCE: 'as_staff_attendance_data',
  SETTINGS: 'as_settings_data',
  INITIALIZED: 'as_storage_initialized_v2'
};

function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    return JSON.parse(val) as T;
  } catch {
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`localStorage setItem failed for key ${key}:`, err);
  }
}

// Check if localStorage has students
export function hasLocalStudents(): boolean {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!s) return false;
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function getLocalStudents(schoolYear?: string): Student[] {
  const all = safeGet<Student[]>(STORAGE_KEYS.STUDENTS, []);
  if (!schoolYear) return all;
  return all.filter(s => s.schoolYear === schoolYear);
}

export function setLocalStudents(students: Student[]): void {
  safeSet(STORAGE_KEYS.STUDENTS, students);
}

export function saveLocalStudent(student: Partial<Student>): Student {
  const all = getLocalStudents();
  const id = student.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const existingIdx = all.findIndex(s => s.id === id);
  
  const updatedStudent: Student = {
    id,
    lastName: student.lastName || '',
    firstName: student.firstName || '',
    classGroup: student.classGroup || '',
    schoolYear: student.schoolYear || '2026-2027',
    gender: student.gender || 'M',
    licenseNumber: student.licenseNumber || '',
    paid: student.paid || 'NON',
    amount: student.amount || '',
    paymentMethod: student.paymentMethod || '',
    checkNumber: student.checkNumber,
    parentalAuth: student.parentalAuth || 'NON',
    imageRights: student.imageRights || 'NON',
    swimmingCertificate: student.swimmingCertificate || 'NON',
    tshirt: student.tshirt || 'NON',
    size: student.size || '',
    birthDate: student.birthDate,
    opussChecked: student.opussChecked || false,
    isAdult: student.isAdult || false,
    createdAt: (existingIdx >= 0 ? all[existingIdx].createdAt : undefined) || student.createdAt || now,
    updatedAt: now
  };

  if (existingIdx >= 0) {
    all[existingIdx] = { ...all[existingIdx], ...updatedStudent };
  } else {
    all.push(updatedStudent);
  }
  setLocalStudents(all);
  return updatedStudent;
}

export function batchSaveLocalStudents(newStudents: Partial<Student>[], schoolYear: string): number {
  const all = getLocalStudents();
  const now = new Date().toISOString();
  let count = 0;

  for (const s of newStudents) {
    const id = s.id || crypto.randomUUID();
    const existingIdx = all.findIndex(item => item.id === id || (
      item.schoolYear === (s.schoolYear || schoolYear) &&
      item.lastName.toLowerCase().trim() === (s.lastName || '').toLowerCase().trim() &&
      item.firstName.toLowerCase().trim() === (s.firstName || '').toLowerCase().trim()
    ));

    const item: Student = {
      id: existingIdx >= 0 ? all[existingIdx].id : id,
      lastName: s.lastName || '',
      firstName: s.firstName || '',
      classGroup: s.classGroup || '',
      schoolYear: s.schoolYear || schoolYear,
      gender: s.gender || 'M',
      licenseNumber: s.licenseNumber || (existingIdx >= 0 ? all[existingIdx].licenseNumber : ''),
      paid: s.paid || (existingIdx >= 0 ? all[existingIdx].paid : 'NON'),
      amount: s.amount || '',
      paymentMethod: s.paymentMethod || '',
      checkNumber: s.checkNumber,
      parentalAuth: s.parentalAuth || (existingIdx >= 0 ? all[existingIdx].parentalAuth : 'NON'),
      imageRights: s.imageRights || (existingIdx >= 0 ? all[existingIdx].imageRights : 'NON'),
      swimmingCertificate: s.swimmingCertificate || (existingIdx >= 0 ? all[existingIdx].swimmingCertificate : 'NON'),
      tshirt: s.tshirt || (existingIdx >= 0 ? all[existingIdx].tshirt : 'NON'),
      size: s.size || '',
      birthDate: s.birthDate || (existingIdx >= 0 ? all[existingIdx].birthDate : undefined),
      opussChecked: s.opussChecked !== undefined ? s.opussChecked : (existingIdx >= 0 ? all[existingIdx].opussChecked : false),
      isAdult: s.isAdult !== undefined ? s.isAdult : (existingIdx >= 0 ? all[existingIdx].isAdult : false),
      createdAt: (existingIdx >= 0 ? all[existingIdx].createdAt : undefined) || now,
      updatedAt: now
    };

    if (existingIdx >= 0) {
      all[existingIdx] = item;
    } else {
      all.push(item);
    }
    count++;
  }

  setLocalStudents(all);
  return count;
}

export function deleteLocalStudent(id: string): void {
  const all = getLocalStudents().filter(s => s.id !== id);
  setLocalStudents(all);
}

export function deleteMultipleLocalStudents(ids: string[]): void {
  const idSet = new Set(ids);
  const all = getLocalStudents().filter(s => !idSet.has(s.id));
  setLocalStudents(all);
}

export function updateLocalStudent(id: string, updates: Partial<Student>): void {
  const all = getLocalStudents();
  const idx = all.findIndex(s => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    setLocalStudents(all);
  }
}

export function updateMultipleLocalStudents(ids: string[], updates: Partial<Student>): void {
  const idSet = new Set(ids);
  const all = getLocalStudents().map(s => {
    if (idSet.has(s.id)) {
      return { ...s, ...updates, updatedAt: new Date().toISOString() };
    }
    return s;
  });
  setLocalStudents(all);
}

// TEACHERS
export function getLocalTeachers(): Teacher[] {
  const teachers = safeGet<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
  if (teachers.length === 0) {
    return [
      { id: 'TXT2EESqtmJjJZ3CbFjO', name: 'Mme Le Coq' },
      { id: 'Ud1fT8u5SiP49iUzI44J', name: 'Mr Peuron' },
      { id: 'xFMf5AGW8TPiPhqEElXy', name: 'Mr Auffret' }
    ];
  }
  return teachers;
}

export function setLocalTeachers(teachers: Teacher[]): void {
  safeSet(STORAGE_KEYS.TEACHERS, teachers);
}

// SESSIONS
export function getLocalSessions(schoolYear?: string): Session[] {
  const sessions = safeGet<Session[]>(STORAGE_KEYS.SESSIONS, []);
  if (!schoolYear) return sessions;
  return sessions.filter(s => s.schoolYear === schoolYear);
}

export function setLocalSessions(sessions: Session[]): void {
  safeSet(STORAGE_KEYS.SESSIONS, sessions);
}

export function saveLocalSession(session: Partial<Session>): Session {
  const all = getLocalSessions();
  const id = session.id || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : ('ses_' + Math.random().toString(36).slice(2, 9)));
  const idx = all.findIndex(s => s.id === id);
  const existing = idx >= 0 ? all[idx] : null;

  const mergedSession: Session = {
    id,
    name: session.name !== undefined ? session.name : (existing?.name || ''),
    date: session.date !== undefined ? session.date : (existing?.date || ''),
    time: session.time !== undefined ? session.time : (existing?.time || '13:30'),
    endTime: session.endTime !== undefined ? session.endTime : existing?.endTime,
    location: session.location !== undefined ? session.location : existing?.location,
    teacherIds: session.teacherIds !== undefined ? session.teacherIds : existing?.teacherIds,
    needSnack: session.needSnack !== undefined ? session.needSnack : (existing?.needSnack ?? false),
    description: session.description !== undefined ? session.description : existing?.description,
    requireLicense: session.requireLicense !== undefined ? session.requireLicense : (existing?.requireLicense ?? false),
    requireParentalAuth: session.requireParentalAuth !== undefined ? session.requireParentalAuth : (existing?.requireParentalAuth ?? false),
    requireSwimmingCertificate: session.requireSwimmingCertificate !== undefined ? session.requireSwimmingCertificate : (existing?.requireSwimmingCertificate ?? false),
    schoolYear: session.schoolYear !== undefined ? session.schoolYear : (existing?.schoolYear || '2026-2027'),
    enrolledStudentIds: session.enrolledStudentIds !== undefined ? session.enrolledStudentIds : (existing?.enrolledStudentIds || []),
    presentStudentIds: session.presentStudentIds !== undefined ? session.presentStudentIds : (existing?.presentStudentIds || []),
    convocationId: session.convocationId !== undefined ? session.convocationId : existing?.convocationId,
    maxParticipants: session.maxParticipants !== undefined ? session.maxParticipants : existing?.maxParticipants,
    targetAudience: session.targetAudience !== undefined ? session.targetAudience : (existing?.targetAudience || 'students'),
    meetingTime: session.meetingTime !== undefined ? session.meetingTime : existing?.meetingTime,
    meetingLocation: session.meetingLocation !== undefined ? session.meetingLocation : existing?.meetingLocation,
    cafeteriaTime: session.cafeteriaTime !== undefined ? session.cafeteriaTime : existing?.cafeteriaTime,
    returnTime: session.returnTime !== undefined ? session.returnTime : existing?.returnTime,
    registrationOpenDate: session.registrationOpenDate !== undefined ? session.registrationOpenDate : existing?.registrationOpenDate,
    registrationCloseDate: session.registrationCloseDate !== undefined ? session.registrationCloseDate : existing?.registrationCloseDate,
    isTeamRegistration: session.isTeamRegistration !== undefined ? session.isTeamRegistration : (existing?.isTeamRegistration ?? false),
    teamSize: session.teamSize !== undefined ? session.teamSize : existing?.teamSize,
    teams: session.teams !== undefined ? session.teams : (existing?.teams || [])
  };

  if (idx >= 0) {
    all[idx] = mergedSession;
  } else {
    all.push(mergedSession);
  }
  setLocalSessions(all);
  return mergedSession;
}

// CONVOCATIONS
export function getLocalConvocations(schoolYear?: string): Convocation[] {
  const convs = safeGet<Convocation[]>(STORAGE_KEYS.CONVOCATIONS, []);
  if (!schoolYear) return convs;
  return convs.filter(c => c.schoolYear === schoolYear);
}

export function setLocalConvocations(convocations: Convocation[]): void {
  safeSet(STORAGE_KEYS.CONVOCATIONS, convocations);
}

export function saveLocalConvocation(conv: Partial<Convocation>): Convocation {
  const all = getLocalConvocations();
  const id = conv.id || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : ('cnv_' + Math.random().toString(36).slice(2, 9)));
  const idx = all.findIndex(c => c.id === id);
  const existing = idx >= 0 ? all[idx] : null;

  const merged: Convocation = {
    id,
    competitionName: conv.competitionName !== undefined ? conv.competitionName : (existing?.competitionName || ''),
    departureDate: conv.departureDate !== undefined ? conv.departureDate : (existing?.departureDate || ''),
    returnDate: conv.returnDate !== undefined ? conv.returnDate : (existing?.returnDate || ''),
    guides: conv.guides !== undefined ? conv.guides : (existing?.guides || ''),
    teacherIds: conv.teacherIds !== undefined ? conv.teacherIds : existing?.teacherIds,
    needSnack: conv.needSnack !== undefined ? conv.needSnack : (existing?.needSnack || 'NON'),
    needPicnic: conv.needPicnic !== undefined ? conv.needPicnic : (existing?.needPicnic || 'NON'),
    schoolYear: conv.schoolYear !== undefined ? conv.schoolYear : (existing?.schoolYear || '2026-2027'),
    studentIds: conv.studentIds !== undefined ? conv.studentIds : (existing?.studentIds || []),
    tshirtManagerId: conv.tshirtManagerId !== undefined ? conv.tshirtManagerId : existing?.tshirtManagerId,
    snackManagerIds: conv.snackManagerIds !== undefined ? conv.snackManagerIds : existing?.snackManagerIds,
    sessionId: conv.sessionId !== undefined ? conv.sessionId : existing?.sessionId,
    targetAudience: conv.targetAudience !== undefined ? conv.targetAudience : (existing?.targetAudience || 'students'),
    meetingTime: conv.meetingTime !== undefined ? conv.meetingTime : existing?.meetingTime,
    meetingLocation: conv.meetingLocation !== undefined ? conv.meetingLocation : existing?.meetingLocation,
    cafeteriaTime: conv.cafeteriaTime !== undefined ? conv.cafeteriaTime : existing?.cafeteriaTime,
    returnTime: conv.returnTime !== undefined ? conv.returnTime : existing?.returnTime
  };

  if (idx >= 0) {
    all[idx] = merged;
  } else {
    all.push(merged);
  }
  setLocalConvocations(all);
  return merged;
}

// EVENING SLOTS
export function getLocalEveningSlots(schoolYear?: string): EveningSlot[] {
  const slots = safeGet<EveningSlot[]>(STORAGE_KEYS.EVENING_SLOTS, []);
  if (!schoolYear) return slots;
  return slots.filter(s => s.schoolYear === schoolYear);
}

export function setLocalEveningSlots(slots: EveningSlot[]): void {
  safeSet(STORAGE_KEYS.EVENING_SLOTS, slots);
}

// STAFF MEMBERS
export function getLocalStaffMembers(schoolYear?: string): StaffMember[] {
  const staff = safeGet<StaffMember[]>(STORAGE_KEYS.STAFF_MEMBERS, []);
  if (!schoolYear) return staff;
  return staff.filter(s => s.schoolYear === schoolYear);
}

export function setLocalStaffMembers(staff: StaffMember[]): void {
  safeSet(STORAGE_KEYS.STAFF_MEMBERS, staff);
}

// STAFF ATTENDANCE
export function getLocalStaffAttendance(schoolYear?: string): StaffAttendanceRecord[] {
  const records = safeGet<StaffAttendanceRecord[]>(STORAGE_KEYS.STAFF_ATTENDANCE, []);
  if (!schoolYear) return records;
  return records.filter(r => r.schoolYear === schoolYear);
}

export function setLocalStaffAttendance(records: StaffAttendanceRecord[]): void {
  safeSet(STORAGE_KEYS.STAFF_ATTENDANCE, records);
}

// SETTINGS
export function getLocalSetting<T>(key: string, defaultValue: T): T {
  const settings = safeGet<Record<string, any>>(STORAGE_KEYS.SETTINGS, {});
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

export function saveLocalSetting<T>(key: string, value: T): void {
  const settings = safeGet<Record<string, any>>(STORAGE_KEYS.SETTINGS, {});
  settings[key] = value;
  safeSet(STORAGE_KEYS.SETTINGS, settings);
}

// RESTORE FULL BACKUP INTO LOCAL STORAGE
export function restoreBackupToLocalStorage(data: Record<string, any[]>): void {
  if (data.students && Array.isArray(data.students)) {
    safeSet(STORAGE_KEYS.STUDENTS, data.students);
  }
  if (data.teachers && Array.isArray(data.teachers)) {
    safeSet(STORAGE_KEYS.TEACHERS, data.teachers);
  }
  if (data.sessions && Array.isArray(data.sessions)) {
    safeSet(STORAGE_KEYS.SESSIONS, data.sessions);
  }
  if (data.convocations && Array.isArray(data.convocations)) {
    safeSet(STORAGE_KEYS.CONVOCATIONS, data.convocations);
  }
  if (data.evening_slots && Array.isArray(data.evening_slots)) {
    safeSet(STORAGE_KEYS.EVENING_SLOTS, data.evening_slots);
  }
  if (data.staff_members && Array.isArray(data.staff_members)) {
    safeSet(STORAGE_KEYS.STAFF_MEMBERS, data.staff_members);
  }
  if (data.staff_attendance && Array.isArray(data.staff_attendance)) {
    safeSet(STORAGE_KEYS.STAFF_ATTENDANCE, data.staff_attendance);
  }
}
