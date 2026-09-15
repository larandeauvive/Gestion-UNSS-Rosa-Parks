const fs = require('fs');
let content = fs.readFileSync('lib/firestore-mock.ts', 'utf8');

content = content.replace(/export function doc\(db: any, path: string, id\?: string\) \{[\s\S]*?return \{ path, id \};\n\}/, `
export function doc(dbOrCol: any, pathOrId?: string, id?: string) {
  if (dbOrCol && dbOrCol.path) { // it's a collection
    return { path: dbOrCol.path, id: pathOrId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) };
  }
  return { path: pathOrId, id };
}
`);

fs.writeFileSync('lib/firestore-mock.ts', content);
