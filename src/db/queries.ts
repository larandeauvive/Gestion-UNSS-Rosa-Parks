import { db } from './index.ts';
import { 
  students, teachers, sessions, convocations, 
  eveningSlots, staffMembers, staffAttendance, appSettings 
} from './schema.ts';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { 
  Student, PublicStudent, Teacher, Session, 
  Convocation, EveningSlot, StaffMember, StaffAttendanceRecord 
} from '../../types.ts';

// ----------------------------------------------------
// STUDENTS
// ----------------------------------------------------
export async function getAllStudents(schoolYear?: string): Promise<Student[]> {
  try {
    let query = db.select().from(students);
    const rows = schoolYear 
      ? await query.where(eq(students.schoolYear, schoolYear)).orderBy(asc(students.lastName))
      : await query.orderBy(asc(students.lastName));
    return rows.map(r => ({
      ...r,
      gender: r.gender ?? undefined,
      checkNumber: r.checkNumber ?? undefined,
      swimmingCertificate: r.swimmingCertificate ?? 'NON',
      birthDate: r.birthDate ?? undefined,
      opussChecked: r.opussChecked ?? false,
      isAdult: r.isAdult ?? false,
      paid: r.paid ?? 'NON',
      amount: r.amount ?? '',
      paymentMethod: r.paymentMethod ?? '',
      parentalAuth: r.parentalAuth ?? 'NON',
      imageRights: r.imageRights ?? 'NON',
      tshirt: r.tshirt ?? 'NON',
      size: r.size ?? '',
      licenseNumber: r.licenseNumber ?? '',
      classGroup: r.classGroup ?? ''
    })) as Student[];
  } catch (error) {
    console.error("Failed to query students:", error);
    throw new Error("Impossible de charger les élèves.", { cause: error });
  }
}

export async function getPublicStudentsDirectory(schoolYear: string): Promise<PublicStudent[]> {
  try {
    const rows = await db.select({
      id: students.id,
      lastName: students.lastName,
      firstName: students.firstName,
      classGroup: students.classGroup,
      schoolYear: students.schoolYear,
      paid: students.paid,
      parentalAuth: students.parentalAuth,
      swimmingCertificate: students.swimmingCertificate,
      imageRights: students.imageRights,
      licenseNumber: students.licenseNumber
    })
    .from(students)
    .where(eq(students.schoolYear, schoolYear))
    .orderBy(asc(students.lastName));

    return rows.map(r => ({
      id: r.id,
      lastName: r.lastName,
      firstName: r.firstName,
      classGroup: r.classGroup ?? '',
      schoolYear: r.schoolYear,
      paid: r.paid ?? 'NON',
      parentalAuth: r.parentalAuth ?? 'NON',
      swimmingCertificate: r.swimmingCertificate ?? 'NON',
      imageRights: r.imageRights ?? 'NON',
      licenseNumber: r.licenseNumber ?? ''
    }));
  } catch (error) {
    console.error("Failed to query public students directory:", error);
    throw new Error("Impossible de charger le répertoire public.", { cause: error });
  }
}

