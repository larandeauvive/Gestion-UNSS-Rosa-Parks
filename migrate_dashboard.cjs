const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');
content = content.replace(/import \{ collection, query, where, onSnapshot \} from 'firebase\/firestore';/, '');
content = content.replace(/import \{ db \} from '\.\.\/lib\/firebase';/, "import { useDatabase } from '../hooks/useDatabase';");
content = content.replace(/const \[recentConvocations, setRecentConvocations\] = useState<Convocation\[\]>\(\[\]\);[\s\S]*?\}, \[activeYear\]\);/, `
  const { convocations, sessions } = useDatabase();
  const recentConvocations = (convocations || []).filter(c => c.schoolYear === activeYear)
    .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
    .slice(0, 3);
  
  const upcomingSessions = (sessions || []).filter(s => s.schoolYear === activeYear)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
`);
fs.writeFileSync('components/Dashboard.tsx', content);
