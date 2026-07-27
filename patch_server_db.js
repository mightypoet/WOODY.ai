import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const dbApiCode = `
// Basic JSON Database for persistence
const DB_FILE = path.join(process.cwd(), 'data.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error("Failed to read DB:", e);
    return {};
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get("/api/db/:table", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  res.json(db[table] || []);
});

app.get("/api/db/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  const items = db[table] || [];
  const item = items.find(i => i.id === req.params.id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.post("/api/db/:table", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const newItem = { ...req.body };
  if (!newItem.id) {
    newItem.id = require('crypto').randomUUID();
  }
  
  db[table].push(newItem);
  writeDB(db);
  res.json(newItem);
});

app.put("/api/db/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const index = db[table].findIndex(i => i.id === req.params.id);
  if (index >= 0) {
    db[table][index] = { ...db[table][index], ...req.body };
    writeDB(db);
    res.json(db[table][index]);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete("/api/db/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const initialLength = db[table].length;
  db[table] = db[table].filter(i => i.id !== req.params.id);
  
  if (db[table].length < initialLength) {
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Not found" });
  }
});
`;

content = content.replace('// Telegram Long Polling', dbApiCode + '\n// Telegram Long Polling');

fs.writeFileSync('server.ts', content);
