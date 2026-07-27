import fs from 'fs';

let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

const newCode = `
const mockStorage: Record<string, any[]> = {};
const activeSubscriptions: Record<string, ((data: any[]) => void)[]> = {};

function notifySubscribers(table: string) {
  if (activeSubscriptions[table]) {
    dbService.list(table).then(data => {
      activeSubscriptions[table].forEach(cb => cb(data));
    }).catch(() => {
      activeSubscriptions[table].forEach(cb => cb([...(mockStorage[table] || [])]));
    });
  }
}

export const toUUID = (id: any) => {
  if (!id) return id;
  const str = String(id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return str;
  if (/^\d+$/.test(str)) {
    return \`00000000-0000-0000-0000-\${str.padStart(12, '0')}\`;
  }
  return id;
};

export const fromUUID = (uuid: any) => {
  if (!uuid) return uuid;
  const str = String(uuid);
  const match = str.match(/^00000000-0000-0000-0000-0*(\d+)$/);
  if (match) {
    return String(parseInt(match[1], 10));
  }
  return uuid;
};

// Simple fetch wrapper to handle our local backend DB API
const apiRequest = async (method: string, path: string, body?: any) => {
  try {
    const res = await fetch(\`/api/db\${path}\`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (error) {
    console.error(\`API request failed: \${method} \${path}\`, error);
    throw error;
  }
};

export const dbService = {
  async create(table: string, data: any) {
    try {
      const payload = { ...data };
      if (!payload.createdAt) {
        payload.createdAt = new Date().toISOString();
      }

      let finalPayload = { ...payload };
      if (table === 'leads') { delete finalPayload.calendar_synced; delete finalPayload.lastContactDate; delete finalPayload.nextStep; }
      
      const insertedData = await apiRequest('POST', \`/\${table}\`, finalPayload);
      
      if (!mockStorage[table]) mockStorage[table] = [];
      mockStorage[table] = [...mockStorage[table], insertedData];
      notifySubscribers(table);
      
      return insertedData.id;
    } catch (error) {
      console.error(\`Create error in \${table}:\`, error);
      // Fallback
      if (!mockStorage[table]) mockStorage[table] = [];
      const mockId = data.id || crypto.randomUUID();
      const newRecord = { ...data, id: mockId, createdAt: new Date().toISOString() };
      mockStorage[table].push(newRecord);
      notifySubscribers(table);
      return mockId;
    }
  },

  async set(table: string, id: string, data: any) {
    return this.update(table, id, data);
  },

  async update(table: string, id: string, data: any) {
    try {
      const payload = { ...data };
      let finalPayload = { ...payload };
      if (table === 'leads') { delete finalPayload.calendar_synced; delete finalPayload.lastContactDate; delete finalPayload.nextStep; }

      await apiRequest('PUT', \`/\${table}/\${id}\`, finalPayload);
      
      notifySubscribers(table);
    } catch (error) {
      console.error(\`Update error in \${table}/\${id}:\`, error);
      if (!mockStorage[table]) mockStorage[table] = [];
      const existingIndex = mockStorage[table].findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        mockStorage[table][existingIndex] = { ...mockStorage[table][existingIndex], ...data };
        notifySubscribers(table);
      }
    }
  },

  async get(table: string, id: string) {
    try {
      return await apiRequest('GET', \`/\${table}/\${id}\`);
    } catch (error) {
      if (mockStorage[table]) {
         const mockItem = mockStorage[table].find(item => item.id === id);
         if (mockItem) return { ...mockItem };
      }
      return null;
    }
  },

  async list(table: string, filters?: { field: string, operator: string, value: any }[]) {
    try {
      let result = await apiRequest('GET', \`/\${table}\`);
      
      if (filters && result.length > 0) {
        result = result.filter((item: any) => {
          return filters.every(f => {
            if (f.operator === '==') return item[f.field] === f.value;
            if (f.operator === '!=') return item[f.field] !== f.value;
            if (f.operator === '>') return item[f.field] > f.value;
            if (f.operator === '<') return item[f.field] < f.value;
            if (f.operator === '>=') return item[f.field] >= f.value;
            if (f.operator === '<=') return item[f.field] <= f.value;
            if (f.operator === 'in') return Array.isArray(f.value) && f.value.includes(item[f.field]);
            return true;
          });
        });
      }
      
      return result;
    } catch (error) {
      console.error(\`List error in \${table}:\`, error);
      return mockStorage[table] ? [...mockStorage[table]] : [];
    }
  },

  async delete(table: string, id: string) {
    try {
      await apiRequest('DELETE', \`/\${table}/\${id}\`);
      notifySubscribers(table);
    } catch (error) {
      console.error(\`Delete error in \${table}/\${id}:\`, error);
      if (mockStorage[table]) {
        mockStorage[table] = mockStorage[table].filter(item => item.id !== id);
        notifySubscribers(table);
      }
    }
  },

  subscribe(table: string, callback: (data: any[]) => void, filters?: { field: string, operator: string, value: any }[]) {
    if (!activeSubscriptions[table]) activeSubscriptions[table] = [];
    
    const wrappedCallback = (realData: any[]) => {
      callback(realData);
    };
    
    activeSubscriptions[table].push(wrappedCallback);
    this.list(table, filters).then(wrappedCallback).catch(() => wrappedCallback([]));
    
    // Polling simulation for realtime
    const interval = setInterval(() => {
      this.list(table, filters).then(data => {
        if (activeSubscriptions[table].includes(wrappedCallback)) {
          wrappedCallback(data);
        }
      });
    }, 5000);
    
    return () => {
      activeSubscriptions[table] = activeSubscriptions[table].filter(cb => cb !== wrappedCallback);
      clearInterval(interval);
    };
  }
};
`;

content = content.replace(/const mockStorage: Record[\s\S]*/, newCode);
fs.writeFileSync('src/services/dbService.ts', content);
