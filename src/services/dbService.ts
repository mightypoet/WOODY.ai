import { supabase } from '../utils/supabase';

export const toUUID = (id: any) => {
  if (!id) return id;
  const str = String(id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return str;
  if (/^d+$/.test(str)) {
    return `00000000-0000-0000-0000-${str.padStart(12, '0')}`;
  }
  return id;
};

export const fromUUID = (uuid: any) => {
  if (!uuid) return uuid;
  const str = String(uuid);
  const match = str.match(/^00000000-0000-0000-0000-0*(d+)$/);
  if (match) {
    return String(parseInt(match[1], 10));
  }
  return uuid;
};

// Simple fetch wrapper to handle our local backend DB API
const apiRequest = async (method: string, path: string, body?: any) => {
  try {
    const res = await fetch(`/api/store${path}`, {
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
      console.error(`API request failed: ${method} ${path}`, error);
    }
    throw error;
  }
};

export const dbService = {
  async create(table: string, data: any) {
    if (table !== 'leads' && table !== 'users' && table !== 'sheets') {
      try {
        const payload = { ...data };
        if (!payload.createdAt) {
          payload.createdAt = new Date().toISOString();
        }
        const insertedData = await apiRequest('POST', `/${table}`, payload);
        return insertedData.id;
      } catch (error) {
        console.error(`Create error in ${table}:`, error);
        throw error;
      }
    }
    
    try {
      const payload = { ...data };
      if (!payload.createdAt && !payload.created_at) {
        payload.created_at = new Date().toISOString();
      }
      
      let finalPayload = { ...payload };
      if (table === 'leads') { 
        delete finalPayload.calendar_synced; 
        delete finalPayload.lastContactDate; 
        delete finalPayload.nextStep; 
        delete finalPayload.earnings;
        delete finalPayload.created_at;
        delete finalPayload.id;
      }
      if (table === 'users') {
        delete finalPayload.email;
        delete finalPayload.createdAt;
        delete finalPayload.created_at;
      }
      
      const { data: insertedData, error } = await supabase
        .from(table)
        .insert(finalPayload)
        .select()
        .single();
        
      if (error) {
        if (error.code === '42501') {
          throw new Error('Supabase RLS Error: You do not have permission to insert rows. Please check your Row Level Security policies in Supabase.');
        }
        throw error;
      }
      
      return insertedData.id;
    } catch (error) {
      console.error(`Create error in ${table}:`, error);
      throw error;
    }
  },
  
  async set(table: string, id: string, data: any) {
    return this.update(table, id, data);
  },
  
  async update(table: string, id: string, data: any) {
    if (table !== 'leads' && table !== 'users' && table !== 'sheets') {
      try {
        await apiRequest('PUT', `/${table}/${id}`, data);
        return;
      } catch (error) {
        console.error(`Update error in ${table}/${id}:`, error);
        throw error;
      }
    }
    
    try {
      let finalPayload = { ...data };
      if (table === 'leads') { 
        delete finalPayload.calendar_synced; 
        delete finalPayload.lastContactDate; 
        delete finalPayload.nextStep;
        delete finalPayload.earnings;
        delete finalPayload.created_at;
        delete finalPayload.id;
      }
      if (table === 'users') {
        delete finalPayload.email;
        delete finalPayload.createdAt;
        delete finalPayload.created_at;
      }
      
      const { error } = await supabase
        .from(table)
        .update(finalPayload)
        .eq('id', id);
        
      if (error) {
        if (error.code === '42501') {
          throw new Error('Supabase RLS Error: You do not have permission to update rows. Please check your Row Level Security policies in Supabase.');
        }
        throw error;
      }
    } catch (error) {
      console.error(`Update error in ${table}/${id}:`, error);
      throw error;
    }
  },
  
  async get(table: string, id: string) {
    if (table !== 'leads' && table !== 'users' && table !== 'sheets') {
      try {
        return await apiRequest('GET', `/${table}/${id}`);
      } catch (error) {
        return null;
      }
    }
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      console.error(`Get error in ${table}/${id}:`, error);
      return null;
    }
  },
  
  async list(table: string, filters?: { field: string, operator: string, value: any }[]) {
    if (table !== 'leads' && table !== 'users' && table !== 'sheets') {
      try {
        let result = await apiRequest('GET', `/${table}`);
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
        console.error(`List error in ${table}:`, error);
        return [];
      }
    }
    
    try {
      let query = supabase.from(table).select('*');
      
      if (filters) {
        filters.forEach(f => {
          if (f.operator === '==') query = query.eq(f.field, f.value);
          if (f.operator === '!=') query = query.neq(f.field, f.value);
          if (f.operator === '>') query = query.gt(f.field, f.value);
          if (f.operator === '<') query = query.lt(f.field, f.value);
          if (f.operator === '>=') query = query.gte(f.field, f.value);
          if (f.operator === '<=') query = query.lte(f.field, f.value);
          if (f.operator === 'in') query = query.in(f.field, f.value);
        });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`List error in ${table}:`, error);
      return [];
    }
  },
  
  async delete(table: string, id: string) {
    if (table !== 'leads' && table !== 'users' && table !== 'sheets') {
      try {
        await apiRequest('DELETE', `/${table}/${id}`);
        return;
      } catch (error) {
        console.error(`Delete error in ${table}/${id}:`, error);
        throw error;
      }
    }
    
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error(`Delete error in ${table}/${id}:`, error);
      throw error;
    }
  },
  
  subscribe(table: string, callback: (data: any[]) => void, filters?: { field: string, operator: string, value: any }[]) {
    const fetchAndCallback = async () => {
      const data = await this.list(table, filters);
      callback(data);
    };
    
    fetchAndCallback();
    
    if (table !== 'leads' && table !== 'users' && table !== 'sheets') {
      const interval = setInterval(fetchAndCallback, 5000);
      return () => clearInterval(interval);
    }
    
    const channel = supabase.channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
        fetchAndCallback();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};

export const testConnection = async () => {
  try {
    const { error } = await supabase.from('leads').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
};
