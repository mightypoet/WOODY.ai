import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('leads').insert({ name: 'Test Lead', email: 'test@example.com' }).select();
  console.log('leads insert:', data, error);
}
test();
