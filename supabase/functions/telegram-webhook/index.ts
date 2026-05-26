import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = "7031772261";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    if (type !== 'UPDATE') {
      return new Response("Not an UPDATE event", { status: 200 });
    }

    const statusChanged = record?.status !== old_record?.status;
    const followupChanged = record?.followup_date !== old_record?.followup_date;

    if (!statusChanged && !followupChanged) {
      return new Response("No relevant changes", { status: 200 });
    }

    let triggerEvent = 'status_change';
    if (statusChanged && followupChanged) {
      triggerEvent = 'status_and_followup';
    } else if (followupChanged) {
      triggerEvent = 'new_followup';
    }

    const leadName = record.name || "Unknown Lead";
    const company = record.company || "Unknown Company";
    const newStatus = record.status || "N/A";
    
    let followupDateStr = "N/A";
    if (record.followup_date) {
      const d = new Date(record.followup_date);
      followupDateStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    }

    let messageText = `🔔 *Woody CRM Update*\n• *Lead:* ${leadName}\n• *Company:* ${company}\n• *New Status:* ${newStatus}\n• *Followup Date:* ${followupDateStr}`;

    // Fetch pending tasks
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'completed')
      .limit(5);

    if (!taskError && tasks && tasks.length > 0) {
      messageText += `\n\n📋 *Pending To-Dos:*\n`;
      tasks.forEach((t, i) => {
        messageText += `${i + 1}. ${t.title || 'Untitled'} - _${t.status}_\n`;
      });
    }

    // Fetch active leads
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .neq('status', 'Won')
      .neq('status', 'Lost')
      .limit(5);

    if (!leadError && leads && leads.length > 0) {
      messageText += `\n🎯 *Active Leads (Top 5):*\n`;
      leads.forEach((l, i) => {
        messageText += `${i + 1}. ${l.name || 'Unnamed'} (${l.company || 'N/A'})\n`;
      });
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: "Markdown",
      }),
    });

    if (!tgResponse.ok) {
      const err = await tgResponse.text();
      console.error("Telegram API Error:", err);
      return new Response("Failed to send telegram message", { status: 500 });
    }

    const tgData = await tgResponse.json();
    const messageId = tgData.result.message_id;

    const { error: insertError } = await supabase.from('notifications').insert([
      {
        lead_id: record.id,
        trigger_event: triggerEvent,
        telegram_message_id: messageId.toString(),
      }
    ]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
    }

    return new Response("Success", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
