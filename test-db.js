import { supabase } from './src/utils/supabase.js';

async function run() {
  const { data, error } = await supabase.from('leads').insert([{
    name: "Test Lead",
    email: "test@test.com",
    status: "New",
    company: "Test Co",
    nextStep: "test",
    calendar_synced: false,
    lastContactDate: "2026-07-20",
    last_touch_date: "2026-07-20",
    contact_number: "123",
    instagram_link: "123",
    followup_date: "2026-07-20",
    meeting_date: "2026-07-20",
    setter_name: "John",
    closer_name: "Jane",
    first_contact_date: "2026-07-20",
    date_of_meeting: "2026-07-20",
    meeting_status: "Scheduled",
    call_outcome: "test",
    loss_reason: "test",
    total_deal_value: 1000,
    cash_collected: 100,
    commission_percentage: 10
  }]).select();
  console.log("Error:", error);
  console.log("Data:", data);
}

run();