export async function insertStudent(student: Omit<Student, 'id'> & { id?: string }): Promise<string> {
  try {
    const id = student.id || ('std_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
    const now = new Date().toISOString();
    await db.insert(students).values({
      id,
      lastName: student.lastName || '',
      firstName: student.firstName || '',
      classGroup: student.classGroup || '',
      gender: student.gender || null,
      schoolYear: student.schoolYear || '',
      licenseNumber: student.licenseNumber || '',
      paid: student.paid || 'NON',
      amount: student.amount || '',
      paymentMethod: student.paymentMethod || '',
      checkNumber: student.checkNumber || null,
      parentalAuth: student.parentalAuth || 'NON',
      imageRights: student.imageRights || 'NON',
      swimmingCertificate: student.swimmingCertificate || 'NON',
      tshirt: student.tshirt || 'NON',
      size: student.size || '',
      birthDate: student.birthDate || null,
      opussChecked: !!student.opussChecked,
      isAdult: !!student.isAdult,
      createdAt: now,
      updatedAt: now
    } as any);
    return id;
  } catch (error) {
    console.error("Failed to insert student:", error);
    throw new Error("Impossible d'ajouter l'élève.", { cause: error });
  }
}

export async function updateStudentById(id: string, data: Partial<Student>): Promise<void> {
  try {
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
    if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
    if (data.classGroup !== undefined) updatePayload.classGroup = data.classGroup;
    if (data.gender !== undefined) updatePayload.gender = data.gender;
    if (data.schoolYear !== undefined) updatePayload.schoolYear = data.schoolYear;
    if (data.licenseNumber !== undefined) updatePayload.licenseNumber = data.licenseNumber;
    if (data.paid !== undefined) updatePayload.paid = data.paid;
    if (data.amount !== undefined) updatePayload.amount = data.amount;
    if (data.paymentMethod !== undefined) updatePayload.paymentMethod = data.paymentMethod;
    if (data.checkNumber !== undefined) updatePayload.checkNumber = data.checkNumber;
    if (data.parentalAuth !== undefined) updatePayload.parentalAuth = data.parentalAuth;
    if (data.imageRights !== undefined) updatePayload.imageRights = data.imageRights;
    if (data.swimmingCertificate !== undefined) updatePayload.swimmingCertificate = data.swimmingCertificate;
    if (data.tshirt !== undefined) updatePayload.tshirt = data.tshirt;
    if (data.size !== undefined) updatePayload.size = data.size;
    if (data.birthDate !== undefined) updatePayload.birthDate = data.birthDate;
    if (data.opussChecked !== undefined) updatePayload.opussChecked = !!data.opussChecked;
    if (data.isAdult !== undefined) updatePayload.isAdult = !!data.isAdult;

    await db.update(students).set(updatePayload).where(eq(students.id, id));
  } catch (error) {
    console.error("Failed to update student:", error);
    throw new Error("Impossible de modifier l'élève.", { cause: error });
  }
}

export async function deleteStudentById(id: string): Promise<void> {
  try {
    await db.delete(students).where(eq(students.id, id));
  } catch (error) {
    console.error("Failed to delete student:", error);
    throw new Error("Impossible de supprimer l'élève.", { cause: error });
  }
}

export async function deleteMultipleStudentsByIds(ids: string[]): Promise<void> {
  try {
    if (!ids || ids.length === 0) return;
    await db.delete(students).where(inArray(students.id, ids));
  } catch (error) {
    console.error("Failed to batch delete students:", error);
    throw new Error("Impossible de supprimer la sélection.", { cause: error });
  }
}

export async function updateMultipleStudentsByIds(ids: string[], data: Partial<Student>): Promise<void> {
  try {
    if (!ids || ids.length === 0) return;
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (data.classGroup !== undefined) updatePayload.classGroup = data.classGroup;
    if (data.schoolYear !== undefined) updatePayload.schoolYear = data.schoolYear;
    if (data.paid !== undefined) updatePayload.paid = data.paid;
    if (data.amount !== undefined) updatePayload.amount = data.amount;
    if (data.paymentMethod !== undefined) updatePayload.paymentMethod = data.paymentMethod;
    if (data.parentalAuth !== undefined) updatePayload.parentalAuth = data.parentalAuth;
    if (data.imageRights !== undefined) updatePayload.imageRights = data.imageRights;
    if (data.swimmingCertificate !== undefined) updatePayload.swimmingCertificate = data.swimmingCertificate;
    if (data.tshirt !== undefined) updatePayload.tshirt = data.tshirt;
    if (data.size !== undefined) updatePayload.size = data.size;
    if (data.opussChecked !== undefined) updatePayload.opussChecked = !!data.opussChecked;

    await db.update(students).set(updatePayload).where(inArray(students.id, ids));
  } catch (error) {
    console.error("Failed to batch update students:", error);
    throw new Error("Impossible de modifier la sélection.", { cause: error });
  }
}

export async function batchUpsertStudents(list: Array<Partial<Student> & { lastName: string; firstName: string }>, defaultSchoolYear: string): Promise<number> {
  try {
    if (!list || list.length === 0) return 0;
    const now = new Date().toISOString();
    let count = 0;
    for (const item of list) {
      const id = item.id || ('std_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
      await db.insert(students).values({
        id,
        lastName: (item.lastName || '').toUpperCase().trim(),
        firstName: (item.firstName || '').trim(),
        classGroup: (item.classGroup || '').toUpperCase().trim(),
        gender: item.gender || null,
        schoolYear: item.schoolYear || defaultSchoolYear,
        licenseNumber: item.licenseNumber || '',
        paid: item.paid || 'NON',
        amount: item.amount || '',
        paymentMethod: item.paymentMethod || '',
        checkNumber: item.checkNumber || null,
        parentalAuth: item.parentalAuth || 'NON',
        imageRights: item.imageRights || 'NON',
        swimmingCertificate: item.swimmingCertificate || 'NON',
        tshirt: item.tshirt || 'NON',
        size: item.size || '',
        birthDate: item.birthDate || null,
        opussChecked: !!item.opussChecked,
        isAdult: !!item.isAdult,
        createdAt: now,
        updatedAt: now
      }).onConflictDoUpdate({
        target: students.id,
        set: {
          classGroup: (item.classGroup || '').toUpperCase().trim(),
          licenseNumber: item.licenseNumber || '',
          paid: item.paid || 'NON',
          amount: item.amount || '',
          paymentMethod: item.paymentMethod || '',
          checkNumber: item.checkNumber || null,
          parentalAuth: item.parentalAuth || 'NON',
          imageRights: item.imageRights || 'NON',
          swimmingCertificate: item.swimmingCertificate || 'NON',
          tshirt: item.tshirt || 'NON',
          size: item.size || '',
          updatedAt: now
        }
      });
      count++;
    }
    return count;
  } catch (error) {
    console.error("Batch upsert students failed:", error);
    throw new Error("Impossible d'importer les élèves.", { cause: error });
  }
}

// ----------------------------------------------------
// TEACHERS
// ----------------------------------------------------
export async function getTeachers(): Promise<Teacher[]> {
  try {
    return await db.select().from(teachers).orderBy(asc(teachers.name));
  } catch (error) {
    console.error("Failed to query teachers:", error);
    throw new Error("Impossible de charger les enseignants.", { cause: error });
  }
}

export async function addTeacher(name: string): Promise<string> {
  try {
    const id = 'tch_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    await db.insert(teachers).values({ id, name });
    return id;
  } catch (error) {
    console.error("Failed to add teacher:", error);
    throw new Error("Impossible d'ajouter l'enseignant.", { cause: error });
  }
}

export async function updateTeacher(id: string, name: string): Promise<void> {
  try {
    await db.update(teachers).set({ name }).where(eq(teachers.id, id));
  } catch (error) {
    console.error("Failed to update teacher:", error);
    throw new Error("Impossible de modifier l'enseignant.", { cause: error });
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  try {
    await db.delete(teachers).where(eq(teachers.id, id));
  } catch (error) {
    console.error("Failed to delete teacher:", error);
    throw new Error("Impossible de supprimer l'enseignant.", { cause: error });
  }
}

// ----------------------------------------------------
// SESSIONS
// ----------------------------------------------------
export async function getSessions(schoolYear?: string): Promise<Session[]> {
  try {
    let query = db.select().from(sessions);
    const rows = schoolYear 
      ? await query.where(eq(sessions.schoolYear, schoolYear)).orderBy(asc(sessions.date))
      : await query.orderBy(asc(sessions.date));
    return rows.map(r => ({
      ...r,
      endTime: r.endTime ?? undefined,
      location: r.location ?? undefined,
      teacherIds: r.teacherIds ?? [],
      needSnack: !!r.needSnack,
      description: r.description ?? undefined,
      requireLicense: !!r.requireLicense,
      enrolledStudentIds: r.enrolledStudentIds ?? [],
      presentStudentIds: r.presentStudentIds ?? [],
      convocationId: r.convocationId ?? undefined,
      maxParticipants: r.maxParticipants ?? undefined,
      targetAudience: (r.targetAudience as any) ?? 'students',
      meetingTime: r.meetingTime ?? undefined,
      meetingLocation: r.meetingLocation ?? undefined,
      cafeteriaTime: r.cafeteriaTime ?? undefined,
      returnTime: r.returnTime ?? undefined,
      registrationOpenDate: r.registrationOpenDate ?? undefined,
      registrationCloseDate: r.registrationCloseDate ?? undefined,
      isTeamRegistration: !!r.isTeamRegistration,
      teamSize: r.teamSize ?? undefined,
      teams: (r.teams as any) ?? []
    })) as Session[];
  } catch (error) {
    console.error("Failed to query sessions:", error);
    throw new Error("Impossible de charger les séances.", { cause: error });
  }
}

export async function getSessionById(id: string): Promise<Session | null> {
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.id, id));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      endTime: r.endTime ?? undefined,
      location: r.location ?? undefined,
      teacherIds: r.teacherIds ?? [],
      needSnack: !!r.needSnack,
      description: r.description ?? undefined,
      requireLicense: !!r.requireLicense,
      enrolledStudentIds: r.enrolledStudentIds ?? [],
      presentStudentIds: r.presentStudentIds ?? [],
      convocationId: r.convocationId ?? undefined,
      maxParticipants: r.maxParticipants ?? undefined,
      targetAudience: (r.targetAudience as any) ?? 'students',
      meetingTime: r.meetingTime ?? undefined,
      meetingLocation: r.meetingLocation ?? undefined,
      cafeteriaTime: r.cafeteriaTime ?? undefined,
      returnTime: r.returnTime ?? undefined,
      registrationOpenDate: r.registrationOpenDate ?? undefined,
      registrationCloseDate: r.registrationCloseDate ?? undefined,
      isTeamRegistration: !!r.isTeamRegistration,
      teamSize: r.teamSize ?? undefined,
      teams: (r.teams as any) ?? []
    } as Session;
  } catch (error) {
    console.error("Failed to get session:", error);
    throw new Error("Impossible de récupérer la séance.", { cause: error });
  }
}

