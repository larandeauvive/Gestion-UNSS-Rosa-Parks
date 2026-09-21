import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch, setDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Student, PublicStudent } from "../types";

export const STUDENTS_COLLECTION = "students";
export const PUBLIC_DIRECTORY_COLLECTION = "public_students_directory";

export const addStudent = async (student: Omit<Student, "id">) => {
  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
    ...student,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Synchronisation du répertoire public (Nom, Prénom, Classe et Statuts pour information élève)
  try {
    await setDoc(doc(db, PUBLIC_DIRECTORY_COLLECTION, docRef.id), {
      lastName: student.lastName || '',
      firstName: student.firstName || '',
      schoolYear: student.schoolYear || '',
      classGroup: student.classGroup || '',
      paid: student.paid || 'NON',
      parentalAuth: student.parentalAuth || 'NON',
      swimmingCertificate: student.swimmingCertificate || 'NON',
      imageRights: student.imageRights || 'NON',
      licenseNumber: student.licenseNumber || ''
    });
  } catch (e) {
    console.error("Erreur sync répertoire public:", e);
  }

  return docRef.id;
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });

  // Mettre à jour le répertoire public si nom, prénom ou statuts modifiés
  const publicKeys: (keyof PublicStudent)[] = [
    'lastName', 'firstName', 'schoolYear', 'classGroup',
    'paid', 'parentalAuth', 'swimmingCertificate', 'imageRights', 'licenseNumber'
  ];
  const publicUpdate: Partial<PublicStudent> = {};
  let shouldUpdatePublic = false;
  for (const key of publicKeys) {
    if (data[key] !== undefined) {
      (publicUpdate as any)[key] = data[key];
      shouldUpdatePublic = true;
    }
  }
  if (shouldUpdatePublic) {
    try {
      await setDoc(doc(db, PUBLIC_DIRECTORY_COLLECTION, id), publicUpdate, { merge: true });
    } catch (e) {
      console.error("Erreur sync répertoire public:", e);
    }
  }
};

export const deleteStudent = async (id: string) => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  await deleteDoc(docRef);
  try {
    await deleteDoc(doc(db, PUBLIC_DIRECTORY_COLLECTION, id));
  } catch (e) {
    console.error("Erreur suppression répertoire public:", e);
  }
};

export const deleteMultipleStudents = async (ids: string[]) => {
  let batch = writeBatch(db);
  let count = 0;
  for (const id of ids) {
    batch.delete(doc(db, STUDENTS_COLLECTION, id));
    batch.delete(doc(db, PUBLIC_DIRECTORY_COLLECTION, id));
    count += 2;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
};

export const updateMultipleStudents = async (ids: string[], data: Partial<Student>) => {
  let batch = writeBatch(db);
  let count = 0;
  const publicKeys: (keyof PublicStudent)[] = [
    'lastName', 'firstName', 'schoolYear', 'classGroup',
    'paid', 'parentalAuth', 'swimmingCertificate', 'imageRights', 'licenseNumber'
  ];
  const publicUpdate: Partial<PublicStudent> = {};
  let hasPublicField = false;
  for (const key of publicKeys) {
    if (data[key] !== undefined) {
      (publicUpdate as any)[key] = data[key];
      hasPublicField = true;
    }
  }

  for (const id of ids) {
    batch.update(doc(db, STUDENTS_COLLECTION, id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    count++;

    if (hasPublicField) {
      batch.set(doc(db, PUBLIC_DIRECTORY_COLLECTION, id), publicUpdate, { merge: true });
      count++;
    }

    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
};

/**
 * Fonction de synchronisation globale assurant que chaque élève dispose de sa projection publique avec statuts
 */
export const syncAllToPublicDirectory = async (studentsList: Student[]) => {
  if (!studentsList || studentsList.length === 0) return;
  let batch = writeBatch(db);
  let count = 0;
  for (const s of studentsList) {
    if (!s.id) continue;
    batch.set(doc(db, PUBLIC_DIRECTORY_COLLECTION, s.id), {
      lastName: s.lastName || '',
      firstName: s.firstName || '',
      schoolYear: s.schoolYear || '',
      classGroup: s.classGroup || '',
      paid: s.paid || 'NON',
      parentalAuth: s.parentalAuth || 'NON',
      swimmingCertificate: s.swimmingCertificate || 'NON',
      imageRights: s.imageRights || 'NON',
      licenseNumber: s.licenseNumber || ''
    });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
};



