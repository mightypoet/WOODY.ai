import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.put\("\/api\/db\/:table\/:id", \(req, res\) => \{[\s\S]*?\}\);/m;

const replacement = `app.put("/api/db/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const index = db[table].findIndex(i => i.id === req.params.id);
  if (index >= 0) {
    db[table][index] = { ...db[table][index], ...req.body };
    writeDB(db);
    res.json(db[table][index]);
  } else {
    const newItem = { ...req.body, id: req.params.id };
    db[table].push(newItem);
    writeDB(db);
    res.json(newItem);
  }
});`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content);