export async function createSession(data: Omit<Session, 'id'> & { id?: string }): Promise<string> {
  try {
    const id = data.id || ('ses_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
    await db.insert(sessions).values({
      id,
      name: data.name,
      date: data.date,
      time: data.time,
      endTime: data.endTime || null,
      location: data.location || null,
      teacherIds: data.teacherIds || [],
      needSnack: !!data.needSnack,
      description: data.description || null,
      requireLicense: !!data.requireLicense,
      schoolYear: data.schoolYear,
      enrolledStudentIds: data.enrolledStudentIds || [],
      presentStudentIds: data.presentStudentIds || [],
      convocationId: data.convocationId || null,
      maxParticipants: data.maxParticipants || null,
      targetAudience: data.targetAudience || 'students',
      meetingTime: data.meetingTime || null,
      meetingLocation: data.meetingLocation || null,
      cafeteriaTime: data.cafeteriaTime || null,
      returnTime: data.returnTime || null,
      registrationOpenDate: data.registrationOpenDate || null,
      registrationCloseDate: data.registrationCloseDate || null,
      isTeamRegistration: !!data.isTeamRegistration,
      teamSize: data.teamSize || null,
      teams: data.teams || []
    });
    return id;
  } catch (error) {
    console.error("Failed to create session:", error);
    throw new Error("Impossible de créer la séance.", { cause: error });
  }
}

export async function updateSessionById(id: string, data: Partial<Session>): Promise<void> {
  try {
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.date !== undefined) payload.date = data.date;
    if (data.time !== undefined) payload.time = data.time;
    if (data.endTime !== undefined) payload.endTime = data.endTime;
    if (data.location !== undefined) payload.location = data.location;
    if (data.teacherIds !== undefined) payload.teacherIds = data.teacherIds;
    if (data.needSnack !== undefined) payload.needSnack = data.needSnack;
    if (data.description !== undefined) payload.description = data.description;
    if (data.requireLicense !== undefined) payload.requireLicense = data.requireLicense;
    if (data.schoolYear !== undefined) payload.schoolYear = data.schoolYear;
    if (data.enrolledStudentIds !== undefined) payload.enrolledStudentIds = data.enrolledStudentIds;
    if (data.presentStudentIds !== undefined) payload.presentStudentIds = data.presentStudentIds;
    if (data.convocationId !== undefined) payload.convocationId = data.convocationId;
    if (data.maxParticipants !== undefined) payload.maxParticipants = data.maxParticipants;
    if (data.targetAudience !== undefined) payload.targetAudience = data.targetAudience;
    if (data.meetingTime !== undefined) payload.meetingTime = data.meetingTime;
    if (data.meetingLocation !== undefined) payload.meetingLocation = data.meetingLocation;
    if (data.cafeteriaTime !== undefined) payload.cafeteriaTime = data.cafeteriaTime;
    if (data.returnTime !== undefined) payload.returnTime = data.returnTime;
    if (data.registrationOpenDate !== undefined) payload.registrationOpenDate = data.registrationOpenDate;
    if (data.registrationCloseDate !== undefined) payload.registrationCloseDate = data.registrationCloseDate;
    if (data.isTeamRegistration !== undefined) payload.isTeamRegistration = data.isTeamRegistration;
    if (data.teamSize !== undefined) payload.teamSize = data.teamSize;
    if (data.teams !== undefined) payload.teams = data.teams;

    await db.update(sessions).set(payload).where(eq(sessions.id, id));
  } catch (error) {
    console.error("Failed to update session:", error);
    throw new Error("Impossible de modifier la séance.", { cause: error });
  }
}

