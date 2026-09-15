const fs = require('fs');
let content = fs.readFileSync('components/SessionManager.tsx', 'utf8');
content = content.replace(/export function SessionManager.*?\{/, `export function SessionManager({ students, activeYear }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
`);

// Revert the useEffect logic back to firebase onSnapshot logic, using the mock!
content = content.replace(/const \{ sessions: allSessions, teachers, mutate \} = useDatabase\(\);[\s\S]*?const sessions = \(allSessions || \[\]\)\.filter\(s => s\.schoolYear === activeYear\)\.sort\(\(a, b\) => new Date\(b\.date\)\.getTime\(\) - new Date\(a\.date\)\.getTime\(\)\);/, `
  useEffect(() => {
    const qTeachers = query(collection(db, 'teachers'));
    const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setTeachers(data);
    });

    const q = query(collection(db, 'sessions'), where('schoolYear', '==', activeYear));
    const unsubscribeSessions = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(data);
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeSessions();
    };
  }, [activeYear]);
`);

// Replace mutate add with addDoc
content = content.replace(/await mutate\(\{ collection: 'sessions', action: 'add', payload: \{[\s\S]*?\}\}\);[\s\S]*?const docRef = \{ id: 'temp' \};/g, `
      const docRef = await addDoc(collection(db, 'sessions'), {
        ...newSession,
        schoolYear: activeYear,
        enrolledStudentIds: [],
        presentStudentIds: [],
        requireLicense: newSession.requireLicense || false
      });
`);

content = content.replace(/await mutate\(\{ collection: 'sessions', action: 'update', id: editingSession.id, payload: \{[\s\S]*?\}\}\);/g, `
      await updateDoc(doc(db, 'sessions', editingSession.id), {
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
      });
`);

content = content.replace(/await mutate\(\{ collection: 'sessions', action: 'delete', id: sessionToDelete \}\);/g, `await deleteDoc(doc(db, 'sessions', sessionToDelete));`);

fs.writeFileSync('components/SessionManager.tsx', content);
