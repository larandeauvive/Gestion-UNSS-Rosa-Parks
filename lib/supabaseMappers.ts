import { supabase } from './supabaseClient';
import { 
  Student, PublicStudent, Teacher, Convocation, 
  Session, EveningSlot, StaffMember, StaffAttendanceRecord 
} from '../types';

// Helper to convert snake_case DB row to Student camelCase
export function rowToStudent(row: any): Student {
  return {
    id: row.id,
    lastName: row.last_name ?? row.lastName ?? '',
    firstName: row.first_name ?? row.firstName ?? '',
    classGroup: row.class_group ?? row.classGroup ?? '',
    gender: row.gender ?? 'M',
    schoolYear: row.school_year ?? row.schoolYear ?? '',
    licenseNumber: row.license_number ?? row.licenseNumber ?? '',
    paid: row.paid ?? 'NON',
    amount: row.amount ?? '',
    paymentMethod: row.payment_method ?? row.paymentMethod ?? '',
    checkNumber: row.check_number ?? row.checkNumber,
    parentalAuth: row.parental_auth ?? row.parentalAuth ?? 'NON',
    imageRights: row.image_rights ?? row.imageRights ?? 'NON',
    swimmingCertificate: row.swimming_certificate ?? row.swimmingCertificate ?? 'NON',
    tshirt: row.tshirt ?? 'NON',
    size: row.size ?? '',
    birthDate: row.birth_date ?? row.birthDate,
    opussChecked: row.opuss_checked ?? row.opussChecked ?? false,
    isAdult: row.is_adult ?? row.isAdult ?? false,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt
  };
}

export function studentToRow(student: Partial<Student>): any {
  const row: any = {};
  if (student.id !== undefined) row.id = student.id;
  if (student.lastName !== undefined) row.last_name = student.lastName;
  if (student.firstName !== undefined) row.first_name = student.firstName;
  if (student.classGroup !== undefined) row.class_group = student.classGroup;
  if (student.gender !== undefined) row.gender = student.gender;
  if (student.schoolYear !== undefined) row.school_year = student.schoolYear;
  if (student.licenseNumber !== undefined) row.license_number = student.licenseNumber;
  if (student.paid !== undefined) row.paid = student.paid;
  if (student.amount !== undefined) row.amount = student.amount;
  if (student.paymentMethod !== undefined) row.payment_method = student.paymentMethod;
  if (student.checkNumber !== undefined) row.check_number = student.checkNumber;
  if (student.parentalAuth !== undefined) row.parental_auth = student.parentalAuth;
  if (student.imageRights !== undefined) row.image_rights = student.imageRights;
  if (student.swimmingCertificate !== undefined) row.swimming_certificate = student.swimmingCertificate;
  if (student.tshirt !== undefined) row.tshirt = student.tshirt;
  if (student.size !== undefined) row.size = student.size;
  if (student.birthDate !== undefined) row.birth_date = student.birthDate;
  if (student.opussChecked !== undefined) row.opuss_checked = student.opussChecked;
  if (student.isAdult !== undefined) row.is_adult = student.isAdult;
  if (student.createdAt !== undefined) row.created_at = student.createdAt;
  if (student.updatedAt !== undefined) row.updated_at = student.updatedAt;
  return row;
}

