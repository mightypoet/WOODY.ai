import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_check_constraints');
  if (error) {
    console.log("No RPC, fetching another way", error);
    // Let's try to query via REST if possible, but usually information_schema is not exposed to anon.
  }
}
run();
