import React, { useState, useRef, useEffect } from "react";
import { User, AIAction } from "../types";
import { getAIResponse, extractActions } from "../services/aiService";
import { dbService } from "../services/dbService";
import { notificationService } from "../services/notificationService";
import {
  calendarService,
  gmailService,
  meetService,
  tasksService,
  docsService,
  sheetsService,
} from "../services/workspaceService";
import {
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Mic,
  MicOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  status?: "processing" | "success" | "error";
}

export default function ChatInterface({ user }: { user: User }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "00000000-0000-0000-0000-000000000001",
      role: "assistant",
      content: `Hello ${user.name}, I'm WOODY. How can I help you manage Reelywood today?`,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = async () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Speech recognition is not supported in this browser. Please try using Chrome Desktop.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      alert("Microphone permission is required for voice commands.");
      console.error("Mic access denied:", err);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    let originalInput = input;

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setInput(
        originalInput +
          (originalInput && currentTranscript ? " " : "") +
          currentTranscript,
      );
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const executeActions = async (actions: AIAction[]) => {
    const results = [];
    for (const action of actions) {
      try {
        const now = new Date().toISOString();
        switch (action.type) {
          case "CREATE_CLIENT":
            await dbService.create("clients", {
              name: action.payload.name || action.payload.client_name || "",
              email: action.payload.email || "",
              brand:
                action.payload.brand ||
                action.payload.name ||
                action.payload.client_name ||
                "",
              contact: action.payload.contact || action.payload.email || "",
              poc_name: action.payload.poc_name || "",
              phone: action.payload.phone || "",
              deliverables: action.payload.deliverables || [],
              budget: action.payload.budget || 0,
              amount_received: action.payload.amount_received || 0,
              amount_pending: (action.payload.budget || 0) - (action.payload.amount_received || 0),
              services: action.payload.deliverables || action.payload.services || [],
              paymentTerms: action.payload.payment_terms || "",
              totalBudget:
                action.payload.budget || action.payload.deal_value || action.payload.totalBudget || 0,
              createdAt: now,
            });
            results.push(
              `Created client: ${action.payload.name || action.payload.client_name}`,
            );
            break;

          case "CREATE_LEAD":
            let sheetId = null;
            if (action.payload.sheet_name) {
              const sheets = await dbService.list("sheets");
              const matchingSheet = sheets.find((s: any) => 
                s.name.toLowerCase() === action.payload.sheet_name.toLowerCase() ||
                s.name.toLowerCase().includes(action.payload.sheet_name.toLowerCase())
              );
              if (matchingSheet) {
                sheetId = matchingSheet.id;
              }
            }

            await dbService.create("leads", {
              name: action.payload.name || action.payload.client_name || "",
              email: action.payload.email || "",
              company: action.payload.company || action.payload.brand || "",
              contact_number: action.payload.phone || "",
              total_deal_value: action.payload.estimated_value || 0,
              status: action.payload.stage || "New",
              ...(sheetId ? { sheet_id: sheetId } : {})
            });
            results.push(
              `Created lead: ${action.payload.name || action.payload.client_name}` + (sheetId ? ` in sheet ${action.payload.sheet_name}` : "")
            );
            break;

          case "CREATE_PROJECT": {
            const clients = (await dbService.list("clients")) as any[];
            const client = clients?.find(
              (c) =>
                c.name.toLowerCase() ===
                  action.payload.client_name.toLowerCase() ||
                c.brand.toLowerCase() ===
                  action.payload.client_name.toLowerCase(),
            );

            if (client) {
              await dbService.create("projects", {
                name: action.payload.project_name,
                clientId: client.id,
                status: "active",
                createdAt: now,
              });
              results.push(
                `Created project: ${action.payload.project_name} for ${client.name}`,
              );
            } else {
              // Auto-create client if it doesn't exist
              const newClientId = await dbService.create("clients", {
                name: action.payload.client_name,
                brand: action.payload.client_name,
                createdAt: now,
              });
              await dbService.create("projects", {
                name: action.payload.project_name,
                clientId: newClientId,
                status: "active",
                createdAt: now,
              });
              results.push(
                `Created client ${action.payload.client_name} and project ${action.payload.project_name}`,
              );
            }
            break;
          }

          case "CREATE_TASK": {
            const projects = (await dbService.list("projects")) as any[];
            const project = projects?.find(
              (p) =>
                p.name.toLowerCase() ===
                action.payload.project_name.toLowerCase(),
            );

            if (project) {
              const taskPayload: any = {
                title: action.payload.title,
                description: action.payload.description || "",
                priority: action.payload.priority || "medium",
                projectId: project.id,
                status: "todo",
                assigneeId: user.id, // Default to current user
                createdAt: now,
              };
              if (action.payload.deadline) {
                taskPayload.deadline = action.payload.deadline;
              }
              await dbService.create("tasks", taskPayload);
              results.push(
                `Created task: ${action.payload.title} in ${project.name}`,
              );
            } else {
              results.push(
                `Error: Project "${action.payload.project_name}" not found.`,
              );
            }
            break;
          }

          case "ASSIGN_TASK": {
            // Find user by name
            const users = (await dbService.list("users")) as any[];
            const targetUser = users?.find((u) =>
              u.name
                .toLowerCase()
                .includes(action.payload.assignee_name.toLowerCase()),
            );

            if (targetUser) {
              await dbService.update("tasks", action.payload.task_id, {
                assigneeId: targetUser.uid || targetUser.id,
              });
              results.push(`Assigned task to ${targetUser.name}`);
            } else {
              results.push(
                `Error: User "${action.payload.assignee_name}" not found.`,
              );
            }
            break;
          }

          case "UPDATE_TASK_STATUS":
            await dbService.update("tasks", action.payload.task_id, {
              status: action.payload.status,
            });
            results.push(`Updated task status to ${action.payload.status}`);
            break;

          case "ADD_PAYMENT":
          case "TRACK_PAYMENT": {
            const clients = (await dbService.list("clients")) as any[];
            const client = clients?.find(
              (c) =>
                c.name.toLowerCase() ===
                  action.payload.client_name.toLowerCase() ||
                c.brand.toLowerCase() ===
                  action.payload.client_name.toLowerCase(),
            );

            if (client) {
              const paymentPayload: any = {
                clientId: client.id,
                totalAmount:
                  action.payload.total_amount || action.payload.amount || 0,
                paidAmount: action.payload.paid_amount || 0,
                status:
                  (action.payload.paid_amount || 0) >=
                  (action.payload.total_amount || action.payload.amount || 0)
                    ? "paid"
                    : "pending",
                createdAt: now,
              };
              if (action.payload.due_date) {
                paymentPayload.dueDate = action.payload.due_date;
              }
              await dbService.create("payments", paymentPayload);
              results.push(`Tracked payment for ${client.name}`);
            } else {
              results.push(
                `Error: Client "${action.payload.client_name}" not found for payment.`,
              );
            }
            break;
          }

          case "SCHEDULE_MEETING": {
            const clients = (await dbService.list("clients")) as any[];
            const client = clients?.find(
              (c) =>
                c.name.toLowerCase() ===
                  action.payload.client_name.toLowerCase() ||
                c.brand.toLowerCase() ===
                  action.payload.client_name.toLowerCase(),
            );

            if (client) {
              await dbService.create("meetings", {
                clientId: client.id,
                title: action.payload.title || "Meeting",
                date: action.payload.date,
                time: action.payload.time || "",
                createdAt: now,
              });
              results.push(
                `Scheduled meeting with ${client.name} on ${action.payload.date}`,
              );
            } else {
              results.push(
                `Error: Client "${action.payload.client_name}" not found for meeting.`,
              );
            }
            break;
          }

          case "SET_REMINDER":
            await dbService.create("notifications", {
              message: action.payload.message,
              userId: user.id,
              read: false,
              type: "reminder",
              createdAt: now,
            });
            results.push(`Set reminder: ${action.payload.message}`);
            break;

          case "GET_STATUS": {
            if (action.payload.type === "client" && action.payload.name) {
              const clients = (await dbService.list("clients")) as any[];
              const client = clients?.find(
                (c) =>
                  c.name.toLowerCase() === action.payload.name.toLowerCase() ||
                  c.brand.toLowerCase() === action.payload.name.toLowerCase(),
              );
              if (client) {
                const projects = (await dbService.list("projects")) as any[];
                const clientProjects = projects.filter(
                  (p) => p.clientId === client.id,
                );
                results.push(
                  `Status for ${client.name}: ${clientProjects.length} projects found.`,
                );
              } else {
                results.push(`Client "${action.payload.name}" not found.`);
              }
            } else if (
              action.payload.type === "project" &&
              action.payload.name
            ) {
              const projects = (await dbService.list("projects")) as any[];
              const project = projects?.find(
                (p) =>
                  p.name.toLowerCase() === action.payload.name.toLowerCase(),
              );
              if (project) {
                const tasks = (await dbService.list("tasks")) as any[];
                const projectTasks = tasks.filter(
                  (t) => t.projectId === project.id,
                );
                const completed = projectTasks.filter(
                  (t) => t.status === "done" || t.status === "completed",
                ).length;
                results.push(
                  `Status for ${project.name}: ${completed}/${projectTasks.length} tasks completed.`,
                );
              } else {
                results.push(`Project "${action.payload.name}" not found.`);
              }
            } else {
              const clients = (await dbService.list("clients")) as any[];
              const projects = (await dbService.list("projects")) as any[];
              const tasks = (await dbService.list("tasks")) as any[];
              results.push(
                `Overall Status: ${clients.length} clients, ${projects.length} projects, ${tasks.length} tasks.`,
              );
            }
            break;
          }

          case "GET_CLIENT_DETAILS": {
            const clients = (await dbService.list("clients")) as any[];
            const client = clients?.find(
              (c) =>
                c.name.toLowerCase() ===
                  action.payload.client_name.toLowerCase() ||
                c.brand.toLowerCase() ===
                  action.payload.client_name.toLowerCase(),
            );
            if (client) {
              results.push(
                `Details for ${client.name}: Brand: ${client.brand}, Budget: ${client.totalBudget || "N/A"}, Terms: ${client.paymentTerms || "N/A"}`,
              );
            } else {
              results.push(`Client "${action.payload.client_name}" not found.`);
            }
            break;
          }

          case "CREATE_TEAM_MEMBER": {
            const memberId = action.payload.email;
            await dbService.set("users", memberId, {
              uid: memberId,
              name: action.payload.name,
              email: action.payload.email,
              role: action.payload.role || "team_member",
              createdAt: now,
            });

            // Send welcome email
            await notificationService.sendEmail(
              action.payload.email,
              "Welcome to Reelywood!",
              `Hi ${action.payload.name},\n\nYou have been added to the Reelywood team as a ${action.payload.role || "team_member"}. Log in to start managing tasks!`,
            );

            results.push(
              `Added team member: ${action.payload.name} (${action.payload.email}) and sent welcome email.`,
            );
            break;
          }

          case "ASSIGN_TASK_TO_MEMBER": {
            const users = (await dbService.list("users")) as any[];
            let targetUser = users?.find((u) =>
              u.name
                .toLowerCase()
                .includes(action.payload.assigned_to.toLowerCase()),
            );

            if (!targetUser) {
              results.push(
                `Error: Team member "${action.payload.assigned_to}" not found. Please add them first.`,
              );
              break;
            }

            const taskPayload: any = {
              title: action.payload.task_name,
              assigneeId: targetUser.uid || targetUser.id,
              status: "todo",
              priority: "medium",
              createdAt: now,
            };
            if (action.payload.deadline) {
              taskPayload.deadline = action.payload.deadline;
            }
            const taskId = await dbService.create("tasks", taskPayload);

            // Send notification
            await notificationService.sendNotification(
              targetUser.uid || targetUser.id,
              `New task assigned: ${action.payload.task_name}`,
              "task_assignment",
            );

            results.push(
              `Assigned "${action.payload.task_name}" to ${targetUser.name} and sent notification.`,
            );
            break;
          }

          case "SEND_NOTIFICATION": {
            if (action.payload.channel === "EMAIL") {
              await notificationService.sendEmail(
                action.payload.to,
                action.payload.subject || "Notification from WOODY",
                action.payload.message,
              );
              results.push(`Sent email notification to ${action.payload.to}`);
            } else {
              await dbService.create("notifications", {
                userId: action.payload.to,
                message: `[${action.payload.channel}] ${action.payload.subject}: ${action.payload.message}`,
                type: "notification",
                read: false,
                createdAt: now,
              });
              results.push(
                `Logged ${action.payload.channel} notification for ${action.payload.to}`,
              );
            }
            break;
          }

          case "GET_TEAM_TASKS": {
            const tasks = (await dbService.list("tasks")) as any[];
            const users = (await dbService.list("users")) as any[];

            if (action.payload.member_name) {
              const targetUser = users?.find((u) =>
                u.name
                  .toLowerCase()
                  .includes(action.payload.member_name.toLowerCase()),
              );
              if (targetUser) {
                const memberTasks = tasks.filter(
                  (t) => t.assigneeId === (targetUser.id || targetUser.uid),
                );
                results.push(
                  `Tasks for ${targetUser.name}: ${memberTasks.length} found.`,
                );
              } else {
                results.push(
                  `Team member "${action.payload.member_name}" not found.`,
                );
              }
            } else {
              results.push(`Total team tasks: ${tasks.length}`);
            }
            break;
          }

          case "CREATE_CALENDAR_EVENT": {
            const res = await calendarService.createEvent(
              action.payload.summary,
              action.payload.description || "",
              action.payload.startDateTime || action.payload.startIso,
              action.payload.endDateTime || action.payload.endIso,
            );
            results.push(
              `Created Google Calendar event: ${action.payload.summary} (Link: ${res.htmlLink})`,
            );
            break;
          }

          case "SEND_GMAIL": {
            const confirmed = window.confirm(
              `Send email via Gmail to ${action.payload.to} with subject "${action.payload.subject}"?`,
            );
            if (!confirmed) {
              results.push(`Cancelled email to ${action.payload.to}`);
              break;
            }
            await gmailService.sendEmail(
              action.payload.to,
              action.payload.subject,
              action.payload.body,
            );
            results.push(`Sent email to ${action.payload.to}`);
            break;
          }

          case "SEND_EMAIL": {
            try {
              const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
                  template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                  user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
                  template_params: {
                    to_email: action.payload.to_email,
                    subject: action.payload.subject,
                    message: action.payload.body,
                  },
                }),
              });

              if (!res.ok) {
                const errText = await res.text().catch(() => "");
                throw new Error(errText || `Failed with status ${res.status}`);
              }
              
              results.push(`Successfully sent email to ${action.payload.to_email} with subject "${action.payload.subject}"`);
            } catch (error: any) {
              console.error("Error sending email:", error);
              results.push(`Failed to send email to ${action.payload.to_email}: ${error.message}`);
            }
            break;
          }

          case "CREATE_GOOGLE_MEET_SPACE": {
            const res = await meetService.createMeetingSpace();
            results.push(`Created Google Meet space: ${res.meetingUri}`);
            break;
          }

          case "CREATE_GOOGLE_TASK": {
            const res = await tasksService.createTask(
              action.payload.title,
              action.payload.notes,
            );
            results.push(`Created Google Task: ${action.payload.title}`);
            break;
          }

          case "CREATE_GOOGLE_DOC": {
            const res = await docsService.createDocument(action.payload.title);
            results.push(
              `Created Google Doc: ${action.payload.title} (https://docs.google.com/document/d/${res.documentId}/edit)`,
            );
            break;
          }

          case "CREATE_GOOGLE_SHEET": {
            const res = await sheetsService.createSpreadsheet(
              action.payload.title,
            );
            results.push(
              `Created Google Sheet: ${action.payload.title} (https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/edit)`,
            );
            break;
          }

          case "SYNC_SOCIAL_MEDIA_SHEET": {
            const clients = (await dbService.list("clients")) as any[];
            const client = clients?.find(
              (c) =>
                c.name.toLowerCase() === action.payload.clientName.toLowerCase() ||
                c.brand.toLowerCase() === action.payload.clientName.toLowerCase(),
            );
            if (!client) {
              results.push(`Error: Client "${action.payload.clientName}" not found.`);
              break;
            }

            const match = action.payload.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (!match) {
              results.push(`Error: Invalid Google Sheet URL provided for syncing.`);
              break;
            }
            const spreadsheetId = match[1];

            await dbService.update("clients", client.id, { socialMediaSheetUrl: action.payload.sheetUrl });

            let projects = (await dbService.list("projects")) as any[];
            let projectId = projects.find(p => p.clientId === client.id && p.name.includes('Social Media'))?.id || projects.find(p => p.clientId === client.id)?.id;
            
            if (!projectId) {
              projectId = await dbService.create("projects", {
                clientId: client.id,
                name: `${client.name} - Social Media Calendar`,
                status: 'active',
                createdAt: now
              });
            }

            const sheetName = await sheetsService.getFirstSheetName(spreadsheetId);
            const res = await sheetsService.getSpreadsheetValues(spreadsheetId, `${sheetName}!A2:C`);
            const rows = res.values || [];
            let syncCount = 0;

            const existingTasks = (await dbService.list("tasks")) as any[];

            for (const row of rows) {
              const title = row[0];
              const dateStr = row[1];
              const notes = row[2] || '';
              if (!title) continue;

              let deadline = '';
              if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) deadline = d.toISOString();
              }

              const exists = existingTasks.some(t => t.projectId === projectId && t.title === title);
              if (!exists) {
                await dbService.create("tasks", {
                  projectId,
                  title,
                  description: notes,
                  status: 'todo',
                  priority: 'medium',
                  assigneeId: user.id,
                  deadline,
                  createdAt: now
                });
                
                if (deadline) {
                  try {
                    const startDate = new Date(deadline);
                    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                    await calendarService.createEvent(
                      `Social Media: ${title} (${client.name})`,
                      notes,
                      startDate.toISOString(),
                      endDate.toISOString()
                    );
                  } catch (err) {
                    console.error("Calendar event failed:", err);
                  }
                }
                syncCount++;
              }
            }
            results.push(`Synced ${syncCount} events from Social Media Sheet to ${client.name}'s calendar and tasks.`);
            break;
          }

          case "LIST_CLIENTS_AND_LEADS": {
            const clients = (await dbService.list("clients")) as any[];
            const leads = (await dbService.list("leads")) as any[];
            
            let resultStr = "**Current Clients:**\n";
            if (clients && clients.length > 0) {
              resultStr += clients.map(c => `- ${c.name} (${c.brand || 'No brand'})`).join("\n");
            } else {
              resultStr += "No clients found.\n";
            }
            
            resultStr += "\n\n**Current Leads:**\n";
            if (leads && leads.length > 0) {
              resultStr += leads.map(l => `- ${l.name} (${l.company || 'No company'}) - Status: ${l.status}`).join("\n");
            } else {
              resultStr += "No leads found.\n";
            }
            
            results.push(resultStr);
            break;
          }
        }
      } catch (e) {
        console.error("Action execution failed:", e);
        results.push(
          `Failed to execute ${action.type}: ${e instanceof Error ? (e.message.startsWith('{') ? JSON.parse(e.message).error : e.message) : "Unknown error"}`,
        );
      }
    }
    return results;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (isListening) {
      stopListening();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const aiText = await getAIResponse([...messages, userMessage]);
      const actions = extractActions(aiText);

      // Strip JSON from the display text if it exists
      const displayText = aiText
        .replace(/```(?:json)?\s*\{[\s\S]*"actions"[\s\S]*\}\s*```/g, "")
        .replace(/\{[\s\S]*"actions"[\s\S]*\}/g, "")
        .trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          displayText ||
          (actions.length > 0
            ? "I've processed your request."
            : "I'm not sure how to process that."),
        actions,
        status: actions.length > 0 ? "processing" : "success",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (actions.length > 0) {
        const results = await executeActions(actions);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: `${m.content}\n\n${results.map((r) => `• ${r}`).join("\n")}`,
                  status: "success",
                }
              : m,
          ),
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content:
            "Sorry, I encountered an error while processing your request.",
          status: "error",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div
        className="flex-1 overflow-y-auto w-full scroll-smooth"
        ref={scrollRef}
      >
        <div className="max-w-5xl mx-auto px-4 py-8 pb-32 space-y-8 flex flex-col">
          <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-4",
                message.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                  message.role === "user"
                    ? "bg-zinc-800 text-white"
                    : "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]",
                )}
              >
                {message.role === "user" ? (
                  <UserIcon size={18} />
                ) : (
                  <span className="font-bold">W</span>
                )}
              </div>
              <div
                className={cn(
                  "max-w-[75%] space-y-2",
                  message.role === "user" ? "text-right" : "text-left",
                )}
              >
                <div
                  className={cn(
                    "px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-xl backdrop-blur-md",
                    message.role === "user"
                      ? "bg-white/10 text-white border border-white/20 rounded-tr-sm"
                      : "bg-white/5 text-zinc-300 border border-white/10 rounded-tl-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.status === "processing" && (
                    <div className="mt-4 flex items-center gap-2 text-zinc-400 italic font-medium px-2 py-1.5 rounded-lg bg-white/5 w-fit">
                      <Loader2 size={14} className="animate-spin" />
                      Executing actions...
                    </div>
                  )}

                  {message.status === "success" && (
                    <div className="mt-4 flex items-center gap-2 text-white font-medium px-2 py-1.5 rounded-lg bg-white/10 w-fit">
                      <CheckCircle2 size={14} />
                      Actions completed
                    </div>
                  )}

                  {message.status === "error" && (
                    <div className="mt-4 flex items-center gap-2 text-zinc-300 font-medium px-2 py-1.5 rounded-lg bg-white/10 w-fit">
                      <AlertCircle size={14} />
                      Execution failed
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center shrink-0">
              <span className="font-bold">W</span>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md px-5 py-4 rounded-3xl rounded-tl-sm shadow-xl flex items-center h-[52px]">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-duration:1s]" />
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1s]" />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:1s]" />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="absolute bottom-6 left-4 right-4 max-w-4xl mx-auto z-20">
        <div className="relative group backdrop-blur-xl bg-zinc-900/60 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] p-2 transition-all focus-within:border-white/20 focus-within:bg-zinc-900/80">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask WOODY to manage clients, assign tasks, or schedule meetings..."
            className="w-full bg-transparent border-none px-6 py-4 pr-[120px] focus:outline-none focus:ring-0 text-white placeholder-zinc-500"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 p-1 rounded-3xl">
            <button
              onClick={toggleListening}
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300",
                isListening
                  ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-pulse"
                  : "bg-transparent text-zinc-400 hover:text-white hover:bg-white/10 hover:scale-105",
              )}
              title={isListening ? "Stop listening" : "Start Voice Command"}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-300"
            >
              <Send size={18} className="translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
