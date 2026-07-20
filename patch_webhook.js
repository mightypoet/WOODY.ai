import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

const updatedContent = content.replace(
  /app\.post\("\/api\/telegram-webhook", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.send\("Internal Server Error"\);\n  \}\n\}\);/,
  `app.post("/api/telegram-webhook", async (req, res) => {
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
      
      console.log(\`Received text message from chat \${chatId}: \${text}\`);
      
      // We dynamically import aiService to prevent any client-side only issues at module load
      const { getAIResponse, extractActions } = await import("./src/services/aiService.js");
      
      console.log("Calling getAIResponse...");
      // Get AI response
      // For simplicity, we just pass the current user message
      const aiReply = await getAIResponse([{ role: "user", content: text }]);
      console.log("AI reply received:", aiReply);
      
      // We might want to execute actions or just reply with text
      // Let's strip out JSON actions for the telegram reply if they exist, or just send the whole reply
      let textToSend = aiReply.replace(/\\{[\\s\\S]*"actions"[\\s\\S]*?\\}/g, '').trim();
      if (!textToSend) {
        textToSend = "Action executed.";
      }
      
      console.log(\`Sending message to Telegram chat \${chatId}: \${textToSend}\`);
      
      // Send message back via Telegram Bot API
      const telegramApiUrl = \\\`https://api.telegram.org/bot\${token}/sendMessage\\\`;
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
});`
);

fs.writeFileSync('server.ts', updatedContent);
