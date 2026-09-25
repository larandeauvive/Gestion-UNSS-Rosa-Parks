import { supabase } from './supabaseClient';
import { 
  Student, PublicStudent, Teacher, Convocation, 
  Session, EveningSlot, StaffMember, StaffAttendanceRecord 
} from '../types';
import {
  rowToStudent, studentToRow,
  rowToSession, sessionToRow,
  rowToConvocation, convocationToRow,
  rowToEveningSlot, eveningSlotToRow,
  rowToStaffMember, staffMemberToRow,
  rowToStaffAttendance, staffAttendanceToRow
} from './supabaseMappers';
import {
  getLocalStudents,
  setLocalStudents,
  saveLocalStudent,
  batchSaveLocalStudents,
  deleteLocalStudent,
  deleteMultipleLocalStudents,
  updateLocalStudent,
  updateMultipleLocalStudents,
  getLocalTeachers,
  setLocalTeachers,
  getLocalSessions,
  setLocalSessions,
  saveLocalSession,
  getLocalConvocations,
  setLocalConvocations,
  getLocalEveningSlots,
  setLocalEveningSlots,
  getLocalStaffMembers,
  setLocalStaffMembers,
  getLocalStaffAttendance,
  setLocalStaffAttendance,
  getLocalSetting,
  saveLocalSetting,
  restoreBackupToLocalStorage,
  hasLocalStudents
} from './localStorageDb';

const API_BASE = '/api';

// Helper for API routes with robust HTML/JSON error detection
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('as_auth_token') || 'admin-secret-passkey';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options?.headers as Record<string, string> || {})
  };
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMessage = `Erreur serveur (${res.status})`;
    if (isJson) {
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
      } catch {
        // Ignorer erreur de parsing
      }
    } else {
      const text = await res.text().catch(() => '');
      if (text && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
        errorMessage = text.slice(0, 150);
      } else {
        errorMessage = `Erreur API (${res.status}): Réponse HTML inattendue.`;
      }
    }
    throw new Error(errorMessage);
  }

  if (!isJson) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Format inattendu: le serveur a renvoyé du HTML pour ${url}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  return res.json();
}

// ----------------------------------------------------
// STUDENTS (Supabase client + API + LocalStorage fallback)
// ----------------------------------------------------
export const getStudents = async (schoolYear?: string): Promise<Student[]> => {
  try {
    let query = supabase.from('students').select('*').order('last_name', { ascending: true });
    if (schoolYear) {
      query = query.eq('school_year', schoolYear);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase getStudents query error, falling back to API / LocalStorage:', error.message);
      try {
        const q = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
        const apiData = await fetchJson<Student[]>(`${API_BASE}/students${q}`);
        if (apiData && apiData.length > 0) {
          setLocalStudents(apiData);
          return apiData;
        }
      } catch (apiErr) {
        console.warn('API fallback error, checking localStorage:', apiErr);
      }
      return getLocalStudents(schoolYear);
    }
    const mapped = (data || []).map(rowToStudent);
    if (mapped.length > 0) {
      setLocalStudents(mapped);
    } else if (hasLocalStudents()) {
      return getLocalStudents(schoolYear);
    }
    return mapped;
  } catch (err) {
    console.warn('getStudents fallback to LocalStorage:', err);
    try {
      const q = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
      const apiData = await fetchJson<Student[]>(`${API_BASE}/students${q}`);
      if (apiData && apiData.length > 0) {
        setLocalStudents(apiData);
        return apiData;
      }
    } catch {
      // ignore
    }
    return getLocalStudents(schoolYear);
  }
};

export const getStudentsList = getStudents;

