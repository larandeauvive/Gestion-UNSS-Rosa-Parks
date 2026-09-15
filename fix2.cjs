const fs = require('fs');
let content = fs.readFileSync('components/SessionManager.tsx', 'utf8');

content = content.replace(/import \{ collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where \} from 'firebase\/firestore';/, '');
content = content.replace(/import \{ db \} from '\.\.\/lib\/firebase';/, "import { useDatabase } from '../hooks/useDatabase';");

content = content.replace(/const qTeachers = query\(collection\(db, 'teachers'\)\);[\s\S]*?unsubscribeSessions\(\);\n    \}\n  \}, \[activeYear\]\);/g, `
  const { sessions: allSessions, teachers, mutate } = useDatabase();
  const sessions = (allSessions || []).filter(s => s.schoolYear === activeYear).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
`);

content = content.replace(/const qTeachers = query\(collection\(db, 'teachers'\)\);[\s\S]*?const q = query\(collection\(db, 'sessions'\), where\('schoolYear', '==', activeYear\)\);[\s\S]*?return \(\) => \{[\s\S]*?unsubscribeTeachers\(\);[\s\S]*?unsubscribeSessions\(\);[\s\S]*?\};[\s\S]*?\}, \[activeYear\]\);/, `
  const { sessions: allSessions, teachers, mutate } = useDatabase();
  const sessions = (allSessions || []).filter(s => s.schoolYear === activeYear).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
`);


fs.writeFileSync('components/SessionManager.tsx', content);
