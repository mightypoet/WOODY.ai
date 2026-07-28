import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_constraints_or_something'); // wait, let's just use standard postgrest to insert null and see if it fails.
  const { error: e2 } = await supabase.from('leads').insert({ name: 'Test Check Constraint', email: 'test_constraint@test.com', call_outcome: null });
  console.log('insert with null:', e2);
  const { error: e3 } = await supabase.from('leads').insert({ name: 'Test Check Constraint', email: 'test_constraint@test.com', call_outcome: 'Pending' });
  console.log('insert with Pending:', e3);
}
check();
