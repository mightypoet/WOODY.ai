import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Remove the webhook route
content = content.replace(/app\.post\("\/api\/telegram-webhook"[\s\S]*?\}\);/, '');

// Add the Telegram polling loop setup before startServer()
const pollingCode = `
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
    const deleteWebhookUrl = \`https://api.telegram.org/bot\${token}/deleteWebhook\`;
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
      const getUpdatesUrl = \`https://api.telegram.org/bot\${token}/getUpdates?offset=\${lastUpdateId + 1}&timeout=30\`;
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
            
            console.log(\`Received text message from chat \${chatId}: \${text}\`);
            
            try {
              const { getAIResponse } = await import("./src/services/aiService.js");
              console.log("Calling getAIResponse...");
              const aiReply = await getAIResponse([{ role: "user", content: text }]);
              console.log("AI reply received:", aiReply);
              
              let textToSend = aiReply.replace(/\\{[\\s\\S]*"actions"[\\s\\S]*?\\}/g, '').trim();
              if (!textToSend) {
                textToSend = "Action executed.";
              }
              
              console.log(\`Sending message to Telegram chat \${chatId}: \${textToSend}\`);
              
              const telegramApiUrl = \`https://api.telegram.org/bot\${token}/sendMessage\`;
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
`;

// Insert the polling code right before async function startServer()
content = content.replace('async function startServer() {', pollingCode + '\nasync function startServer() {');

fs.writeFileSync('server.ts', content);
