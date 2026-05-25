import { supabase } from '../utils/supabase';

export async function testConnection() {
  console.log("Supabase connection active.");
}

export const dbService = {
  async create(table: string, data: any) {
    try {
      const payload = { ...data, created_at: new Date().toISOString() };
      delete payload.createdAt;
      const { data: insertedData, error } = await supabase
        .from(table)
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          // If a column does not exist, try removing transient fields
          console.warn(`Column missing in table ${table}, trying fallback without transient fields...`, error);
          const fallbackData = { ...payload };
          delete fallbackData.contactNumber;
          delete fallbackData.social_media_calendar_link;
          delete fallbackData.annotation;
          delete fallbackData.socialMediaSheetUrl;
          
          const { data: retryData, error: retryError } = await supabase
            .from(table)
            .insert([fallbackData])
            .select()
            .single();
            
          if (retryError) throw retryError;
          return retryData?.id;
        }
        throw error;
      }
      return insertedData?.id;
    } catch (error) {
      console.error(`Supabase create error in ${table}:`, error);
      throw error;
    }
  },

  async set(table: string, id: string, data: any) {
    try {
      const payload = { ...data, id, updated_at: new Date().toISOString() };
      delete payload.updatedAt;
      const { error } = await supabase
        .from(table)
        .upsert([payload]);
      
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          console.warn(`Column missing in table ${table}, trying fallback without transient fields...`, error);
          const fallbackData = { ...payload };
          delete fallbackData.contactNumber;
          delete fallbackData.socialMediaSheetUrl;
          delete fallbackData.social_media_calendar_link;
          delete fallbackData.annotation;
          
          const { error: retryError } = await supabase
            .from(table)
            .upsert([fallbackData]);
            
          if (retryError) throw retryError;
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Supabase set error in ${table}/${id}:`, error);
      throw error;
    }
  },

  async update(table: string, id: string, data: any) {
    try {
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id);
      
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          console.warn(`Column missing in table ${table}, trying fallback without transient fields...`, error);
          const fallbackData = { ...data };
          delete fallbackData.contactNumber;
          delete fallbackData.socialMediaSheetUrl;
          delete fallbackData.social_media_calendar_link;
          delete fallbackData.annotation;
          
          const { error: retryError } = await supabase
            .from(table)
            .update(fallbackData)
            .eq('id', id);
            
          if (retryError) throw retryError;
          return;
        }
        throw error;
      }
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
