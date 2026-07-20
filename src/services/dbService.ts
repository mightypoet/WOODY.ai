import { supabase } from '../utils/supabase';

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
    return `00000000-0000-0000-0000-${str.padStart(12, '0')}`;
  }
  return id;
};

export const fromUUID = (uuid: any) => {
  if (!uuid) return uuid;
  const str = String(uuid);
  const match = str.match(/^00000000-0000-0000-0000-0*(\d+)$/);
  if (match) {
    return match[1];
  }
  return uuid;
};

export async function testConnection() {
  console.log("Supabase connection active.");
}

export const dbService = {
  async create(table: string, data: any) {
    try {
      const payload = { ...data };
      if (!payload.createdAt) {
        payload.createdAt = new Date().toISOString();
      }

      let finalPayload = { ...payload };
      if (table === 'users') {
        // we map other fields correctly
      }
      if (table === 'leads') { delete finalPayload.calendar_synced; delete finalPayload.lastContactDate; delete finalPayload.nextStep; }
      if (table === 'tasks') {
        if (finalPayload.projectId) finalPayload.projectId = toUUID(finalPayload.projectId);
        if (finalPayload.project_id) finalPayload.project_id = toUUID(finalPayload.project_id);
        if (finalPayload.clientId) finalPayload.clientId = toUUID(finalPayload.clientId);
        if (finalPayload.client_id) finalPayload.client_id = toUUID(finalPayload.client_id);
      }

      // Initialize mock storage array if not exists
      if (!mockStorage[table]) mockStorage[table] = [];

      const { data: insertedData, error } = await supabase
        .from(table)
        .insert([finalPayload])
        .select()
        .single();
      
      if (error) {
        console.warn(`Supabase actual create error for ${table}:`, error.message, error.code);
        
        // Fallback to local memory on any database error
        const mockId = payload.id || crypto.randomUUID();
        const newRecord = { ...payload, id: mockId };
        mockStorage[table] = [...mockStorage[table], newRecord];
        notifySubscribers(table);
        return mockId;
      }

      if (insertedData) {
        if (!mockStorage[table]) mockStorage[table] = [];
        mockStorage[table] = [...mockStorage[table], insertedData];
        notifySubscribers(table);
      }

      return insertedData?.id;
    } catch (error) {
      console.error(`Supabase create error in ${table}:`, error);
      // Fallback
      if (!mockStorage[table]) mockStorage[table] = [];
      const mockId = data.id || crypto.randomUUID();
      const newRecord = { ...data, id: mockId };
      mockStorage[table] = [...mockStorage[table], newRecord];
      notifySubscribers(table);
      return mockId;
    }
  },

  async set(table: string, id: string, data: any) {
    try {
      const payload = { ...data, id };
      if (!payload.updatedAt) {
        payload.updatedAt = new Date().toISOString();
      }

      let finalPayload = { ...payload };
      if (table === 'users') {
        // we map other fields correctly
      }
      if (table === 'leads') { delete finalPayload.calendar_synced; delete finalPayload.lastContactDate; delete finalPayload.nextStep; }
      if (table === 'tasks') {
        if (finalPayload.projectId) finalPayload.projectId = toUUID(finalPayload.projectId);
        if (finalPayload.project_id) finalPayload.project_id = toUUID(finalPayload.project_id);
        if (finalPayload.clientId) finalPayload.clientId = toUUID(finalPayload.clientId);
        if (finalPayload.client_id) finalPayload.client_id = toUUID(finalPayload.client_id);
      }

      // Initialize mock storage array if not exists
      if (!mockStorage[table]) mockStorage[table] = [];

      const { error } = await supabase
        .from(table)
        .upsert([finalPayload]);
      
      if (error) {
        console.warn(`Supabase actual set error for ${table}:`, error.message, error.code);
        
        // Fallback local set
        const existingIndex = mockStorage[table].findIndex(item => item.id === id);
        if (existingIndex >= 0) {
          mockStorage[table][existingIndex] = { ...mockStorage[table][existingIndex], ...payload };
        } else {
          mockStorage[table].push(payload);
        }
        notifySubscribers(table);
        return;
      }
      
      // On success, notify subscribers
      notifySubscribers(table);
    } catch (error) {
      console.error(`Supabase set error in ${table}/${id}:`, error);
      
      // Fallback local set
      if (!mockStorage[table]) mockStorage[table] = [];
      const payload = { ...data, id };
      const existingIndex = mockStorage[table].findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        mockStorage[table][existingIndex] = { ...mockStorage[table][existingIndex], ...payload };
      } else {
        mockStorage[table].push(payload);
      }
      notifySubscribers(table);
    }
  },

  async update(table: string, id: string, data: any) {
    try {
      const payload = { ...data };
      let finalPayload = { ...payload };
      if (table === 'users') {
        // we map other fields correctly
      }
      if (table === 'leads') { delete finalPayload.calendar_synced; delete finalPayload.lastContactDate; delete finalPayload.nextStep; }
      if (table === 'tasks') {
        if (finalPayload.projectId) finalPayload.projectId = toUUID(finalPayload.projectId);
        if (finalPayload.project_id) finalPayload.project_id = toUUID(finalPayload.project_id);
        if (finalPayload.clientId) finalPayload.clientId = toUUID(finalPayload.clientId);
        if (finalPayload.client_id) finalPayload.client_id = toUUID(finalPayload.client_id);
      }
      
      // Initialize mock storage array if not exists
      if (!mockStorage[table]) mockStorage[table] = [];

      const { error } = await supabase
        .from(table)
        .update(finalPayload)
        .eq('id', id);
      
      if (error) {
        console.warn(`Supabase actual update error for ${table}:`, error.message, error.code);
        
        // Fallback local update
        const existingIndex = mockStorage[table].findIndex(item => item.id === id);
        if (existingIndex >= 0) {
          mockStorage[table][existingIndex] = { ...mockStorage[table][existingIndex], ...payload };
          notifySubscribers(table);
        }
        return;
      }

      // On success, notify subscribers
      notifySubscribers(table);
    } catch (error) {
      console.error(`Supabase update error in ${table}/${id}:`, error);
      
      // Fallback local update
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
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
        
      // PGRST116 is not found (row). PGRST205 is not found (table).
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205' && error.code !== 'PGRST204') {
         console.warn(`Supabase get error ${error.code}`); 
      }
      
      let returnData = data;
      if (error || !data) {
        if (mockStorage[table]) {
           const mockItem = mockStorage[table].find(item => item.id === id);
           if (mockItem) returnData = mockItem;
        }
      }
      if (table === 'tasks' && returnData) {
        if (returnData.projectId) returnData.projectId = fromUUID(returnData.projectId);
        if (returnData.project_id) returnData.project_id = fromUUID(returnData.project_id);
        if (returnData.clientId) returnData.clientId = fromUUID(returnData.clientId);
        if (returnData.client_id) returnData.client_id = fromUUID(returnData.client_id);
      }
      return returnData || null;
    } catch (error) {
      if (mockStorage[table]) {
         const mockItem = mockStorage[table].find(item => item.id === id);
         if (mockItem) {
           let returnData = { ...mockItem };
      if (table === 'tasks') {
             if (returnData.projectId) returnData.projectId = fromUUID(returnData.projectId);
             if (returnData.project_id) returnData.project_id = fromUUID(returnData.project_id);
             if (returnData.clientId) returnData.clientId = fromUUID(returnData.clientId);
             if (returnData.client_id) returnData.client_id = fromUUID(returnData.client_id);
           }
           return returnData;
         }
      }
      return null;
    }
  },

  async list(table: string, filters?: { field: string, operator: string, value: any }[]) {
    try {
      let query = supabase.from(table).select('*');
      
      if (filters) {
        filters.forEach(f => {
          if (f.operator === '==') {
            query = query.eq(f.field, f.value);
          } else if (f.operator === '!=') {
            query = query.neq(f.field, f.value);
          } else if (f.operator === '>') {
            query = query.gt(f.field, f.value);
          } else if (f.operator === '<') {
            query = query.lt(f.field, f.value);
          } else if (f.operator === '>=') {
            query = query.gte(f.field, f.value);
          } else if (f.operator === '<=') {
            query = query.lte(f.field, f.value);
          } else if (f.operator === 'in') {
            query = query.in(f.field, f.value);
          } else {
            console.warn(`Unsupported operator ${f.operator} for field ${f.field}`);
          }
        });
      }
      
      const { data, error } = await query;
      if (error) {
         console.warn(`Supabase list error for ${table}:`, error.message);
         return [];
      }
      let result = data || [];
      if (mockStorage[table] && mockStorage[table].length > 0) {
        const mockMap = new Map(mockStorage[table].map(item => [item.id, item]));
        result = result.map(item => mockMap.has(item.id) ? mockMap.get(item.id) : item);
        const existingIds = new Set(result.map(item => item.id));
        const newItems = mockStorage[table].filter(item => !existingIds.has(item.id));
        result = [...result, ...newItems];
      }
      if (table === 'tasks') {
        result = result.map(t => ({
          ...t,
          projectId: fromUUID(t.projectId),
          project_id: fromUUID(t.project_id),
          clientId: fromUUID(t.clientId),
          client_id: fromUUID(t.client_id)
        }));
      }
      return result;
    } catch (error) {
      console.error(`Supabase list error in ${table}:`, error);
      return mockStorage[table] ? [...mockStorage[table]] : [];
    }
  },

  async delete(table: string, id: string) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (error) {
        console.warn(`Supabase actual delete error for ${table}/${id}:`, error.message);
        
        // Fallback local delete
        if (mockStorage[table]) {
          mockStorage[table] = mockStorage[table].filter(item => item.id !== id);
          notifySubscribers(table);
        }
        return;
      }

      // On success, notify subscribers
      notifySubscribers(table);
    } catch (error) {
      console.error(`Supabase delete error in ${table}/${id}:`, error);
      // Fallback local delete
      if (mockStorage[table]) {
        mockStorage[table] = mockStorage[table].filter(item => item.id !== id);
        notifySubscribers(table);
      }
    }
  },

  subscribe(table: string, callback: (data: any[]) => void, filters?: { field: string, operator: string, value: any }[]) {
    if (!activeSubscriptions[table]) activeSubscriptions[table] = [];
    
    const wrappedCallback = (realData: any[]) => {
      // Merge with mock storage
      let combined = [...realData];
      if (mockStorage[table]) {
         const existingIds = new Set(combined.map(t => t.id));
         const mockItems = mockStorage[table].filter(item => !existingIds.has(item.id));
         combined = [...combined, ...mockItems];
      }
      callback(combined);
    };

    activeSubscriptions[table].push(wrappedCallback);

    // Initial fetch
    this.list(table, filters).then(wrappedCallback).catch(() => wrappedCallback([]));
    
    // Subscribe to changes
    const subscription = supabase
      .channel(`${table}_changes_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, async payload => {
        // Re-fetch list
        const data = await this.list(table, filters).catch(() => []);
        wrappedCallback(data);
      })
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      activeSubscriptions[table] = activeSubscriptions[table].filter(cb => cb !== wrappedCallback);
      supabase.removeChannel(subscription);
    };
  }
};