export function rowToSession(row: any): Session {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time,
    endTime: row.end_time ?? row.endTime,
    location: row.location,
    teacherIds: row.teacher_ids ?? row.teacherIds ?? [],
    needSnack: row.need_snack ?? row.needSnack ?? false,
    description: row.description,
    requireLicense: row.require_license ?? row.requireLicense ?? false,
    requireParentalAuth: row.require_parental_auth ?? row.requireParentalAuth ?? false,
    requireSwimmingCertificate: row.require_swimming_certificate ?? row.requireSwimmingCertificate ?? false,
    schoolYear: row.school_year ?? row.schoolYear,
    enrolledStudentIds: row.enrolled_student_ids ?? row.enrolledStudentIds ?? [],
    presentStudentIds: row.present_student_ids ?? row.presentStudentIds ?? [],
    convocationId: row.convocation_id ?? row.convocationId,
    maxParticipants: row.max_participants ?? row.maxParticipants,
    targetAudience: row.target_audience ?? row.targetAudience ?? 'students',
    meetingTime: row.meeting_time ?? row.meetingTime,
    meetingLocation: row.meeting_location ?? row.meetingLocation,
    cafeteriaTime: row.cafeteria_time ?? row.cafeteriaTime,
    returnTime: row.return_time ?? row.returnTime,
    registrationOpenDate: row.registration_open_date ?? row.registrationOpenDate,
    registrationCloseDate: row.registration_close_date ?? row.registrationCloseDate,
    isTeamRegistration: row.is_team_registration ?? row.isTeamRegistration ?? false,
    teamSize: row.team_size ?? row.teamSize ?? undefined,
    teams: Array.isArray(row.teams) ? row.teams : (typeof row.teams === 'string' ? (JSON.parse(row.teams) || []) : (row.teams ?? []))
  };
}

export function sessionToRow(session: Partial<Session>): any {
  const row: any = {};
  if (session.id !== undefined) row.id = session.id;
  if (session.name !== undefined) row.name = session.name;
  if (session.date !== undefined) row.date = session.date;
  if (session.time !== undefined) row.time = session.time;
  if (session.endTime !== undefined) row.end_time = session.endTime;
  if (session.location !== undefined) row.location = session.location;
  if (session.teacherIds !== undefined) row.teacher_ids = session.teacherIds;
  if (session.needSnack !== undefined) row.need_snack = session.needSnack;
  if (session.description !== undefined) row.description = session.description;
  if (session.requireLicense !== undefined) row.require_license = session.requireLicense;
  if (session.requireParentalAuth !== undefined) row.require_parental_auth = session.requireParentalAuth;
  if (session.requireSwimmingCertificate !== undefined) row.require_swimming_certificate = session.requireSwimmingCertificate;
  if (session.schoolYear !== undefined) row.school_year = session.schoolYear;
  if (session.enrolledStudentIds !== undefined) row.enrolled_student_ids = session.enrolledStudentIds;
  if (session.presentStudentIds !== undefined) row.present_student_ids = session.presentStudentIds;
  if (session.convocationId !== undefined) row.convocation_id = session.convocationId;
  if (session.maxParticipants !== undefined) row.max_participants = session.maxParticipants;
  if (session.targetAudience !== undefined) row.target_audience = session.targetAudience;
  if (session.meetingTime !== undefined) row.meeting_time = session.meetingTime;
  if (session.meetingLocation !== undefined) row.meeting_location = session.meetingLocation;
  if (session.cafeteriaTime !== undefined) row.cafeteria_time = session.cafeteriaTime;
  if (session.returnTime !== undefined) row.return_time = session.returnTime;
  if (session.registrationOpenDate !== undefined) row.registration_open_date = session.registrationOpenDate;
  if (session.registrationCloseDate !== undefined) row.registration_close_date = session.registrationCloseDate;
  if (session.isTeamRegistration !== undefined) row.is_team_registration = session.isTeamRegistration;
  if (session.teamSize !== undefined) row.team_size = session.teamSize;
  if (session.teams !== undefined) row.teams = session.teams;
  return row;
}

export function rowToConvocation(row: any): Convocation {
  return {
    id: row.id,
    competitionName: row.competition_name ?? row.competitionName,
    departureDate: row.departure_date ?? row.departureDate,
    returnDate: row.return_date ?? row.returnDate,
    guides: row.guides ?? '',
    teacherIds: row.teacher_ids ?? row.teacherIds ?? [],
    needSnack: row.need_snack ?? row.needSnack ?? 'NON',
    needPicnic: row.need_picnic ?? row.needPicnic ?? 'NON',
    schoolYear: row.school_year ?? row.schoolYear,
    studentIds: row.student_ids ?? row.studentIds ?? [],
    tshirtManagerId: row.tshirt_manager_id ?? row.tshirtManagerId,
    snackManagerIds: row.snack_manager_ids ?? row.snackManagerIds ?? [],
    sessionId: row.session_id ?? row.sessionId,
    targetAudience: row.target_audience ?? row.targetAudience ?? 'students',
    meetingTime: row.meeting_time ?? row.meetingTime,
    meetingLocation: row.meeting_location ?? row.meetingLocation,
    cafeteriaTime: row.cafeteria_time ?? row.cafeteriaTime,
    returnTime: row.return_time ?? row.returnTime
  };
}

