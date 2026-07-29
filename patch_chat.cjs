const fs = require('fs');
let content = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

content = content.replace(
  /\`Failed to execute \$\{action\.type\}: \$\{e instanceof Error \? e\.message : "Unknown error"\}\`,/,
  `\`Failed to execute \${action.type}: \${e instanceof Error ? (e.message.startsWith('{') ? JSON.parse(e.message).error : e.message) : "Unknown error"}\`,`
);

fs.writeFileSync('src/components/ChatInterface.tsx', content);
