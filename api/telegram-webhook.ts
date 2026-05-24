import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://huikxhnceywgofllfyle.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { message } = req.body || {};
    if (!message || !message.text) {
      return res.status(200).send("OK");
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    
    // Security check
    const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;
    if (String(chatId) !== String(ALLOWED_CHAT_ID)) {
      return res.status(403).send("Forbidden");
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).send("No token");

    const reply = async (msg: string) => {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: "Markdown",
        }),
      });
    };

    try {
      // Execute Routing Architecture
      if (text === '/projects') {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('name, status');

        if (error) throw error;

        let responseText = "📋 *Active Projects Summary:*\n\n";
        if (!projects || projects.length === 0) {
          responseText += "No active projects found in Supabase.";
        } else {
          projects.forEach(p => {
            responseText += `• *${p.name}*: Status is ${p.status || 'Active'}\n`;
          });
        }
        await reply(responseText);
      } 
      
      else if (text === '/payments') {
        const { data: payments, error } = await supabase
          .from('payments')
          .select('client_name, amount_due, status');

        if (error) throw error;

        let responseText = "💰 *Pending Financials:*\n\n";
        let totalPending = 0;

        if (!payments || payments.length === 0) {
          responseText += "No financial records found.";
        } else {
          payments.forEach(p => {
            if (p.status !== 'paid') {
              responseText += `• *${p.client_name}*: ₹${p.amount_due || 0}\n`;
              totalPending += Number(p.amount_due || 0);
            }
          });
          responseText += `\n*Total Outstanding Balance:* ₹${totalPending}`;
        }
        await reply(responseText);
      } 
      
      else {
        await reply("❓ Unknown command. Try typing `/projects` or `/payments`!");
      }
    } catch (cmdError: any) {
      console.error("Command error:", cmdError);
      await reply(`⚠️ *Execution Error:*\n\`${cmdError.message || String(cmdError)}\``);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error");
  }
}