export async function deleteSessionById(id: string): Promise<void> {
  try {
    await db.delete(sessions).where(eq(sessions.id, id));
  } catch (error) {
    console.error("Failed to delete session:", error);
    throw new Error("Impossible de supprimer la séance.", { cause: error });
  }
}

// ----------------------------------------------------
// CONVOCATIONS
// ----------------------------------------------------
export async function getConvocations(schoolYear?: string): Promise<Convocation[]> {
  try {
    let query = db.select().from(convocations);
    const rows = schoolYear 
      ? await query.where(eq(convocations.schoolYear, schoolYear)).orderBy(desc(convocations.departureDate))
      : await query.orderBy(desc(convocations.departureDate));
    return rows.map(r => ({
      ...r,
      guides: r.guides ?? '',
      teacherIds: r.teacherIds ?? [],
      needSnack: r.needSnack ?? 'NON',
      needPicnic: r.needPicnic ?? 'NON',
      studentIds: r.studentIds ?? [],
      tshirtManagerId: r.tshirtManagerId ?? undefined,
      snackManagerIds: r.snackManagerIds ?? [],
      sessionId: r.sessionId ?? undefined,
      targetAudience: (r.targetAudience as any) ?? 'students',
      meetingTime: r.meetingTime ?? undefined,
      meetingLocation: r.meetingLocation ?? undefined,
      cafeteriaTime: r.cafeteriaTime ?? undefined,
      returnTime: r.returnTime ?? undefined,
    })) as Convocation[];
  } catch (error) {
    console.error("Failed to query convocations:", error);
    throw new Error("Impossible de charger les convocations.", { cause: error });
  }
}