export const getPublicDirectory = async (schoolYear: string): Promise<PublicStudent[]> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, last_name, first_name, class_group, school_year, is_adult, license_number, opuss_checked, paid, parental_auth, swimming_certificate, image_rights')
      .eq('school_year', schoolYear)
      .order('last_name', { ascending: true });

    if (error) {
      console.warn('Supabase getPublicDirectory error, falling back to API / LocalStorage:', error.message);
      try {
        return await fetchJson<PublicStudent[]>(`${API_BASE}/public-directory?schoolYear=${encodeURIComponent(schoolYear)}`);
      } catch {
        const local = getLocalStudents(schoolYear);
        return local.map(s => ({
          id: s.id,
          lastName: s.lastName || '',
          firstName: s.firstName || '',
          classGroup: s.classGroup || '',
          schoolYear: s.schoolYear || '',
          isAdult: s.isAdult || false,
          paid: s.paid || 'NON',
          parentalAuth: s.parentalAuth || 'NON',
          swimmingCertificate: s.swimmingCertificate || 'NON',
          imageRights: s.imageRights || 'NON',
          licenseNumber: s.licenseNumber || '',
          hasLicense: !!(s.licenseNumber && s.licenseNumber.trim().length > 0) || s.opussChecked === true || s.paid === 'OUI'
        }));
      }
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      lastName: row.last_name ?? '',
      firstName: row.first_name ?? '',
      classGroup: row.class_group ?? '',
      schoolYear: row.school_year ?? '',
      isAdult: row.is_adult ?? false,
      paid: row.paid ?? 'NON',
      parentalAuth: row.parental_auth ?? 'NON',
      swimmingCertificate: row.swimming_certificate ?? 'NON',
      imageRights: row.image_rights ?? 'NON',
      licenseNumber: row.license_number ?? '',
      hasLicense: !!(row.license_number && row.license_number.trim().length > 0) || row.opuss_checked === true || row.paid === 'OUI'
    }));

    if (mapped.length === 0 && hasLocalStudents()) {
      const local = getLocalStudents(schoolYear);
      return local.map(s => ({
        id: s.id,
        lastName: s.lastName || '',
        firstName: s.firstName || '',
        classGroup: s.classGroup || '',
        schoolYear: s.schoolYear || '',
        isAdult: s.isAdult || false,
        paid: s.paid || 'NON',
        parentalAuth: s.parentalAuth || 'NON',
        swimmingCertificate: s.swimmingCertificate || 'NON',
        imageRights: s.imageRights || 'NON',
        licenseNumber: s.licenseNumber || '',
        hasLicense: !!(s.licenseNumber && s.licenseNumber.trim().length > 0) || s.opussChecked === true || s.paid === 'OUI'
      }));
    }

    return mapped;
  } catch {
    try {
      return await fetchJson<PublicStudent[]>(`${API_BASE}/public-directory?schoolYear=${encodeURIComponent(schoolYear)}`);
    } catch {
      const local = getLocalStudents(schoolYear);
      return local.map(s => ({
        id: s.id,
        lastName: s.lastName || '',
        firstName: s.firstName || '',
        classGroup: s.classGroup || '',
        schoolYear: s.schoolYear || '',
        isAdult: s.isAdult || false,
        paid: s.paid || 'NON',
        parentalAuth: s.parentalAuth || 'NON',
        swimmingCertificate: s.swimmingCertificate || 'NON',
        imageRights: s.imageRights || 'NON',
        licenseNumber: s.licenseNumber || '',
        hasLicense: !!(s.licenseNumber && s.licenseNumber.trim().length > 0) || s.opussChecked === true || s.paid === 'OUI'
      }));
    }
  }
};

