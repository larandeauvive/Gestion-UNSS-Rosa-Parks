const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');
if (!content.includes('import { collection')) {
  content = "import { collection, query, where, onSnapshot } from '../lib/firestore-mock';\nimport { db } from '../lib/firebase';\n" + content;
  fs.writeFileSync('components/Dashboard.tsx', content);
}
