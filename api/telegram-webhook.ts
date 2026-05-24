import { db } from "../src/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

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
    const ALLOWED_CHAT_ID = process.env.VITE_TELEGRAM_CHAT_ID;
    if (String(chatId) !== String(ALLOWED_CHAT_ID)) {
      return res.status(403).send("Forbidden");
    }

    const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
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

    if (text === "/projects") {
      const projectsSnap = await getDocs(collection(db, "projects"));
      const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      const tasksSnap = await getDocs(collection(db, "tasks"));
      const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

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

          msg += `🔹 *${p.name}*\n`;
          msg += `   Status: ${p.status}\n`;
          msg += `   Completion: ${percentage}% [${completed}/${total}]\n`;
          msg += `   Outstanding Tasks: ${outstanding}\n\n`;
        });
      }
      await reply(msg);

    } else if (text === "/payments") {
      const paymentsSnap = await getDocs(collection(db, "payments"));
      const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      let msg = "💰 *Recent Financial Tracking*\n\n";
      let totalPending = 0;
      
      if (payments.length === 0) {
        msg += "No payment records found.";
      } else {
        payments.forEach(p => {
          const balance = p.totalAmount - (p.paidAmount || 0);
          if (balance > 0) totalPending += balance;
          msg += `💵 *Amount:* $${p.totalAmount} (Paid: $${p.paidAmount || 0})\n`;
          msg += `   Status: ${p.status}\n`;
          msg += `   Due: ${p.dueDate}\n\n`;
        });
        msg += `🔥 *Total Pending Balance:* $${totalPending}`;
      }
      await reply(msg);

    } else if (text.startsWith("/tasks")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await reply("⚠️ Please provide a client name. Example: `/tasks client1`");
        return res.status(200).send("OK");
      }
      const clientNameQuery = parts.slice(1).join(" ").toLowerCase();
      
      const clientsSnap = await getDocs(collection(db, "clients"));
      const clients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const foundClient = clients.find(c => c.name.toLowerCase().includes(clientNameQuery));
      
      if (!foundClient) {
        await reply(`⚠️ No client found matching "${parts.slice(1).join(" ")}"`);
        return res.status(200).send("OK");
      }

      const projectsSnap = await getDocs(query(collection(db, "projects"), where("clientId", "==", foundClient.id)));
      const projectIds = projectsSnap.docs.map(doc => doc.id);

      if (projectIds.length === 0) {
        await reply(`📋 *Tasks for ${foundClient.name}*\n\nNo active projects for this client.`);
        return res.status(200).send("OK");
      }

      const tasksSnap = await getDocs(query(collection(db, "tasks"), where("projectId", "in", projectIds)));
      const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      let msg = `📋 *Tasks for ${foundClient.name}*\n\n`;
      const pendingTasks = tasks.filter(t => t.status !== "completed");
      
      if (pendingTasks.length === 0) {
        msg += "✅ All tasks completed!";
      } else {
        pendingTasks.forEach(t => {
          msg += `🔸 *${t.title}*\n`;
          msg += `   Status: ${t.status}\n`;
          if (t.deadline) msg += `   Due: ${new Date(t.deadline).toLocaleDateString()}\n`;
          msg += "\n";
        });
      }
      await reply(msg);

    } else {
      await reply("🤖 *Unknown command.*\nAvailable commands:\n- `/projects`\n- `/payments`\n- `/tasks [ClientName]`");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error");
  }
}
