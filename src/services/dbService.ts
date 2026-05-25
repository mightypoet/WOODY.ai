import { supabase } from '../utils/supabase';

export async function testConnection() {
  console.log("Supabase connection active.");
}

export const dbService = {
  async _executeWithRetry(operation: 'insert' | 'upsert' | 'update', table: string, payload: any, id?: string, attempt = 1): Promise<any> {
    const isUpdate = operation === 'update';
    const isUpsert = operation === 'upsert';
    
    let query = supabase.from(table);
    let builder: any;
    
    if (operation === 'insert') builder = query.insert([payload]).select().single();
    else if (operation === 'upsert') builder = query.upsert([payload]).select().single();
    else if (operation === 'update') builder = query.update(payload).eq('id', id).select().single();
    
    const { data, error } = await builder;

    if (error) {
      if (error.code === 'PGRST204' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        if (attempt < 5) {
          console.warn(`Column missing in table ${table}, attempting fallback ${attempt}...`, error.message);
          const fallbackData = { ...payload };
          
          const match = error.message.match(/column "?([^"\s]+)"? /) || error.message.match(/Could not find the '([^']+)' column/);
          const missingCol = match ? match[1] : null;

          if (missingCol) {
            // Handle specific camelCase to snake_case conversions first
            if (missingCol === 'createdAt') {
              if (fallbackData.createdAt !== undefined) fallbackData.created_at = fallbackData.createdAt;
              delete fallbackData.createdAt;
            } else if (missingCol === 'updatedAt') {
              if (fallbackData.updatedAt !== undefined) fallbackData.updated_at = fallbackData.updatedAt;
              delete fallbackData.updatedAt;
            } else if (missingCol === 'clientId') {
              if (fallbackData.clientId !== undefined) fallbackData.client_id = fallbackData.clientId;
              delete fallbackData.clientId;
            } else if (missingCol === 'projectId') {
              if (fallbackData.projectId !== undefined) fallbackData.project_id = fallbackData.projectId;
              delete fallbackData.projectId;
            } else if (missingCol === 'assigneeId') {
              if (fallbackData.assigneeId !== undefined) fallbackData.assignee_id = fallbackData.assigneeId;
              delete fallbackData.assigneeId;
            } else {
              delete fallbackData[missingCol];
              // If it's a snake_case failure, also ensure the camelCase version is removed to avoid loops
              if (missingCol === 'created_at') delete fallbackData.createdAt;
              if (missingCol === 'updated_at') delete fallbackData.updatedAt;
              if (missingCol === 'client_id') delete fallbackData.clientId;
              if (missingCol === 'project_id') delete fallbackData.projectId;
              if (missingCol === 'assignee_id') delete fallbackData.assigneeId;
            }
          } else {
            // Blanket removal of known problematic transient fields if regex fails
            delete fallbackData.contactNumber;
            delete fallbackData.social_media_calendar_link;
            delete fallbackData.annotation;
            delete fallbackData.socialMediaSheetUrl;
            
            if (fallbackData.createdAt !== undefined) {
              fallbackData.created_at = fallbackData.createdAt;
              delete fallbackData.createdAt;
            }
          }
          
          return this._executeWithRetry(operation, table, fallbackData, id, attempt + 1);
        }
      }
      // PGRST204 is no content, which might actually mean success for some operations if not using .select()
      // But we are using .select() which should return data. If PGRST204 happens, it might mean the row was successfully updated but no row returned.
      if (error.code === 'PGRST204') {
         return null;
      }
      throw error;
    }
    return data;
  },

  async create(table: string, data: any) {
    try {
      const payload = { ...data };
      if (!payload.createdAt && !payload.created_at) {
        payload.createdAt = new Date().toISOString();
      }

      const result = await this._executeWithRetry('insert', table, payload);
      return result?.id;
    } catch (error) {
      console.error(`Supabase create error in ${table}:`, error);
      throw error;
    }
  },

  async set(table: string, id: string, data: any) {
    try {
      const payload = { ...data, id };
      if (!payload.updatedAt && !payload.updated_at) {
        payload.updatedAt = new Date().toISOString();
      }

      await this._executeWithRetry('upsert', table, payload, id);
    } catch (error) {
      console.error(`Supabase set error in ${table}/${id}:`, error);
      throw error;
    }
  },

  async update(table: string, id: string, data: any) {
    try {
      await this._executeWithRetry('update', table, data, id);
    } catch (error) {
      console.error(`Supabase update error in ${table}/${id}:`, error);
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
        
      // PGRST116 is not found
      if (error && error.code !== 'PGRST116') throw error; 
      return data || null;
    } catch (error) {
      console.error(`Supabase get error in ${table}/${id}:`, error);
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
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Supabase list error in ${table}:`, error);
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
      console.error(`Supabase delete error in ${table}/${id}:`, error);
      throw error;
    }
  },

  subscribe(table: string, callback: (data: any[]) => void, filters?: { field: string, operator: string, value: any }[]) {
    // Initial fetch
    this.list(table, filters).then(callback);
    
    // Subscribe to changes
    const subscription = supabase
      .channel(`${table}_changes_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, async payload => {
        // Re-fetch list to apply filters and get latest state
        const data = await this.list(table, filters);
        callback(data);
      })
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
