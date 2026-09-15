const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{.*?\} from 'firebase\/firestore';/g, '');
  content = content.replace(/import \{ db \} from '.*?firebase';/g, "import { useDatabase } from '../hooks/useDatabase';");
  fs.writeFileSync(file, content);
}

['components/SessionManager.tsx', 'components/ConvocationManager.tsx', 'components/CalendarView.tsx', 'components/TeacherManager.tsx', 'components/PublicEnrollment.tsx', 'components/ImportWizard.tsx', 'components/BackupManager.tsx', 'components/YearRolloverWizard.tsx', 'components/EditStudentModal.tsx'].forEach(fixFile);
