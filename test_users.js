import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const id = '9a3a484e-7416-4bd7-9bc9-5810bf159623';
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  console.log('GET:', data, error);

  const { data: updateData, error: updateError } = await supabase.from('users').update({ name: 'test' }).eq('id', id);
  console.log('UPDATE:', updateData, updateError);
}
test();
