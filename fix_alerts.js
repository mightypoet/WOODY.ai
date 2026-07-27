import fs from 'fs';

let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

// Replace alerts
content = content.replace(/alert\(/g, 'console.log(');

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
