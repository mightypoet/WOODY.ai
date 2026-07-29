import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://huikxhnceywgofllfyle.supabase.co', 'sb_publishable_E_5daNHCs9gW8owaBD5Ddw_n9_sI6x1');

async function testStatus(status) {
  const { error } = await supabase.from('leads').insert({ 
    name: 'Test', 
    email: 'test@example.com', 
    status: 'New', 
    meeting_status: status 
  });
  console.log(`Status "${status}":`, error ? error.message : "Success!");
}

async function run() {
  await testStatus('Scheduled');
  await testStatus('scheduled');
  await testStatus('Completed');
  await testStatus('completed');
  await testStatus('No Show');
  await testStatus('no-show');
  
  // delete tests
  await supabase.from('leads').delete().eq('name', 'Test');
}
run();
