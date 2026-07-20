import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { Resend } from 'resend';

const envPath = fs.existsSync('.env') ? '.env' : '.env.example';
dotenv.config({ path: envPath });

const app = express();
const PORT = 3000;

// Initialize Resend lazily
let resend: Resend | null = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "WOODY API is running",
    emailServiceConfigured: !!process.env.RESEND_API_KEY 
  });
});

app.post("/api/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  
  const resendClient = getResend();
  if (!resendClient) {
    return res.status(500).json({ error: "Email service not configured (RESEND_API_KEY missing)" });
  }

  try {
    const data = await resendClient.emails.send({
      from: 'Woody AI <onboarding@resend.dev>', // Standard Resend domain for testing
      to,
      subject,
      html,
    });
    
    if (data.error) {
      console.error("Resend API Error:", data.error);
      return res.status(400).json({ error: data.error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.post("/api/telegram-webhook", async (req, res) => {
  console.log('Incoming Telegram message:', req.body);
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Telegram bot token not found in environment variables.");
    return res.status(500).json({ error: "Telegram bot token not configured" });
  }

  try {
    const body = req.body;
    
    // Telegram sends message events
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      
      console.log(`Received text message from chat ${chatId}: ${text}`);
      
      // We dynamically import aiService to prevent any client-side only issues at module load
      const { getAIResponse, extractActions } = await import("./src/services/aiService.js");
      
      console.log("Calling getAIResponse...");
      // Get AI response
      // For simplicity, we just pass the current user message
      const aiReply = await getAIResponse([{ role: "user", content: text }]);
      console.log("AI reply received:", aiReply);
      
      // We might want to execute actions or just reply with text
      // Let's strip out JSON actions for the telegram reply if they exist, or just send the whole reply
      let textToSend = aiReply.replace(/\{[\s\S]*"actions"[\s\S]*?\}/g, '').trim();
      if (!textToSend) {
        textToSend = "Action executed.";
      }
      
      console.log(`Sending message to Telegram chat ${chatId}: ${textToSend}`);
      
      // Send message back via Telegram Bot API
      const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: textToSend,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send message to Telegram:", errorText);
      } else {
        const jsonResp = await response.json();
        console.log("Telegram sendMessage response:", jsonResp);
      }
    } else {
       console.log("Webhook received but no text message found.");
    }
    
    // Always acknowledge the webhook to prevent retries
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing telegram webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});




async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production (Vercel), static files are handled by vercel.json rewrites
    // But we still serve them here as a fallback for other environments like Cloud Run
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if NOT on Vercel (Vercel handles listening)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
