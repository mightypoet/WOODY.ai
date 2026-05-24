import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '7031772261';
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '8308910231:AAGAo1WdPrbqzsLDkqgd2rdA5g4SKRwx9z4';
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

    // Identity Security Gate
    if (String(chatId) !== String(ALLOWED_CHAT_ID)) {
      return res.status(403).send("Forbidden Identification Mismatch");
    }

    if (!token) return res.status(500).send("No token configured");

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

    // Execute Routing Architecture
    if (text === '/projects') {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*');

      if (error) {
        await reply("Supabase Error: " + error.message);
        return res.status(200).send("OK");
      }

      if (!projects || projects.length === 0) {
        await reply("Database Connection Success! But your 'projects' table currently contains 0 rows.");
        return res.status(200).send("OK");
      }

      let responseText = "📋 WOODY ACTIVE PROJECTS:\n\n";
      projects.forEach((p, index) => {
        responseText += `${index + 1}. Project: ${p.name || 'Unnamed'} | Status: ${p.status || 'No Status Set'}\n`;
      });
      
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
          const currentStatus = (p.status || '').toLowerCase().trim();
          if (currentStatus !== 'paid') {
            responseText += `• *${p.client_name}*: ₹${p.amount_due || 0} (_${p.status || 'pending'}_)\n`;
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

    return res.status(200).send("OK");

  } catch (err: any) {
    console.error('Webhook Runtime Error:', err.message);
    return res.status(200).send(`Error: ${err.message}`);
  }
}