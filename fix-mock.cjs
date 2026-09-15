const fs = require('fs');

let content = fs.readFileSync('lib/firestore-mock.ts', 'utf8');
content = content.replace(/export function writeBatch\(\) \{/, 'export function writeBatch(db?: any) {');
fs.writeFileSync('lib/firestore-mock.ts', content);
