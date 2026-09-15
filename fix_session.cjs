const fs = require('fs');
let content = fs.readFileSync('components/SessionManager.tsx', 'utf8');

// The loading useEffect didn't match perfectly. Let's find it.
content = content.replace(/useEffect\(\(\) => \{[\s\S]*?unsubscribeSessions\(\);\s*\}\s*\}, \[activeYear\]\);/, `
  const { sessions: allSessions, teachers, mutate } = useDatabase();
  const sessions = (allSessions || []).filter(s => s.schoolYear === activeYear).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
`);

content = content.replace(/await deleteDoc\(doc\(db, 'sessions', sessionToDelete\)\);/, "await mutate({ collection: 'sessions', action: 'delete', id: sessionToDelete });");

content = content.replace(/await updateDoc\(doc\(db, 'sessions', activeSession.id\), \{\s*enrolledStudentIds: newEnrolled\s*\}\);/g, "await mutate({ collection: 'sessions', action: 'update', id: activeSession.id, payload: { enrolledStudentIds: newEnrolled } });");

content = content.replace(/await updateDoc\(doc\(db, 'convocations', activeSession.convocationId\), \{\s*studentIds: newEnrolled\s*\}\);/g, "await mutate({ collection: 'convocations', action: 'update', id: activeSession.convocationId, payload: { studentIds: newEnrolled } });");

content = content.replace(/await updateDoc\(doc\(db, 'sessions', activeSession.id\), \{\s*presentStudentIds: newPresent\s*\}\);/g, "await mutate({ collection: 'sessions', action: 'update', id: activeSession.id, payload: { presentStudentIds: newPresent } });");

fs.writeFileSync('components/SessionManager.tsx', content);
