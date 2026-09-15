const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/useEffect\(\(\) => \{\n    const fetchSettings = async \(\) => \{\n      try \{\n          const handleUpdatePassword = async \(\) => \{/, `
  const handleUpdatePassword = async () => {
`);

fs.writeFileSync('App.tsx', content);
