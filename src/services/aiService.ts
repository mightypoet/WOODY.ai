import { GoogleGenAI, Type } from "@google/genai";
import { AIAction } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are WOODY, an AI automation assistant for Reelywood Technologies. Your job is to help the admin manage clients, tasks, calendar events, and emails.

CRITICAL: When the user asks you to perform an action (like creating a client, scheduling a meeting, or sending an email), you MUST respond by calling the appropriate JSON function tools. Do not just write a text summary pretending you did it.

Available Tools:

1. CREATE_CLIENT
{
  "name": "string",
  "email": "string"
}

2. CREATE_CALENDAR_EVENT
{
  "summary": "string",
  "description": "string",
  "startDateTime": "ISO String",
  "endDateTime": "ISO String"
}

3. SEND_GMAIL
{
  "to": "string",
  "subject": "string",
  "body": "string"
}

If an action is requested, output the exact JSON structure required for the frontend to execute the function. Always verify you have the correct variables (like email addresses and timestamps) before executing.

Always return:
1. JSON with an "actions" array
2. Then a simple explanation

FORMAT:
{
  "actions": [
    {
      "type": "ACTION_TYPE",
      "payload": { ... }
    }
  ]
}

Then below JSON, write:
- What actions were performed
- Any suggestions or warnings

Current Date: ${new Date().toISOString()}
`;

export async function getAIResponse(instruction: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: instruction,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    }
  });

  return response.text;
}

export function extractActions(text: string): AIAction[] {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"actions"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return data.actions || [];
    }
  } catch (e) {
    console.error("Failed to extract actions:", e);
  }
  return [];
}
