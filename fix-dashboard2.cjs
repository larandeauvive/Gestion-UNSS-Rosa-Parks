const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');
content = content.replace(/const \{ convocations, sessions \} = useDatabase\(\);[\s\S]*?\.slice\(0, 3\);/, `
  const [recentConvocations, setRecentConvocations] = useState<Convocation[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  
  useEffect(() => {
    const qConvo = query(collection(db, 'convocations'), where('schoolYear', '==', activeYear));
    const unsubscribeConvo = onSnapshot(qConvo, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
      setRecentConvocations(data.slice(0, 3));
    });

    const qSession = query(collection(db, 'sessions'), where('schoolYear', '==', activeYear));
    const unsubscribeSession = onSnapshot(qSession, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setUpcomingSessions(data.slice(0, 3));
    });

    return () => {
      unsubscribeConvo();
      unsubscribeSession();
    };
  }, [activeYear]);
`);
fs.writeFileSync('components/Dashboard.tsx', content);
