import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Student } from "../types";

export const STUDENTS_COLLECTION = "students";

export const addStudent = async (student: Omit<Student, "id">) => {
  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
    ...student,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const deleteStudent = async (id: string) => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const deleteMultipleStudents = async (ids: string[]) => {
  let batch = writeBatch(db);
  let count = 0;
  for (const id of ids) {
    batch.delete(doc(db, STUDENTS_COLLECTION, id));
    count++;
    if (count % 450 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 450 !== 0) {
    await batch.commit();
  }
};

export const updateMultipleStudents = async (ids: string[], data: Partial<Student>) => {
  let batch = writeBatch(db);
  let count = 0;
  for (const id of ids) {
    batch.update(doc(db, STUDENTS_COLLECTION, id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    count++;
    if (count % 450 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 450 !== 0) {
    await batch.commit();
  }
};


