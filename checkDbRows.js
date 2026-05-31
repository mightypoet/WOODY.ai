import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://huikxhnceywgofllfyle.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: p } = await supabase.from('projects').select('*').limit(1);
  console.log("projects:", p);

  const { data: t } = await supabase.from('tasks').select('*').limit(1);
  console.log("tasks:", t);
}
run();
