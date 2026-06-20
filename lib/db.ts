import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Student } from "../types";

export const STUDENTS_COLLECTION = "students";

export const addStudent = async (student: Omit<Student, "id">) => {
  return await addDoc(collection(db, STUDENTS_COLLECTION), student);
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  return await updateDoc(docRef, data);
};

export const deleteStudent = async (id: string) => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  return await deleteDoc(docRef);
};

export const deleteMultipleStudents = async (ids: string[]) => {
  const batch = writeBatch(db);
  ids.forEach(id => {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    batch.delete(docRef);
  });
  return await batch.commit();
};

export const updateMultipleStudents = async (ids: string[], data: Partial<Student>) => {
  const batch = writeBatch(db);
  ids.forEach(id => {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    batch.update(docRef, data);
  });
  return await batch.commit();
};