export function convocationToRow(conv: Partial<Convocation>): any {
  const row: any = {};
  if (conv.id !== undefined) row.id = conv.id;
  if (conv.competitionName !== undefined) row.competition_name = conv.competitionName;
  if (conv.departureDate !== undefined) row.departure_date = conv.departureDate;
  if (conv.returnDate !== undefined) row.return_date = conv.returnDate;
  if (conv.guides !== undefined) row.guides = conv.guides;
  if (conv.teacherIds !== undefined) row.teacher_ids = conv.teacherIds;
  if (conv.needSnack !== undefined) row.need_snack = conv.needSnack;
  if (conv.needPicnic !== undefined) row.need_picnic = conv.needPicnic;
  if (conv.schoolYear !== undefined) row.school_year = conv.schoolYear;
  if (conv.studentIds !== undefined) row.student_ids = conv.studentIds;
  if (conv.tshirtManagerId !== undefined) row.tshirt_manager_id = conv.tshirtManagerId;
  if (conv.snackManagerIds !== undefined) row.snack_manager_ids = conv.snackManagerIds;
  if (conv.sessionId !== undefined) row.session_id = conv.sessionId;
  if (conv.targetAudience !== undefined) row.target_audience = conv.targetAudience;
  if (conv.meetingTime !== undefined) row.meeting_time = conv.meetingTime;
  if (conv.meetingLocation !== undefined) row.meeting_location = conv.meetingLocation;
  if (conv.cafeteriaTime !== undefined) row.cafeteria_time = conv.cafeteriaTime;
  if (conv.returnTime !== undefined) row.return_time = conv.returnTime;
  return row;
}

export function rowToEveningSlot(row: any): EveningSlot {
  return {
    id: row.id,
    name: row.name,
    dayOfWeek: row.day_of_week ?? row.dayOfWeek,
    startTime: row.start_time ?? row.startTime,
    endTime: row.end_time ?? row.endTime,
    location: row.location,
    description: row.description,
    coachOrSupervisor: row.coach_or_supervisor ?? row.coachOrSupervisor,
    schoolYear: row.school_year ?? row.schoolYear,
    active: row.active ?? true
  };
}

export function eveningSlotToRow(slot: Partial<EveningSlot>): any {
  const row: any = {};
  if (slot.id !== undefined) row.id = slot.id;
  if (slot.name !== undefined) row.name = slot.name;
  if (slot.dayOfWeek !== undefined) row.day_of_week = slot.dayOfWeek;
  if (slot.startTime !== undefined) row.start_time = slot.startTime;
  if (slot.endTime !== undefined) row.end_time = slot.endTime;
  if (slot.location !== undefined) row.location = slot.location;
  if (slot.description !== undefined) row.description = slot.description;
  if (slot.coachOrSupervisor !== undefined) row.coach_or_supervisor = slot.coachOrSupervisor;
  if (slot.schoolYear !== undefined) row.school_year = slot.schoolYear;
  if (slot.active !== undefined) row.active = slot.active;
  return row;
}

