import fs from 'fs';
let code = fs.readFileSync('src/services/dbService.ts', 'utf-8');
code = code.replace(
  'let result = data || [];\n      if (table === \'tasks\') {',
  `let result = data || [];
      if (mockStorage[table] && mockStorage[table].length > 0) {
        const mockMap = new Map(mockStorage[table].map(item => [item.id, item]));
        result = result.map(item => mockMap.has(item.id) ? mockMap.get(item.id) : item);
        const existingIds = new Set(result.map(item => item.id));
        const newItems = mockStorage[table].filter(item => !existingIds.has(item.id));
        result = [...result, ...newItems];
      }
      if (table === 'tasks') {`
);
fs.writeFileSync('src/services/dbService.ts', code);
