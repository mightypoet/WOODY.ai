import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /const tmpDir = require\('os'\)\.tmpdir\(\);/;

const replacement = `import os from 'os';\nconst tmpDir = os.tmpdir();`;

content = content.replace(regex, replacement);

fs.writeFileSync('server.ts', content);
