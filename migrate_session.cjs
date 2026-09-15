const fs = require('fs');
let content = fs.readFileSync('components/SessionManager.tsx', 'utf8');
content = content.replace(/import \{ collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where \} from 'firebase\/firestore';/, '');
content = content.replace(/import \{ db \} from '\.\.\/lib\/firebase';/, "import { useDatabase } from '../hooks/useDatabase';");
content = content.replace(/const \[sessions, setSessions\] = useState<Session\[\]>\(\[\]\);/, '');
content = content.replace(/const \[teachers, setTeachers\] = useState<Teacher\[\]>\(\[\]\);/, '');

// Replace useEffect for loading data
content = content.replace(/useEffect\(\(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?unsubscribeTeachers\(\);[\s\S]*?unsubscribeSessions\(\);[\s\S]*?\};[\s\S]*?\}, \[activeYear\]\);/, `
  const { sessions: allSessions, teachers, mutate } = useDatabase();
  const sessions = (allSessions || []).filter(s => s.schoolYear === activeYear).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
`);

// Replace addDoc
content = content.replace(/const docRef = await addDoc\(collection\(db, 'sessions'\), \{[\s\S]*?\}\);/g, `
      await mutate({ collection: 'sessions', action: 'add', payload: {
        ...newSession,
        schoolYear: activeYear,
        enrolledStudentIds: [],
        presentStudentIds: [],
        requireLicense: newSession.requireLicense || false
      }});
      const docRef = { id: 'temp' }; // Mock for success
`);

// Replace updateDoc
content = content.replace(/await updateDoc\(doc\(db, 'sessions', editingSession.id\), \{[\s\S]*?\}\);/g, `
      await mutate({ collection: 'sessions', action: 'update', id: editingSession.id, payload: {
        date: newSession.date,
        time: newSession.time,
        endTime: newSession.endTime,
        location: newSession.location,
        name: newSession.name,
        teacherIds: newSession.teacherIds,
        needSnack: newSession.needSnack,
        description: newSession.description,
        requireLicense: newSession.requireLicense,
        maxParticipants: newSession.maxParticipants,
        targetAudience: newSession.targetAudience,
        meetingTime: newSession.meetingTime,
        meetingLocation: newSession.meetingLocation,
        cafeteriaTime: newSession.cafeteriaTime,
        returnTime: newSession.returnTime,
        registrationOpenDate: newSession.registrationOpenDate,
        registrationCloseDate: newSession.registrationCloseDate
      }});
`);
content = content.replace(/await updateDoc\(doc\(db, 'sessions', selectedSession\.id\), \{[\s\S]*?enrolledStudentIds: newEnrolled[\s\S]*?\}\);/g, `await mutate({ collection: 'sessions', action: 'update', id: selectedSession.id, payload: { enrolledStudentIds: newEnrolled } });`);
content = content.replace(/await updateDoc\(doc\(db, 'sessions', selectedSession\.id\), \{[\s\S]*?presentStudentIds: newPresent[\s\S]*?\}\);/g, `await mutate({ collection: 'sessions', action: 'update', id: selectedSession.id, payload: { presentStudentIds: newPresent } });`);

// Replace deleteDoc
content = content.replace(/await deleteDoc\(doc\(db, 'sessions', id\)\);/g, `await mutate({ collection: 'sessions', action: 'delete', id });`);

fs.writeFileSync('components/SessionManager.tsx', content);