export async function createConvocation(data: Omit<Convocation, 'id'> & { id?: string }): Promise<string> {
  try {
    const id = data.id || ('cnv_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
    await db.insert(convocations).values({
      id,
      competitionName: data.competitionName,
      departureDate: data.departureDate,
      returnDate: data.returnDate,
      guides: data.guides || '',
      teacherIds: data.teacherIds || [],
      needSnack: data.needSnack || 'NON',
      needPicnic: data.needPicnic || 'NON',
      schoolYear: data.schoolYear,
      studentIds: data.studentIds || [],
      tshirtManagerId: data.tshirtManagerId || null,
      snackManagerIds: data.snackManagerIds || [],
      sessionId: data.sessionId || null,
      targetAudience: data.targetAudience || 'students',
      meetingTime: data.meetingTime || null,
      meetingLocation: data.meetingLocation || null,
      cafeteriaTime: data.cafeteriaTime || null,
      returnTime: data.returnTime || null,
    });
    return id;
  } catch (error) {
    console.error("Failed to create convocation:", error);
    throw new Error("Impossible de créer la convocation.", { cause: error });
  }
}

export async function updateConvocationById(id: string, data: Partial<Convocation>): Promise<void> {
  try {
    const payload: Record<string, any> = {};
    if (data.competitionName !== undefined) payload.competitionName = data.competitionName;
    if (data.departureDate !== undefined) payload.departureDate = data.departureDate;
    if (data.returnDate !== undefined) payload.returnDate = data.returnDate;
    if (data.guides !== undefined) payload.guides = data.guides;
    if (data.teacherIds !== undefined) payload.teacherIds = data.teacherIds;
    if (data.needSnack !== undefined) payload.needSnack = data.needSnack;
    if (data.needPicnic !== undefined) payload.needPicnic = data.needPicnic;
    if (data.schoolYear !== undefined) payload.schoolYear = data.schoolYear;
    if (data.studentIds !== undefined) payload.studentIds = data.studentIds;
    if (data.tshirtManagerId !== undefined) payload.tshirtManagerId = data.tshirtManagerId;
    if (data.snackManagerIds !== undefined) payload.snackManagerIds = data.snackManagerIds;
    if (data.sessionId !== undefined) payload.sessionId = data.sessionId;
    if (data.targetAudience !== undefined) payload.targetAudience = data.targetAudience;
    if (data.meetingTime !== undefined) payload.meetingTime = data.meetingTime;
    if (data.meetingLocation !== undefined) payload.meetingLocation = data.meetingLocation;
    if (data.cafeteriaTime !== undefined) payload.cafeteriaTime = data.cafeteriaTime;
    if (data.returnTime !== undefined) payload.returnTime = data.returnTime;

    await db.update(convocations).set(payload).where(eq(convocations.id, id));
  } catch (error) {
    console.error("Failed to update convocation:", error);
    throw new Error("Impossible de modifier la convocation.", { cause: error });
  }
}

export async function deleteConvocationById(id: string): Promise<void> {
  try {
    await db.delete(convocations).where(eq(convocations.id, id));
  } catch (error) {
    console.error("Failed to delete convocation:", error);
    throw new Error("Impossible de supprimer la convocation.", { cause: error });
  }
}

// ----------------------------------------------------
// STAFF & EVENING SLOTS
// ----------------------------------------------------
export async function getEveningSlots(schoolYear?: string): Promise<EveningSlot[]> {
  try {
    let query = db.select().from(eveningSlots);
    const rows = schoolYear 
      ? await query.where(eq(eveningSlots.schoolYear, schoolYear)).orderBy(asc(eveningSlots.name))
      : await query.orderBy(asc(eveningSlots.name));
    return rows.map(r => ({
      ...r,
      description: r.description ?? undefined,
      coachOrSupervisor: r.coachOrSupervisor ?? undefined,
      active: r.active ?? true
    }));
  } catch (error) {
    console.error("Failed to query evening slots:", error);
    throw new Error("Impossible de charger les créneaux.", { cause: error });
  }
}

export async function saveEveningSlot(slot: Omit<EveningSlot, 'id'> & { id?: string }): Promise<string> {
  try {
    const id = slot.id || ('esl_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
    await db.insert(eveningSlots).values({
      id,
      name: slot.name,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      description: slot.description || null,
      coachOrSupervisor: slot.coachOrSupervisor || null,
      schoolYear: slot.schoolYear,
      active: slot.active ?? true
    }).onConflictDoUpdate({
      target: eveningSlots.id,
      set: {
        name: slot.name,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        description: slot.description || null,
        coachOrSupervisor: slot.coachOrSupervisor || null,
        schoolYear: slot.schoolYear,
        active: slot.active ?? true
      }
    });
    return id;
  } catch (error) {
    console.error("Failed to save evening slot:", error);
    throw new Error("Impossible de sauvegarder le créneau.", { cause: error });
  }
}

export async function deleteEveningSlotById(id: string): Promise<void> {
  try {
    await db.delete(eveningSlots).where(eq(eveningSlots.id, id));
  } catch (error) {
    console.error("Failed to delete evening slot:", error);
    throw new Error("Impossible de supprimer le créneau.", { cause: error });
  }
}

export async function getStaffMembers(schoolYear?: string): Promise<StaffMember[]> {
  try {
    let query = db.select().from(staffMembers);
    const rows = schoolYear 
      ? await query.where(eq(staffMembers.schoolYear, schoolYear)).orderBy(asc(staffMembers.lastName))
      : await query.orderBy(asc(staffMembers.lastName));
    return rows.map(r => ({
      ...r,
      discipline: r.discipline ?? undefined,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      isLicenseUpToDate: !!r.isLicenseUpToDate,
      licenseNumber: r.licenseNumber ?? undefined,
      paid: !!r.paid,
      paymentAmount: r.paymentAmount ?? undefined,
      paymentMethod: r.paymentMethod ?? undefined,
      medicalCertOrQuiz: !!r.medicalCertOrQuiz,
      parentalOrPersonalAuth: !!r.parentalOrPersonalAuth,
      eveningSlotIds: r.eveningSlotIds ?? [],
      notes: r.notes ?? undefined,
      createdAt: r.createdAt ?? undefined,
      updatedAt: r.updatedAt ?? undefined
    }));
  } catch (error) {
    console.error("Failed to query staff members:", error);
    throw new Error("Impossible de charger les personnels.", { cause: error });
  }
}

export async function saveStaffMember(data: Omit<StaffMember, 'id'> & { id?: string }): Promise<string> {
  try {
    const id = data.id || ('stf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
    const now = new Date().toISOString();
    await db.insert(staffMembers).values({
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      discipline: data.discipline || null,
      email: data.email || null,
      phone: data.phone || null,
      schoolYear: data.schoolYear,
      isLicenseUpToDate: !!data.isLicenseUpToDate,
      licenseNumber: data.licenseNumber || null,
      paid: !!data.paid,
      paymentAmount: data.paymentAmount || null,
      paymentMethod: data.paymentMethod || null,
      medicalCertOrQuiz: !!data.medicalCertOrQuiz,
      parentalOrPersonalAuth: !!data.parentalOrPersonalAuth,
      eveningSlotIds: data.eveningSlotIds || [],
      notes: data.notes || null,
      createdAt: data.createdAt || now,
      updatedAt: now
    }).onConflictDoUpdate({
      target: staffMembers.id,
      set: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        discipline: data.discipline || null,
        email: data.email || null,
        phone: data.phone || null,
        schoolYear: data.schoolYear,
        isLicenseUpToDate: !!data.isLicenseUpToDate,
        licenseNumber: data.licenseNumber || null,
        paid: !!data.paid,
        paymentAmount: data.paymentAmount || null,
        paymentMethod: data.paymentMethod || null,
        medicalCertOrQuiz: !!data.medicalCertOrQuiz,
        parentalOrPersonalAuth: !!data.parentalOrPersonalAuth,
        eveningSlotIds: data.eveningSlotIds || [],
        notes: data.notes || null,
        updatedAt: now
      }
    });
    return id;
  } catch (error) {
    console.error("Failed to save staff member:", error);
    throw new Error("Impossible d'enregistrer le personnel.", { cause: error });
  }
}

export async function deleteStaffMemberById(id: string): Promise<void> {
  try {
    await db.delete(staffMembers).where(eq(staffMembers.id, id));
  } catch (error) {
    console.error("Failed to delete staff member:", error);
    throw new Error("Impossible de supprimer le personnel.", { cause: error });
  }
}

export async function getStaffAttendance(schoolYear?: string): Promise<StaffAttendanceRecord[]> {
  try {
    let query = db.select().from(staffAttendance);
    const rows = schoolYear 
      ? await query.where(eq(staffAttendance.schoolYear, schoolYear)).orderBy(desc(staffAttendance.date))
      : await query.orderBy(desc(staffAttendance.date));
    return rows.map(r => ({
      ...r,
      presentStaffIds: r.presentStaffIds ?? [],
      excusedStaffIds: r.excusedStaffIds ?? [],
      notes: r.notes ?? undefined,
      recordedBy: r.recordedBy ?? undefined
    }));
  } catch (error) {
    console.error("Failed to query staff attendance:", error);
    throw new Error("Impossible de charger les émargements.", { cause: error });
  }
}

export async function saveStaffAttendance(record: Omit<StaffAttendanceRecord, 'id'> & { id?: string }): Promise<string> {
  try {
    const id = record.id || ('att_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
    await db.insert(staffAttendance).values({
      id,
      date: record.date,
      slotId: record.slotId,
      slotName: record.slotName,
      schoolYear: record.schoolYear,
      presentStaffIds: record.presentStaffIds || [],
      excusedStaffIds: record.excusedStaffIds || [],
      notes: record.notes || null,
      recordedBy: record.recordedBy || null,
      createdAt: record.createdAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: staffAttendance.id,
      set: {
        presentStaffIds: record.presentStaffIds || [],
        excusedStaffIds: record.excusedStaffIds || [],
        notes: record.notes || null,
        recordedBy: record.recordedBy || null
      }
    });
    return id;
  } catch (error) {
    console.error("Failed to save staff attendance:", error);
    throw new Error("Impossible d'enregistrer l'émargement.", { cause: error });
  }
}

export async function deleteStaffAttendanceById(id: string): Promise<void> {
  try {
    await db.delete(staffAttendance).where(eq(staffAttendance.id, id));
  } catch (error) {
    console.error("Failed to delete attendance record:", error);
    throw new Error("Impossible de supprimer l'émargement.", { cause: error });
  }
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
export async function getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (rows.length === 0) return defaultValue;
    return JSON.parse(rows[0].value) as T;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return defaultValue;
  }
}

export async function saveSetting<T = any>(key: string, value: T): Promise<void> {
  try {
    const jsonStr = JSON.stringify(value);
    await db.insert(appSettings).values({
      key,
      value: jsonStr,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: jsonStr,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error(`Failed to save setting ${key}:`, error);
    throw new Error("Impossible de sauvegarder le paramètre.", { cause: error });
  }
}

export async function deleteSetting(key: string): Promise<void> {
  try {
    await db.delete(appSettings).where(eq(appSettings.key, key));
  } catch (error) {
    console.error(`Failed to delete setting ${key}:`, error);
  }
}

// ----------------------------------------------------
// RESET & BACKUP UTILITIES
// ----------------------------------------------------
export async function resetDatabase(scope: 'calendar' | 'all'): Promise<void> {
  try {
    await db.delete(sessions);
    await db.delete(convocations);
    if (scope === 'all') {
      await db.delete(students);
      await db.delete(teachers);
      await db.delete(staffMembers);
      await db.delete(staffAttendance);
      await db.delete(eveningSlots);
      await db.delete(appSettings);
    }
  } catch (error) {
    console.error("Failed to reset database:", error);
    throw new Error("Impossible de réinitialiser la base de données.", { cause: error });
  }
}

export async function getFullDatabaseBackup(): Promise<Record<string, any[]>> {
  try {
    const allStudents = await db.select().from(students);
    const allTeachers = await db.select().from(teachers);
    const allSessions = await db.select().from(sessions);
    const allConvocations = await db.select().from(convocations);
    const allEveningSlots = await db.select().from(eveningSlots);
    const allStaff = await db.select().from(staffMembers);
    const allAttendance = await db.select().from(staffAttendance);
    const allSettings = await db.select().from(appSettings);

    return {
      students: allStudents,
      teachers: allTeachers,
      sessions: allSessions,
      convocations: allConvocations,
      evening_slots: allEveningSlots,
      staff_members: allStaff,
      staff_attendance: allAttendance,
      app_settings: allSettings
    };
  } catch (error) {
    console.error("Failed to export full backup:", error);
    throw new Error("Impossible d'exporter la base de données.", { cause: error });
  }
}

export async function restoreDatabaseBackup(data: Record<string, any[]>): Promise<void> {
  try {
    if (Array.isArray(data.students) && data.students.length > 0) {
      for (const s of data.students) {
        await db.insert(students).values(s).onConflictDoUpdate({ target: students.id, set: s });
      }
    }
    if (Array.isArray(data.teachers) && data.teachers.length > 0) {
      for (const t of data.teachers) {
        await db.insert(teachers).values(t).onConflictDoUpdate({ target: teachers.id, set: t });
      }
    }
    if (Array.isArray(data.sessions) && data.sessions.length > 0) {
      for (const ses of data.sessions) {
        await db.insert(sessions).values(ses).onConflictDoUpdate({ target: sessions.id, set: ses });
      }
    }
    if (Array.isArray(data.convocations) && data.convocations.length > 0) {
      for (const c of data.convocations) {
        await db.insert(convocations).values(c).onConflictDoUpdate({ target: convocations.id, set: c });
      }
    }
    if (Array.isArray(data.evening_slots) && data.evening_slots.length > 0) {
      for (const es of data.evening_slots) {
        await db.insert(eveningSlots).values(es).onConflictDoUpdate({ target: eveningSlots.id, set: es });
      }
    }
    if (Array.isArray(data.staff_members) && data.staff_members.length > 0) {
      for (const sm of data.staff_members) {
        await db.insert(staffMembers).values(sm).onConflictDoUpdate({ target: staffMembers.id, set: sm });
      }
    }
    if (Array.isArray(data.staff_attendance) && data.staff_attendance.length > 0) {
      for (const sa of data.staff_attendance) {
        await db.insert(staffAttendance).values(sa).onConflictDoUpdate({ target: staffAttendance.id, set: sa });
      }
    }
    if (Array.isArray(data.app_settings) && data.app_settings.length > 0) {
      for (const st of data.app_settings) {
        await db.insert(appSettings).values(st).onConflictDoUpdate({ target: appSettings.key, set: st });
      }
    }
  } catch (error) {
    console.error("Failed to restore backup:", error);
    throw new Error("Impossible de restaurer la sauvegarde.", { cause: error });
  }
}
