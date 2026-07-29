const fs = require('fs');
let content = fs.readFileSync('src/services/aiService.ts', 'utf8');

content = content.replace(
  /\* Extract Available Fields: Always extract name, email, phone, company\/brand, estimated_value, source, and stage\./,
  '* Extract Available Fields: Always extract name, email, phone, company/brand, estimated_value, source, stage, and sheet or sheet_name (e.g. identify if the user mentions a specific sheet/workspace like ADSPEX).'
);

content = content.replace(
  /"amount_received": 0\n}/,
  '"amount_received": 0,\n  "sheet_name": "string"\n}'
);

content = content.replace(
  /"stage": "string"\n}/,
  '"stage": "string",\n  "sheet_name": "string"\n}'
);

fs.writeFileSync('src/services/aiService.ts', content);
