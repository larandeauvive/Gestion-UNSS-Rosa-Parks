const fs = require('fs');

function replaceFirebaseInApp() {
  let content = fs.readFileSync('App.tsx', 'utf8');
  
  // Replace the Load Data from Firebase useEffect
  const loadDataRegex = /\/\/ Load Data from Firebase\s*useEffect\(\(\) => \{[\s\S]*?\}, \[isAuthenticated, activeYear\]\);/;
  content = content.replace(loadDataRegex, `
  const { students, loading: dbLoading, mutate } = useDatabase();

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(dbLoading);
    const sorted = [...students].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    if (sorted.length > 0) {
      const years = Array.from(new Set(sorted.map(s => s.schoolYear).filter(Boolean))).sort().reverse();
      if (years.length > 0 && !years.includes(activeYear)) {
        setActiveYear(years[0]);
      }
    }
  }, [students, isAuthenticated, dbLoading, activeYear]);
  `);

  // Replace settings logic
  content = content.replace(/const docRef = doc\(db, 'settings', 'general'\);[\s\S]*?fetchSettings\(\);\s*\}, \[\]\);/, '');
  content = content.replace(/await updateDoc\(doc\(db, 'settings', 'general'\), \{ teacherPassword: newPassword\.trim\(\) \}\);/, '');

  // Add mutate wrapper functions for backward compatibility in App.tsx
  content = content.replace(/const \[activeYear, setActiveYear\] = useState<string>\('2025-2026'\);/, `const [activeYear, setActiveYear] = useState<string>('2025-2026');
  
  const addStudent = async (student) => mutate({ collection: 'students', action: 'add', payload: student });
  const updateMultipleStudents = async (ids, payload) => mutate({ action: 'batch', operations: ids.map(id => ({ collection: 'students', action: 'update', id, payload })) });
  const deleteMultipleStudents = async (ids) => mutate({ action: 'batch', operations: ids.map(id => ({ collection: 'students', action: 'delete', id })) });
  `);

  // Clean up duplicate declarations since we inject 'students' from useDatabase now
  content = content.replace(/const \[students, setStudents\] = useState<Student\[\]>\(\[\]\);/, '');
  
  fs.writeFileSync('App.tsx', content);
}

replaceFirebaseInApp();
