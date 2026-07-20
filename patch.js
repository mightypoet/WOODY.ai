import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  /let textToSend = aiReply\.replace\(\/\\\\\{\[\\\\s\\\\S\]\*"actions"\[\\\\s\\\\S\]\*\?\\\\\}\/g, ''\)\.trim\(\);/,
  "let textToSend = aiReply.replace(/\\{[\\\\s\\\\S]*\"actions\"[\\\\s\\\\S]*?\\}/g, '').trim();"
);
fs.writeFileSync('server.ts', content);
