const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /if \(error\) {\s*if \(error\.code === '42501'\) {\s*throw new Error\('Supabase RLS Error: You do not have permission to insert rows\. Please check your Row Level Security policies in Supabase\.'\);\s*}\s*throw error;\s*}/,
  `if (error) {
        if (error.code === '42501') {
          throw new Error(JSON.stringify({ status: 403, error: 'Supabase RLS Error: Permission denied' }));
        }
        throw new Error(JSON.stringify({ status: 500, error: error.message || 'Database insertion failed' }));
      }`
);

fs.writeFileSync('src/services/dbService.ts', content);
