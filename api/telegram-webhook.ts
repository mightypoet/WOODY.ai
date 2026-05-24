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
      if (text === "/projects") {
        const { data: projectsData, error: projError } = await supabase.from('projects').select('*');
        if (projError) throw projError;
        const projects = projectsData || [];
        
        const { data: tasksData, error: taskError } = await supabase.from('tasks').select('*');
        if (taskError) throw taskError;
        const tasks = tasksData || [];

        let msg = "📊 *Active Client Projects*\n\n";
        if (projects.length === 0) {
          msg += "No active projects found.";
        } else {
          projects.forEach(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const total = pTasks.length;
            const completed = pTasks.filter(t => t.status === "completed").length;
            const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
            const outstanding = total - completed;

            msg += `🔹 *${p.name || 'Unnamed Project'}*\n`;
            msg += `   Status: ${p.status || 'Unknown'}\n`;
            msg += `   Completion: ${percentage}% [${completed}/${total}]\n`;
            msg += `   Outstanding Tasks: ${outstanding}\n\n`;
          });
        }
        await reply(msg);

      } else if (text === "/payments") {
        const { data: paymentsData, error } = await supabase.from('payments').select('*');
        if (error) throw error;
        const payments = paymentsData || [];
        
        let msg = "💰 *Recent Financial Tracking*\n\n";
        let totalPending = 0;
        
        if (payments.length === 0) {
          msg += "No payment records found.";
        } else {
          payments.forEach(p => {
            const balance = (p.totalAmount || 0) - (p.paidAmount || 0);
            if (balance > 0) totalPending += balance;
            msg += `💵 *Amount:* $${p.totalAmount || 0} (Paid: $${p.paidAmount || 0})\n`;
            msg += `   Status: ${p.status || 'Unknown'}\n`;
            if (p.dueDate) msg += `   Due: ${p.dueDate}\n`;
            msg += `\n`;
          });
          msg += `🔥 *Total Pending Balance:* $${totalPending.toFixed(2)}`;
        }
        await reply(msg);

      } else if (text.startsWith("/tasks")) {
        const parts = text.split(" ");
        if (parts.length < 2) {
          await reply("⚠️ Please provide a client name. Example: `/tasks client1`");
          return res.status(200).send("OK");
        }
        
        const clientNameQuery = parts.slice(1).join(" ").toLowerCase();
        
        const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*');
        if (clientsError) throw clientsError;
        const clients = clientsData || [];
        const foundClient = clients.find(c => c.name && c.name.toLowerCase().includes(clientNameQuery));
        
        if (!foundClient) {
          await reply(`⚠️ No client found matching "${parts.slice(1).join(" ")}"`);
          return res.status(200).send("OK");
        }

        const { data: projectsData, error: projError } = await supabase.from('projects').select('id').eq('clientId', foundClient.id);
        if (projError) throw projError;
        const projectIds = projectsData ? projectsData.map(doc => doc.id) : [];

        if (projectIds.length === 0) {
          await reply(`📋 *Tasks for ${foundClient.name}*\n\nNo active projects for this client.`);
          return res.status(200).send("OK");
        }

        const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*').in('projectId', projectIds);
        if (tasksError) throw tasksError;
        const tasks = tasksData || [];
        
        let msg = `📋 *Tasks for ${foundClient.name}*\n\n`;
        const pendingTasks = tasks.filter(t => t.status !== "completed");
        
        if (pendingTasks.length === 0) {
          msg += "✅ All tasks completed!";
        } else {
          pendingTasks.forEach(t => {
            msg += `🔸 *${t.title}*\n`;
            msg += `   Status: ${t.status || 'Unknown'}\n`;
            if (t.deadline) msg += `   Due: ${new Date(t.deadline).toLocaleDateString()}\n`;
            msg += "\n";
          });
        }
        await reply(msg);

      } else {
        await reply("🤖 *Unknown command.*\nAvailable commands:\n- `/projects`\n- `/payments`\n- `/tasks [ClientName]`");
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
