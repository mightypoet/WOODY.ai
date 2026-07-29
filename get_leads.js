import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://huikxhnceywgofllfyle.supabase.co', 'sb_publishable_E_5daNHCs9gW8owaBD5Ddw_n9_sI6x1');

async function run() {
  const { data, error } = await supabase.from('leads').select('meeting_status');
  console.log(data ? [...new Set(data.map(d => d.meeting_status))].filter(Boolean) : error);
}
run();
