import { Student } from "../types";

export const STUDENTS_COLLECTION = "students";

async function fetchApi(action: string, payload: any) {
  const res = await fetch('/api/db/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update database");
  return await res.json();
}

export const addStudent = async (student: Omit<Student, "id">) => {
  return await fetchApi('mutate', { collection: STUDENTS_COLLECTION, action: 'add', payload: student });
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  return await fetchApi('mutate', { collection: STUDENTS_COLLECTION, action: 'update', id, payload: data });
};

export const deleteStudent = async (id: string) => {
  return await fetchApi('mutate', { collection: STUDENTS_COLLECTION, action: 'delete', id });
};

export const deleteMultipleStudents = async (ids: string[]) => {
  const operations = ids.map(id => ({ collection: STUDENTS_COLLECTION, action: 'delete', id }));
  return await fetchApi('mutate', { action: 'batch', operations });
};

export const updateMultipleStudents = async (ids: string[], data: Partial<Student>) => {
  const operations = ids.map(id => ({ collection: STUDENTS_COLLECTION, action: 'update', id, payload: data }));
  return await fetchApi('mutate', { action: 'batch', operations });
};

