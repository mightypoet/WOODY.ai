const fs = require('fs');
let content = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

content = content.replace(
  `status: action.payload.stage || "New",\n              createdAt: now,`,
  `status: action.payload.stage || "New"`
);

fs.writeFileSync('src/components/ChatInterface.tsx', content);
