const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "app.listen(PORT, '0.0.0.0', () => {\n    console.log(`Server running on port ${PORT}`);\n  });",
  "if (process.env.NODE_ENV !== 'production' || process.env.RENDER || process.env.CLOUD_RUN) {\n    app.listen(PORT, '0.0.0.0', () => {\n      console.log(`Server running on port ${PORT}`);\n    });\n  }\n  return app;"
);

// We need to export it. Wait, startServer() is called immediately.
// We should just export app!