export function rowToStaffMember(row: any): StaffMember {
  return {
    id: row.id,
    firstName: row.first_name ?? row.firstName,
    lastName: row.last_name ?? row.lastName,
    role: row.role,
    discipline: row.discipline,
    email: row.email,
    phone: row.phone,
    schoolYear: row.school_year ?? row.schoolYear,
    isLicenseUpToDate: row.is_license_up_to_date ?? row.isLicenseUpToDate ?? false,
    licenseNumber: row.license_number ?? row.licenseNumber,
    paid: row.paid ?? false,
    paymentAmount: row.payment_amount ?? row.paymentAmount,
    paymentMethod: row.payment_method ?? row.paymentMethod,
    medicalCertOrQuiz: row.medical_cert_or_quiz ?? row.medicalCertOrQuiz ?? false,
    parentalOrPersonalAuth: row.parental_or_personal_auth ?? row.parentalOrPersonalAuth ?? false,
    eveningSlotIds: row.evening_slot_ids ?? row.eveningSlotIds ?? [],
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt
  };
}

export function staffMemberToRow(staff: Partial<StaffMember>): any {
  const row: any = {};
  if (staff.id !== undefined) row.id = staff.id;
  if (staff.firstName !== undefined) row.first_name = staff.firstName;
  if (staff.lastName !== undefined) row.last_name = staff.lastName;
  if (staff.role !== undefined) row.role = staff.role;
  if (staff.discipline !== undefined) row.discipline = staff.discipline;
  if (staff.email !== undefined) row.email = staff.email;
  if (staff.phone !== undefined) row.phone = staff.phone;
  if (staff.schoolYear !== undefined) row.school_year = staff.schoolYear;
  if (staff.isLicenseUpToDate !== undefined) row.is_license_up_to_date = staff.isLicenseUpToDate;
  if (staff.licenseNumber !== undefined) row.license_number = staff.licenseNumber;
  if (staff.paid !== undefined) row.paid = staff.paid;
  if (staff.paymentAmount !== undefined) row.payment_amount = staff.paymentAmount;
  if (staff.paymentMethod !== undefined) row.payment_method = staff.paymentMethod;
  if (staff.medicalCertOrQuiz !== undefined) row.medical_cert_or_quiz = staff.medicalCertOrQuiz;
  if (staff.parentalOrPersonalAuth !== undefined) row.parental_or_personal_auth = staff.parentalOrPersonalAuth;
  if (staff.eveningSlotIds !== undefined) row.evening_slot_ids = staff.eveningSlotIds;
  if (staff.notes !== undefined) row.notes = staff.notes;
  if (staff.createdAt !== undefined) row.created_at = staff.createdAt;
  if (staff.updatedAt !== undefined) row.updated_at = staff.updatedAt;
  return row;
}

export function rowToStaffAttendance(row: any): StaffAttendanceRecord {
  return {
    id: row.id,
    date: row.date,
    slotId: row.slot_id ?? row.slotId,
    slotName: row.slot_name ?? row.slotName,
    schoolYear: row.school_year ?? row.schoolYear,
    presentStaffIds: row.present_staff_ids ?? row.presentStaffIds ?? [],
    excusedStaffIds: row.excused_staff_ids ?? row.excusedStaffIds ?? [],
    notes: row.notes,
    recordedBy: row.recorded_by ?? row.recordedBy,
    createdAt: row.created_at ?? row.createdAt
  };
}

export function staffAttendanceToRow(rec: Partial<StaffAttendanceRecord>): any {
  const row: any = {};
  if (rec.id !== undefined) row.id = rec.id;
  if (rec.date !== undefined) row.date = rec.date;
  if (rec.slotId !== undefined) row.slot_id = rec.slotId;
  if (rec.slotName !== undefined) row.slot_name = rec.slotName;
  if (rec.schoolYear !== undefined) row.school_year = rec.schoolYear;
  if (rec.presentStaffIds !== undefined) row.present_staff_ids = rec.presentStaffIds;
  if (rec.excusedStaffIds !== undefined) row.excused_staff_ids = rec.excusedStaffIds;
  if (rec.notes !== undefined) row.notes = rec.notes;
  if (rec.recordedBy !== undefined) row.recorded_by = rec.recordedBy;
  if (rec.createdAt !== undefined) row.created_at = rec.createdAt;
  return row;
}
