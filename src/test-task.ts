import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const env: any = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key) env[key] = val;
});
(globalThis as any).import = { meta: { env: env } };
import { dbService } from './services/dbService';

console.log("Testing task creation");
dbService.create('tasks', { title: 'Test Task', priority: 'medium', projectId: '00000000-0000-0000-0000-000000000000', assigneeId: '00000000-0000-0000-0000-000000000000', status: 'todo' })
  .then(res => console.log("Success:", res))
  .catch(err => console.error("TEST SCRIPT ERROR:", err));
