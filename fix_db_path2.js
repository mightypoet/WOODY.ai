import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/\/api\/data/g, '/api/store');
fs.writeFileSync('server.ts', content);

let dbContent = fs.readFileSync('src/services/dbService.ts', 'utf8');
dbContent = dbContent.replace(/\/api\/data/g, '/api/store');
fs.writeFileSync('src/services/dbService.ts', dbContent);