export const addStudent = async (student: Omit<Student, "id">): Promise<string> => {
  const newId = crypto.randomUUID();
  const row = studentToRow({
    ...student,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Always mirror to localStorage for instant resilience
  saveLocalStudent({ ...student, id: newId });

  try {
    const { error } = await supabase.from('students').insert(row);
    if (error) {
      console.warn('Supabase addStudent error, falling back to API:', error.message);
      try {
        const res = await fetchJson<{ id: string }>(`${API_BASE}/students`, {
          method: 'POST',
          body: JSON.stringify(student)
        });
        return res.id;
      } catch {
        return newId;
      }
    }
    return newId;
  } catch {
    try {
      const res = await fetchJson<{ id: string }>(`${API_BASE}/students`, {
        method: 'POST',
        body: JSON.stringify(student)
      });
      return res.id;
    } catch {
      return newId;
    }
  }
};

export const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
  // Always update local mirror
  updateLocalStudent(id, data);

  const row = studentToRow({
    ...data,
    updatedAt: new Date().toISOString()
  });

  try {
    const { error } = await supabase.from('students').update(row).eq('id', id);
    if (error) {
      console.warn('Supabase updateStudent error, falling back to API:', error.message);
      try {
        await fetchJson(`${API_BASE}/students/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        // Handled by local storage
      }
    }
  } catch {
    try {
      await fetchJson(`${API_BASE}/students/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch {
      // Handled by local storage
    }
  }
};

export const deleteStudent = async (id: string): Promise<void> => {
  deleteLocalStudent(id);

  try {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      console.warn('Supabase deleteStudent error, falling back to API:', error.message);
      try {
        await fetchJson(`${API_BASE}/students/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      } catch {
        // Handled by local storage
      }
    }
  } catch {
    try {
      await fetchJson(`${API_BASE}/students/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {
      // Handled by local storage
    }
  }
};

export const deleteMultipleStudents = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  deleteMultipleLocalStudents(ids);

  try {
    const { error } = await supabase.from('students').delete().in('id', ids);
    if (error) {
      console.warn('Supabase deleteMultipleStudents error, falling back to API:', error.message);
      try {
        await fetchJson(`${API_BASE}/students/batch-delete`, {
          method: 'POST',
          body: JSON.stringify({ ids })
        });
      } catch {
        // Handled by local storage
      }
    }
  } catch {
    try {
      await fetchJson(`${API_BASE}/students/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
    } catch {
      // Handled by local storage
    }
  }
};

export const updateMultipleStudents = async (ids: string[], data: Partial<Student>): Promise<void> => {
  if (!ids || ids.length === 0) return;
  updateMultipleLocalStudents(ids, data);

  const row = studentToRow({
    ...data,
    updatedAt: new Date().toISOString()
  });

  try {
    const { error } = await supabase.from('students').update(row).in('id', ids);
    if (error) {
      console.warn('Supabase updateMultipleStudents error, falling back to API:', error.message);
      try {
        await fetchJson(`${API_BASE}/students/batch-update`, {
          method: 'POST',
          body: JSON.stringify({ ids, data })
        });
      } catch {
        // Handled by local storage
      }
    }
  } catch {
    try {
      await fetchJson(`${API_BASE}/students/batch-update`, {
        method: 'POST',
        body: JSON.stringify({ ids, data })
      });
    } catch {
      // Handled by local storage
    }
  }
};

export const batchUpsertStudentsApi = async (students: Partial<Student>[], schoolYear: string): Promise<number> => {
  if (!students || students.length === 0) return 0;
  
  // Save directly to localStorage first so UI reflects imports immediately
  batchSaveLocalStudents(students, schoolYear);

  const now = new Date().toISOString();
  const rows = students.map(s => {
    const r = studentToRow({
      ...s,
      schoolYear: s.schoolYear || schoolYear,
      updatedAt: now,
      createdAt: s.createdAt || now
    });
    if (!r.id) r.id = crypto.randomUUID();
    return r;
  });

  try {
    const { error } = await supabase.from('students').upsert(rows);
    if (error) {
      console.warn('Supabase batchUpsert error, falling back to API:', error.message);
      try {
        const res = await fetchJson<{ success: boolean; count: number }>(`${API_BASE}/students/batch-upsert`, {
          method: 'POST',
          body: JSON.stringify({ students, schoolYear })
        });
        return res.count;
      } catch {
        return rows.length;
      }
    }
    return rows.length;
  } catch {
    try {
      const res = await fetchJson<{ success: boolean; count: number }>(`${API_BASE}/students/batch-upsert`, {
        method: 'POST',
        body: JSON.stringify({ students, schoolYear })
      });
      return res.count;
    } catch {
      return rows.length;
    }
  }
};

export const syncAllToPublicDirectory = async (_studentsList: Student[]): Promise<void> => {
  return;
};

// ----------------------------------------------------
// TEACHERS
// ----------------------------------------------------
export const getTeachersList = async (): Promise<Teacher[]> => {
  try {
    const { data, error } = await supabase.from('teachers').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((r: any) => ({ id: r.id, name: r.name }));
  } catch {
    return fetchJson<Teacher[]>(`${API_BASE}/teachers`);
  }
};

export const addTeacherApi = async (name: string): Promise<string> => {
  const newId = crypto.randomUUID();
  try {
    const { error } = await supabase.from('teachers').insert({ id: newId, name });
    if (error) throw error;
    return newId;
  } catch {
    const res = await fetchJson<{ id: string }>(`${API_BASE}/teachers`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    return res.id;
  }
};

export const updateTeacherApi = async (id: string, name: string): Promise<void> => {
  try {
    const { error } = await supabase.from('teachers').update({ name }).eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/teachers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  }
};

export const deleteTeacherApi = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/teachers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

// ----------------------------------------------------
// SESSIONS & CRÉNEAUX D'ACTIVITÉS (Supabase client direct)
// ----------------------------------------------------
export const getSessionsList = async (schoolYear?: string): Promise<Session[]> => {
  try {
    let query = supabase.from('sessions').select('*').order('date', { ascending: false });
    if (schoolYear) {
      query = query.eq('school_year', schoolYear);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase getSessionsList error, falling back to API:', error.message);
      const q = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
      const serverList = await fetchJson<Session[]>(`${API_BASE}/sessions${q}`);
      return serverList;
    }
    return (data || []).map(rowToSession);
  } catch {
    try {
      const q = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
      return await fetchJson<Session[]>(`${API_BASE}/sessions${q}`);
    } catch {
      return getLocalSessions(schoolYear);
    }
  }
};

export const getSession = async (id: string): Promise<Session> => {
  try {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single();
    if (error || !data) throw error || new Error('Séance introuvable');
    return rowToSession(data);
  } catch {
    try {
      return await fetchJson<Session>(`${API_BASE}/sessions/${encodeURIComponent(id)}`);
    } catch {
      const all = getLocalSessions();
      const s = all.find(item => item.id === id);
      if (!s) throw new Error('Séance introuvable');
      return s;
    }
  }
};

export const addSessionApi = async (data: Omit<Session, 'id'>): Promise<string> => {
  const newId = crypto.randomUUID();
  const sessionWithId = { ...data, id: newId };
  // Sauvegarde locale miroir immédiate
  saveLocalSession(sessionWithId);

  const row = sessionToRow(sessionWithId);

  try {
    const { error } = await supabase.from('sessions').insert(row);
    if (error) {
      console.warn('Supabase insert session error, falling back to API:', error.message);
      const res = await fetchJson<{ id: string }>(`${API_BASE}/sessions`, {
        method: 'POST',
        body: JSON.stringify(sessionWithId)
      });
      return res.id || newId;
    }
    return newId;
  } catch {
    try {
      const res = await fetchJson<{ id: string }>(`${API_BASE}/sessions`, {
        method: 'POST',
        body: JSON.stringify(sessionWithId)
      });
      return res.id || newId;
    } catch (apiErr) {
      console.warn('Backend API addSession fallback failed, using local save:', apiErr);
      return newId;
    }
  }
};

export const updateSessionApi = async (id: string, data: Partial<Session>): Promise<void> => {
  // Sauvegarde locale miroir immédiate
  saveLocalSession({ ...data, id });

  const row = sessionToRow(data);
  try {
    const { error } = await supabase.from('sessions').update(row).eq('id', id);
    if (error) {
      console.warn('Supabase update session error, falling back to API:', error.message);
      await fetchJson(`${API_BASE}/sessions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  } catch {
    try {
      await fetchJson(`${API_BASE}/sessions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (apiErr) {
      console.warn('Backend API updateSession fallback failed, using local save:', apiErr);
    }
  }
};

export const saveSessionApi = async (data: Partial<Session> & { id?: string }): Promise<{ id: string }> => {
  if (data.id) {
    const { id, ...rest } = data;
    await updateSessionApi(id, rest);
    return { id };
  } else {
    const newId = await addSessionApi(data as Omit<Session, 'id'>);
    return { id: newId };
  }
};

export const deleteSessionApi = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Réservation d'un créneau / séance d'activité avec Supabase
 */
export const enrollInSession = async (sessionId: string, studentId: string): Promise<void> => {
  try {
    // 1. Lire la séance courante
    const { data: currentSession, error: fetchErr } = await supabase
      .from('sessions')
      .select('enrolled_student_ids, max_participants')
      .eq('id', sessionId)
      .single();

    if (fetchErr) throw fetchErr;

    const enrolledList: string[] = currentSession?.enrolled_student_ids || [];
    if (!enrolledList.includes(studentId)) {
      if (currentSession?.max_participants && enrolledList.length >= currentSession.max_participants) {
        throw new Error('La séance est complète.');
      }
      enrolledList.push(studentId);

      const { error: updateErr } = await supabase
        .from('sessions')
        .update({ enrolled_student_ids: enrolledList })
        .eq('id', sessionId);

      if (updateErr) throw updateErr;
    }
  } catch (err) {
    console.warn('Supabase enrollInSession fallback to API:', err);
    await fetchJson(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId })
    });
  }
};

/**
 * Inscription d'une équipe complète à une séance
 */
export const enrollTeamInSession = async (
  sessionId: string,
  teamName: string,
  studentIds: string[]
): Promise<{ id: string; name: string; studentIds: string[]; createdAt: string }> => {
  const newTeam = {
    id: 'team_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    name: teamName.trim() || 'Équipe',
    studentIds: Array.from(new Set(studentIds)),
    createdAt: new Date().toISOString()
  };

  try {
    const session = await getSession(sessionId);
    if (!session) throw new Error('Séance introuvable');

    const currentEnrolled = new Set(session.enrolledStudentIds || []);
    newTeam.studentIds.forEach(id => currentEnrolled.add(id));

    const currentTeams = [...(session.teams || [])];
    currentTeams.push(newTeam);

    await saveSessionApi({
      id: sessionId,
      enrolledStudentIds: Array.from(currentEnrolled),
      teams: currentTeams
    });

    return newTeam;
  } catch (err) {
    console.warn('Error in enrollTeamInSession:', err);
    try {
      await fetchJson(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/enroll-team`, {
        method: 'POST',
        body: JSON.stringify({ team: newTeam })
      });
    } catch (e) {
      console.warn('API fallback enroll-team error:', e);
    }
    return newTeam;
  }
};

/**
 * Retrait / suppression d'une équipe inscrite
 */
export const deleteTeamFromSession = async (
  sessionId: string,
  teamId: string
): Promise<void> => {
  try {
    const session = await getSession(sessionId);
    if (!session) return;

    const teamToRemove = (session.teams || []).find(t => t.id === teamId);
    const updatedTeams = (session.teams || []).filter(t => t.id !== teamId);
    
    let updatedEnrolled = session.enrolledStudentIds || [];
    if (teamToRemove) {
      const otherTeamStudentIds = new Set(updatedTeams.flatMap(t => t.studentIds));
      updatedEnrolled = updatedEnrolled.filter(id => otherTeamStudentIds.has(id));
    }

    await saveSessionApi({
      id: sessionId,
      teams: updatedTeams,
      enrolledStudentIds: updatedEnrolled
    });
  } catch (err) {
    console.error('Error deleteTeamFromSession:', err);
  }
};

// ----------------------------------------------------
// CONVOCATIONS
// ----------------------------------------------------
export const getConvocationsList = async (schoolYear?: string): Promise<Convocation[]> => {
  try {
    let query = supabase.from('convocations').select('*').order('departure_date', { ascending: false });
    if (schoolYear) {
      query = query.eq('school_year', schoolYear);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToConvocation);
  } catch {
    const query = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
    return fetchJson<Convocation[]>(`${API_BASE}/convocations${query}`);
  }
};

export const addConvocationApi = async (data: Omit<Convocation, 'id'>): Promise<string> => {
  const newId = crypto.randomUUID();
  const row = convocationToRow({ ...data, id: newId });
  try {
    const { error } = await supabase.from('convocations').insert(row);
    if (error) throw error;
    return newId;
  } catch {
    const res = await fetchJson<{ id: string }>(`${API_BASE}/convocations`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.id;
  }
};

export const updateConvocationApi = async (id: string, data: Partial<Convocation>): Promise<void> => {
  const row = convocationToRow(data);
  try {
    const { error } = await supabase.from('convocations').update(row).eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/convocations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

export const saveConvocationApi = async (data: Partial<Convocation> & { id?: string }): Promise<{ id: string }> => {
  if (data.id) {
    const { id, ...rest } = data;
    await updateConvocationApi(id, rest);
    return { id };
  } else {
    const newId = await addConvocationApi(data as Omit<Convocation, 'id'>);
    return { id: newId };
  }
};

export const deleteConvocationApi = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('convocations').delete().eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/convocations/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

// ----------------------------------------------------
// STAFF & EVENING SLOTS
// ----------------------------------------------------
export const getEveningSlotsList = async (schoolYear?: string): Promise<EveningSlot[]> => {
  try {
    let query = supabase.from('evening_slots').select('*');
    if (schoolYear) query = query.eq('school_year', schoolYear);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToEveningSlot);
  } catch {
    const query = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
    return fetchJson<EveningSlot[]>(`${API_BASE}/evening-slots${query}`);
  }
};

export const saveEveningSlotApi = async (slot: Omit<EveningSlot, 'id'> & { id?: string }): Promise<string> => {
  const newId = slot.id || crypto.randomUUID();
  const row = eveningSlotToRow({ ...slot, id: newId });
  try {
    const { error } = await supabase.from('evening_slots').upsert(row);
    if (error) throw error;
    return newId;
  } catch {
    const res = await fetchJson<{ id: string }>(`${API_BASE}/evening-slots`, {
      method: 'POST',
      body: JSON.stringify(slot)
    });
    return res.id;
  }
};

export const deleteEveningSlotApi = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('evening_slots').delete().eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/evening-slots/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

export const getStaffMembersList = async (schoolYear?: string): Promise<StaffMember[]> => {
  try {
    let query = supabase.from('staff_members').select('*');
    if (schoolYear) query = query.eq('school_year', schoolYear);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToStaffMember);
  } catch {
    const query = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
    return fetchJson<StaffMember[]>(`${API_BASE}/staff-members${query}`);
  }
};

export const saveStaffMemberApi = async (data: Omit<StaffMember, 'id'> & { id?: string }): Promise<string> => {
  const newId = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const row = staffMemberToRow({
    ...data,
    id: newId,
    updatedAt: now,
    createdAt: data.createdAt || now
  });

  try {
    const { error } = await supabase.from('staff_members').upsert(row);
    if (error) throw error;
    return newId;
  } catch {
    const res = await fetchJson<{ id: string }>(`${API_BASE}/staff-members`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.id;
  }
};

export const deleteStaffMemberApi = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('staff_members').delete().eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/staff-members/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

export const getStaffAttendanceList = async (schoolYear?: string): Promise<StaffAttendanceRecord[]> => {
  try {
    let query = supabase.from('staff_attendance').select('*').order('date', { ascending: false });
    if (schoolYear) query = query.eq('school_year', schoolYear);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToStaffAttendance);
  } catch {
    const query = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
    return fetchJson<StaffAttendanceRecord[]>(`${API_BASE}/staff-attendance${query}`);
  }
};

export const saveStaffAttendanceApi = async (record: Omit<StaffAttendanceRecord, 'id'> & { id?: string }): Promise<string> => {
  const newId = record.id || crypto.randomUUID();
  const row = staffAttendanceToRow({
    ...record,
    id: newId,
    createdAt: record.createdAt || new Date().toISOString()
  });

  try {
    const { error } = await supabase.from('staff_attendance').upsert(row);
    if (error) throw error;
    return newId;
  } catch {
    const res = await fetchJson<{ id: string }>(`${API_BASE}/staff-attendance`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
    return res.id;
  }
};

export const deleteStaffAttendanceApi = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('staff_attendance').delete().eq('id', id);
    if (error) throw error;
  } catch {
    await fetchJson(`${API_BASE}/staff-attendance/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

// ----------------------------------------------------
// SETTINGS & REGISTRATION FORM (Supabase app_settings)
// ----------------------------------------------------
export const getAppSetting = async <T = any>(key: string, defaultValue?: T): Promise<T | null> => {
  try {
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
    if (error || !data) {
      const localVal = getLocalSetting<T>(key, defaultValue !== undefined ? defaultValue : (null as unknown as T));
      return localVal;
    }
    try {
      const parsed = JSON.parse(data.value);
      saveLocalSetting(key, parsed);
      return parsed;
    } catch {
      saveLocalSetting(key, data.value);
      return data.value as unknown as T;
    }
  } catch {
    try {
      const res = await fetchJson<T>(`${API_BASE}/settings/${encodeURIComponent(key)}`);
      if (res !== null && res !== undefined) {
        saveLocalSetting(key, res);
        return res;
      }
    } catch {
      // ignore
    }
    return getLocalSetting<T>(key, defaultValue !== undefined ? defaultValue : (null as unknown as T));
  }
};

export const saveAppSetting = async <T = any>(key: string, value: T): Promise<void> => {
  saveLocalSetting(key, value);
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    const { error } = await supabase.from('app_settings').upsert({
      key,
      value: strValue,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  } catch {
    try {
      await fetchJson(`${API_BASE}/settings/${encodeURIComponent(key)}`, {
        method: 'POST',
        body: JSON.stringify(value)
      });
    } catch {
      // Handled by local storage
    }
  }
};

export const deleteAppSetting = async (key: string): Promise<void> => {
  try {
    const { error } = await supabase.from('app_settings').delete().eq('key', key);
    if (error) throw error;
  } catch {
    try {
      await fetchJson(`${API_BASE}/settings/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
    } catch {
      // ignore
    }
  }
};

// ----------------------------------------------------
// BACKUP & RESET
// ----------------------------------------------------
export const fetchBackup = async (): Promise<Record<string, any[]>> => {
  try {
    return await fetchJson<Record<string, any[]>>(`${API_BASE}/backup`);
  } catch {
    return {
      students: getLocalStudents(),
      teachers: getLocalTeachers(),
      sessions: getLocalSessions(),
      convocations: getLocalConvocations(),
      evening_slots: getLocalEveningSlots(),
      staff_members: getLocalStaffMembers(),
      staff_attendance: getLocalStaffAttendance()
    };
  }
};

export const restoreBackup = async (data: Record<string, any[]>): Promise<void> => {
  // Always update local storage so data is restored immediately
  restoreBackupToLocalStorage(data);

  try {
    await fetchJson(`${API_BASE}/restore`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch {
    // If running on static host like Vercel without Express, local storage is the persistence layer
  }
};

export const resetDatabaseApi = async (type: 'calendar' | 'all'): Promise<void> => {
  if (type === 'all') {
    setLocalStudents([]);
    setLocalSessions([]);
    setLocalConvocations([]);
    setLocalEveningSlots([]);
    setLocalStaffMembers([]);
    setLocalStaffAttendance([]);
  } else if (type === 'calendar') {
    setLocalSessions([]);
    setLocalConvocations([]);
    setLocalEveningSlots([]);
  }

  try {
    await fetchJson(`${API_BASE}/reset`, {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  } catch {
    // Handled by local storage
  }
};
