const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/const docRef = doc\(db, 'students', id\);\s*await updateDoc\(docRef, \{ opussChecked: checked \}\);/, `
      await updateMultipleStudents([id], { opussChecked: checked });
`);

fs.writeFileSync('App.tsx', content);
