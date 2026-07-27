import fs from 'fs';
import os from 'os';

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /const DB_FILE = process\.env\.VERCEL \? '\/tmp\/data\.json' : path\.join\(process\.cwd\(\), 'data\.json'\);[\s\S]*?function readDB/m;

const replacement = `const tmpDir = require('os').tmpdir();
const DB_FILE = (process.env.NODE_ENV === 'production' || process.env.VERCEL) ? path.join(tmpDir, 'data.json') : path.join(process.cwd(), 'data.json');

function readDB`;

content = content.replace(regex, replacement);

fs.writeFileSync('server.ts', content);
