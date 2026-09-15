const fs = require('fs');
['components/SessionManager.tsx', 'components/ConvocationManager.tsx', 'components/CalendarView.tsx', 'components/TeacherManager.tsx', 'components/PublicEnrollment.tsx', 'components/ImportWizard.tsx', 'components/BackupManager.tsx', 'components/YearRolloverWizard.tsx', 'components/EditStudentModal.tsx'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = "import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where, getDoc, getDocs, writeBatch, setDoc, orderBy } from '../lib/firestore-mock';\nimport { db } from '../lib/firebase';\n" + content;
    fs.writeFileSync(file, content);
});
let appContent = fs.readFileSync('App.tsx', 'utf8');
appContent = "import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where, getDoc, getDocs, writeBatch, setDoc, orderBy } from './lib/firestore-mock';\nimport { db } from './lib/firebase';\n" + appContent;
fs.writeFileSync('App.tsx', appContent);
