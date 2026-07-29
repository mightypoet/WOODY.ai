const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /return matches\[0\];/,
  "return { ...matches[0], role: 'admin' };"
);

fs.writeFileSync('src/App.tsx', content);
