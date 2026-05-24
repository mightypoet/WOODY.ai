import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const url = process.env.VITE_SUPABASE_URL || 'https://huikxhnceywgofllfyle.supabase.co';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_E_5daNHCs9gW8owaBD5Ddw_n9_sI6x1';
  
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const json = await res.json();
  console.log(json);
}
check();
