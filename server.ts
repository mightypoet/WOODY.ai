
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
let resend = null;

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


// Basic JSON Database for persistence
import os from 'os';
const tmpDir = os.tmpdir();
const DB_FILE = (process.env.NODE_ENV === 'production' || process.env.VERCEL) ? path.join(tmpDir, 'data.json') : path.join(process.cwd(), 'data.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error("Failed to read DB:", e);
    return {};
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get("/api/store/:table", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  res.json(db[table] || []);
});

app.get("/api/store/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  const items = db[table] || [];
  const item = items.find(i => i.id === req.params.id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.post("/api/store/:table", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const newItem = { ...req.body };
  if (!newItem.id) {
    newItem.id = require('crypto').randomUUID();
  }
  
  db[table].push(newItem);
  writeDB(db);
  res.json(newItem);
});

app.put("/api/store/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const index = db[table].findIndex(i => i.id === req.params.id);
  if (index >= 0) {
    db[table][index] = { ...db[table][index], ...req.body };
    writeDB(db);
    res.json(db[table][index]);
  } else {
    const newItem = { ...req.body, id: req.params.id };
    db[table].push(newItem);
    writeDB(db);
    res.json(newItem);
  }
});

app.delete("/api/store/:table/:id", (req, res) => {
  const db = readDB();
  const table = req.params.table;
  if (!db[table]) db[table] = [];
  
  const initialLength = db[table].length;
  db[table] = db[table].filter(i => i.id !== req.params.id);
  
  if (db[table].length < initialLength) {
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// Telegram Long Polling
let lastUpdateId = 0;

async function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("Telegram bot token not found in environment variables (TELEGRAM_BOT_TOKEN). Telegram polling will not start.");
    return;
  }

  // Delete webhook first to ensure getUpdates works
  console.log("Deleting Telegram webhook to enable long polling...");
  try {
    const deleteWebhookUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
    const deleteRes = await fetch(deleteWebhookUrl);
    const deleteJson = await deleteRes.json();
    console.log("Delete webhook response:", deleteJson);
  } catch (error) {
    console.error("Error deleting webhook:", error);
  }

  console.log("Starting Telegram long polling...");
  
  // Continuous polling loop
  const poll = async () => {
    try {
      const getUpdatesUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const response = await fetch(getUpdatesUrl);
      
      if (!response.ok) {
        console.error("Failed to fetch updates:", await response.text());
        setTimeout(poll, 5000);
        return;
      }

      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            console.log(`Received text message from chat ${chatId}: ${text}`);
            
            try {
              const { getAIResponse } = await import("./src/services/aiService.js");
              console.log("Calling getAIResponse...");
              const aiReply = await getAIResponse([{ role: "user", content: text }]);
              console.log("AI reply received:", aiReply);
              
              let textToSend = aiReply.replace(/\{[\s\S]*"actions"[\s\S]*?\}/g, '').trim();
              if (!textToSend) {
                textToSend = "Action executed.";
              }
              
              console.log(`Sending message to Telegram chat ${chatId}: ${textToSend}`);
              
              const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
              const sendResponse = await fetch(telegramApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: textToSend,
                }),
              });
              
              if (!sendResponse.ok) {
                console.error("Failed to send message to Telegram:", await sendResponse.text());
              } else {
                console.log("Telegram sendMessage response:", await sendResponse.json());
              }
            } catch (error) {
              console.error("Error processing message:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in polling loop:", error);
    }
    
    // Poll again immediately after processing
    setTimeout(poll, 1000);
  };
  
  // Start polling
  poll();
}

startTelegramPolling();

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const hmrPort = 24678 + Math.floor(Math.random() * 1000);
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { port: hmrPort }
      },
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
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. This usually means a stale server process is still running. Please use the 'Restart Dev Server' tool to cleanly restart the environment.`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
      }
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
      // Force close after 5 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

startServer();

export default app;
