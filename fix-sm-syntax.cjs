const fs = require('fs');
let content = fs.readFileSync('components/SessionManager.tsx', 'utf8');

// The file got messed up at the top
// I will just rebuild the top part correctly.

const goodTop = `import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where, getDoc, getDocs, writeBatch, setDoc, orderBy } from '../lib/firestore-mock';
import { db } from '../lib/firebase';
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Session } from '../types';
import { PlusCircle, Calendar, Trash2, CheckCircle2, Circle, Users, Save, Link2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface SessionManagerProps {
  students: Student[];
  activeYear: string;
}

export function SessionManager({ students, activeYear }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [formData, setFormData] = useState<Partial<Session>>({
    date: new Date().toISOString().split('T')[0],
    time: '13:30',
    requireLicense: false,
    teacherIds: []
  });

  const [editingSession, setEditingSession] = useState<Session | null>(null);

  useEffect(() => {
    const qTeachers = query(collection(db, 'teachers'));
    const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot: any) => {
      const data: any[] = [];
      snapshot.forEach((doc: any) => data.push({ id: doc.id, ...doc.data() }));
      setTeachers(data);
    });

    const q = query(collection(db, 'sessions'), where('schoolYear', '==', activeYear));
    const unsubscribeSessions = onSnapshot(q, (snapshot: any) => {
      const data: any[] = [];
      snapshot.forEach((doc: any) => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(data);
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeSessions();
    };
  }, [activeYear]);
`;

// Now find where the methods start, e.g., `const newSession = {` or something
let idx = content.indexOf('  const handleCreate = async () => {');
if (idx === -1) idx = content.indexOf('const handleCreate');

content = goodTop + '\n' + content.substring(idx);

fs.writeFileSync('components/SessionManager.tsx', content);
