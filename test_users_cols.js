import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Let's insert a row to see what happens, or just try to get column info if we can't
  const { data, error } = await supabase.from('users').insert({ id: '9a3a484e-7416-4bd7-9bc9-5810bf159623' }).select();
  console.log('INSERT:', data, error);
}
test();
