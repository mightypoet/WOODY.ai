import fs from 'fs';

const dbServiceContent = `import { supabase } from '../utils/supabase';

export const toUUID = (id: any) => {
  if (!id) return id;
  const str = String(id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return str;
  if (/^d+$/.test(str)) {
    return \`00000000-0000-0000-0000-\${str.padStart(12, '0')}\`;
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

export const dbService = {
  async create(table: string, data: any) {
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
      }
      
      const { data: insertedData, error } = await supabase
        .from(table)
        .insert(finalPayload)
        .select()
        .single();
        
      if (error) throw error;
      
      return insertedData.id;
    } catch (error) {
      console.error(\`Create error in \${table}:\`, error);
      throw error;
    }
  },
  
  async set(table: string, id: string, data: any) {
    return this.update(table, id, data);
  },
  
  async update(table: string, id: string, data: any) {
    try {
      let finalPayload = { ...data };
      if (table === 'leads') { 
        delete finalPayload.calendar_synced; 
        delete finalPayload.lastContactDate; 
        delete finalPayload.nextStep; 
      }
      
      const { error } = await supabase
        .from(table)
        .update(finalPayload)
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error(\`Update error in \${table}/\${id}:\`, error);
      throw error;
    }
  },
  
  async get(table: string, id: string) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(\`Get error in \${table}/\${id}:\`, error);
      return null;
    }
  },
  
  async list(table: string, filters?: { field: string, operator: string, value: any }[]) {
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
      console.error(\`List error in \${table}:\`, error);
      return [];
    }
  },
  
  async delete(table: string, id: string) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error(\`Delete error in \${table}/\${id}:\`, error);
      throw error;
    }
  },
  
  subscribe(table: string, callback: (data: any[]) => void, filters?: { field: string, operator: string, value: any }[]) {
    const fetchAndCallback = async () => {
      const data = await this.list(table, filters);
      callback(data);
    };
    
    fetchAndCallback();
    
    const channel = supabase.channel(\`public:\${table}\`)
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
`;

fs.writeFileSync('src/services/dbService.ts', dbServiceContent);
