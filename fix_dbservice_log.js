import fs from 'fs';

let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

const regex = /const apiRequest = async \(method: string, path: string, body\?: any\) => \{[\s\S]*?\};/m;

const replacement = `const apiRequest = async (method: string, path: string, body?: any) => {
  try {
    const res = await fetch(\`/api/db\${path}\`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error("Not found");
      throw new Error("API error: " + res.status);
    }
    return await res.json();
  } catch (error: any) {
    if (error.message !== "Not found") {
      console.error(\`API request failed: \${method} \${path}\`, error);
    }
    throw error;
  }
};`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/services/dbService.ts', content);
