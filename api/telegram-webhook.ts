import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://huikxhnceywgofllfyle.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '7031772261';
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '8308910231:AAGAo1WdPrbqzsLDkqgd2rdA5g4SKRwx9z4';
const supabase = createClient(supabaseUrl, supabaseKey);

import { GoogleGenAI } from '@google/genai';
import { dbService } from '../src/services/dbService.js';
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
    if (text.startsWith('/chat')) {
      const query = text.replace('/chat', '').trim();
      if (!query) {
        await reply('Please provide a message after /chat. Example: /chat What are the active projects?');
        return res.status(200).send('OK');
      }
      await reply('Thinking... 🧠');
      await processChatCommand(query, reply);
    }
    else if (text === '/projects') {
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
    
    else if (text === '/todos') {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed');

      if (error) throw error;

      if (!tasks || tasks.length === 0) {
        await reply("✅ No pending To-Dos found!");
        return res.status(200).send("OK");
      }

      let responseText = "📋 *Pending To-Dos:*\n\n";
      tasks.forEach((t, index) => {
        responseText += `${index + 1}. ${t.title || 'Untitled task'} - _${t.status || 'todo'}_\n`;
      });
      
      await reply(responseText);
    }

    else if (text === '/leads') {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .neq('status', 'Won')
        .neq('status', 'Lost');

      if (error) throw error;

      if (!leads || leads.length === 0) {
        await reply("✅ No active Leads found!");
        return res.status(200).send("OK");
      }

      let responseText = "🎯 *Active Leads:*\n\n";
      leads.forEach((l, index) => {
        responseText += `${index + 1}. ${l.name || 'Unnamed lead'} (${l.company || 'No Company'}) - _${l.status || 'N/A'}_\n`;
      });
      
      await reply(responseText);
    }
    
    else {
      await reply("❓ Unknown command. Try typing `/projects`, `/payments`, `/todos`, or `/leads`!");
    }

    return res.status(200).send("OK");

  } catch (err: any) {
    console.error('Webhook Runtime Error:', err.message);
    return res.status(200).send(`Error: ${err.message}`);
  }
}
async function processChatCommand(query: string, reply: (msg: string) => Promise<void>) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY });
    const tools: any[] = [{
      functionDeclarations: [
        {
          name: 'getProjectDetails',
          description: 'Get project details by project identifier (ID or name)',
          parameters: {
            type: 'OBJECT',
            properties: {
              project_identifier: { type: 'STRING' }
            },
            required: ['project_identifier']
          }
        },
        {
          name: 'createTask',
          description: 'Create a new task in a project',
          parameters: {
            type: 'OBJECT',
            properties: {
              project_identifier: { type: 'STRING' },
              task_description: { type: 'STRING' }
            },
            required: ['project_identifier', 'task_description']
          }
        },
        {
          name: 'updateProjectBudget',
          description: 'Update the budget of a project',
          parameters: {
            type: 'OBJECT',
            properties: {
              project_identifier: { type: 'STRING' },
              amount: { type: 'NUMBER' }
            },
            required: ['project_identifier', 'amount']
          }
        }
      ]
    }];

    const systemInstruction = "You are Woody, an AI assistant for Reelywood. You help manage operations. When discussing or updating financial amounts for projects, you must strictly use the label 'Total Budget' and never 'Financials' or 'Received Amount'.";
    
    let chatParams: any = {
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        tools,
        systemInstruction,
      }
    };

    let response = await ai.models.generateContent(chatParams);

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const { name, args } = call as any;
      let toolResult: any;

      const findProject = async (idOrName: string) => {
        let projects = await dbService.list('projects');
        let p = projects.find((p: any) => String(p.id) === String(idOrName) || (p.name && p.name.toLowerCase().includes(String(idOrName).toLowerCase())));
        return p;
      };

      if (name === 'getProjectDetails') {
        const p = await findProject(args.project_identifier);
        toolResult = p ? p : { error: 'Project not found' };
      } else if (name === 'createTask') {
        const p = await findProject(args.project_identifier);
        if (p) {
          const t = { projectId: p.id, title: args.task_description, status: 'todo', createdAt: new Date().toISOString() };
          const taskRes = await dbService.create('tasks', t);
          toolResult = { success: true, task: taskRes, project_name: p.name };
        } else {
          toolResult = { error: 'Project not found' };
        }
      } else if (name === 'updateProjectBudget') {
        const p = await findProject(args.project_identifier);
        if (p) {
          await dbService.update('projects', p.id, { total_budget: args.amount });
          toolResult = { success: true, new_budget: args.amount, project_name: p.name };
        } else {
          toolResult = { error: 'Project not found' };
        }
      }

      chatParams.contents.push(response.candidates[0].content);
      chatParams.contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: name,
            response: toolResult || {}
          }
        }]
      });

      response = await ai.models.generateContent(chatParams);
    }
    
    if (response.text) {
      await reply(response.text);
    } else {
      await reply('I processed that, but have no text to reply.');
    }
  } catch (err: any) {
    console.error('AI Error:', err);
    await reply('❌ Error processing AI request: ' + err.message);
  }
}
