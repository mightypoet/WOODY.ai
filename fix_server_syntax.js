import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace the duplicated }});
content = content.replace(/  \}\n\}\);\n  \}\n\}\);/g, "  }\n});");

fs.writeFileSync('server.ts', content);
