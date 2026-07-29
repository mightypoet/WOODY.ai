const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

const tables = ["'leads'", "'users'", "'sheets'", "'sheet_members'", "'clients'", "'projects'", "'tasks'", "'payments'", "'meetings'"];
const tablesStr = tables.join(" && table !== ");

content = content.replace(/table !== 'leads' && table !== 'users' && table !== 'sheets' && table !== 'sheet_members'/g, 
  "table !== 'leads' && table !== 'users' && table !== 'sheets' && table !== 'sheet_members' && table !== 'clients' && table !== 'projects' && table !== 'tasks' && table !== 'payments' && table !== 'meetings'");

fs.writeFileSync('src/services/dbService.ts', content);
