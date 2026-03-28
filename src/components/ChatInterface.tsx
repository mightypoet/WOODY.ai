import React, { useState, useRef, useEffect } from 'react';
import { User, AIAction } from '../types';
import { getAIResponse, extractActions } from '../services/aiService';
import { dbService } from '../services/dbService';
import { Send, Loader2, Bot, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AIAction[];
  status?: 'processing' | 'success' | 'error';
}

export default function ChatInterface({ user }: { user: User }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello ${user.name}, I'm WOODY. How can I help you manage Reelywood today?`,
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const executeActions = async (actions: AIAction[]) => {
    const results = [];
    for (const action of actions) {
      try {
        const now = new Date().toISOString();
        switch (action.type) {
          case 'CREATE_CLIENT':
            await dbService.create('clients', { 
              name: action.payload.client_name,
              brand: action.payload.brand || action.payload.client_name,
              contact: action.payload.contact || '',
              services: action.payload.services || [],
              paymentTerms: action.payload.payment_terms || '',
              totalBudget: action.payload.deal_value || action.payload.totalBudget || 0,
              createdAt: now 
            });
            results.push(`Created client: ${action.payload.client_name}`);
            break;

          case 'CREATE_PROJECT': {
            const clients = (await dbService.list('clients')) as any[];
            const client = clients?.find(c => 
              c.name.toLowerCase() === action.payload.client_name.toLowerCase() || 
              c.brand.toLowerCase() === action.payload.client_name.toLowerCase()
            );
            
            if (client) {
              await dbService.create('projects', { 
                name: action.payload.project_name,
                clientId: client.id, 
                status: 'active',
                createdAt: now 
              });
              results.push(`Created project: ${action.payload.project_name} for ${client.name}`);
            } else {
              // Auto-create client if it doesn't exist
              const newClientId = await dbService.create('clients', {
                name: action.payload.client_name,
                brand: action.payload.client_name,
                createdAt: now
              });
              await dbService.create('projects', { 
                name: action.payload.project_name,
                clientId: newClientId, 
                status: 'active',
                createdAt: now 
              });
              results.push(`Created client ${action.payload.client_name} and project ${action.payload.project_name}`);
            }
            break;
          }

          case 'CREATE_TASK': {
            const projects = (await dbService.list('projects')) as any[];
            const project = projects?.find(p => p.name.toLowerCase() === action.payload.project_name.toLowerCase());
            
            if (project) {
              await dbService.create('tasks', { 
                title: action.payload.title,
                description: action.payload.description || '',
                priority: action.payload.priority || 'medium',
                deadline: action.payload.deadline || '',
                projectId: project.id, 
                status: 'todo',
                assigneeId: user.uid, // Default to current user
                createdAt: now 
              });
              results.push(`Created task: ${action.payload.title} in ${project.name}`);
            } else {
              results.push(`Error: Project "${action.payload.project_name}" not found.`);
            }
            break;
          }

          case 'ASSIGN_TASK': {
            // Find user by name
            const users = (await dbService.list('users')) as any[];
            const targetUser = users?.find(u => u.name.toLowerCase().includes(action.payload.assignee_name.toLowerCase()));
            
            if (targetUser) {
              await dbService.update('tasks', action.payload.task_id, { assigneeId: targetUser.uid || targetUser.id });
              results.push(`Assigned task to ${targetUser.name}`);
            } else {
              results.push(`Error: User "${action.payload.assignee_name}" not found.`);
            }
            break;
          }

          case 'UPDATE_TASK_STATUS':
            await dbService.update('tasks', action.payload.task_id, { status: action.payload.status });
            results.push(`Updated task status to ${action.payload.status}`);
            break;

          case 'ADD_PAYMENT':
          case 'TRACK_PAYMENT': {
            const clients = (await dbService.list('clients')) as any[];
            const client = clients?.find(c => 
              c.name.toLowerCase() === action.payload.client_name.toLowerCase() || 
              c.brand.toLowerCase() === action.payload.client_name.toLowerCase()
            );
            
            if (client) {
              await dbService.create('payments', { 
                clientId: client.id,
                totalAmount: action.payload.total_amount || action.payload.amount || 0,
                paidAmount: action.payload.paid_amount || 0,
                dueDate: action.payload.due_date || '',
                status: (action.payload.paid_amount || 0) >= (action.payload.total_amount || action.payload.amount || 0) ? 'paid' : 'pending',
                createdAt: now 
              });
              results.push(`Tracked payment for ${client.name}`);
            } else {
              results.push(`Error: Client "${action.payload.client_name}" not found for payment.`);
            }
            break;
          }

          case 'SCHEDULE_MEETING': {
            const clients = (await dbService.list('clients')) as any[];
            const client = clients?.find(c => 
              c.name.toLowerCase() === action.payload.client_name.toLowerCase() || 
              c.brand.toLowerCase() === action.payload.client_name.toLowerCase()
            );
            
            if (client) {
              await dbService.create('meetings', { 
                clientId: client.id,
                title: action.payload.title || 'Meeting',
                date: action.payload.date,
                time: action.payload.time || '',
                createdAt: now 
              });
              results.push(`Scheduled meeting with ${client.name} on ${action.payload.date}`);
            } else {
              results.push(`Error: Client "${action.payload.client_name}" not found for meeting.`);
            }
            break;
          }

          case 'SET_REMINDER':
            await dbService.create('notifications', { 
              message: action.payload.message,
              userId: user.uid,
              read: false,
              type: 'reminder',
              createdAt: now 
            });
            results.push(`Set reminder: ${action.payload.message}`);
            break;

          case 'GET_STATUS': {
            if (action.payload.type === 'client' && action.payload.name) {
              const clients = (await dbService.list('clients')) as any[];
              const client = clients?.find(c => c.name.toLowerCase() === action.payload.name.toLowerCase() || c.brand.toLowerCase() === action.payload.name.toLowerCase());
              if (client) {
                const projects = (await dbService.list('projects')) as any[];
                const clientProjects = projects.filter(p => p.clientId === client.id);
                results.push(`Status for ${client.name}: ${clientProjects.length} projects found.`);
              } else {
                results.push(`Client "${action.payload.name}" not found.`);
              }
            } else if (action.payload.type === 'project' && action.payload.name) {
              const projects = (await dbService.list('projects')) as any[];
              const project = projects?.find(p => p.name.toLowerCase() === action.payload.name.toLowerCase());
              if (project) {
                const tasks = (await dbService.list('tasks')) as any[];
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const completed = projectTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
                results.push(`Status for ${project.name}: ${completed}/${projectTasks.length} tasks completed.`);
              } else {
                results.push(`Project "${action.payload.name}" not found.`);
              }
            } else {
              const clients = (await dbService.list('clients')) as any[];
              const projects = (await dbService.list('projects')) as any[];
              const tasks = (await dbService.list('tasks')) as any[];
              results.push(`Overall Status: ${clients.length} clients, ${projects.length} projects, ${tasks.length} tasks.`);
            }
            break;
          }

          case 'GET_CLIENT_DETAILS': {
            const clients = (await dbService.list('clients')) as any[];
            const client = clients?.find(c => 
              c.name.toLowerCase() === action.payload.client_name.toLowerCase() || 
              c.brand.toLowerCase() === action.payload.client_name.toLowerCase()
            );
            if (client) {
              results.push(`Details for ${client.name}: Brand: ${client.brand}, Budget: ${client.totalBudget || 'N/A'}, Terms: ${client.paymentTerms || 'N/A'}`);
            } else {
              results.push(`Client "${action.payload.client_name}" not found.`);
            }
            break;
          }

          case 'CREATE_TEAM_MEMBER': {
            const memberId = action.payload.email;
            await dbService.set('users', memberId, {
              uid: memberId,
              name: action.payload.name,
              email: action.payload.email,
              role: action.payload.role || 'team_member',
              createdAt: now
            });
            results.push(`Added team member: ${action.payload.name} (${action.payload.email})`);
            break;
          }

          case 'ASSIGN_TASK_TO_MEMBER': {
            const users = (await dbService.list('users')) as any[];
            let targetUser = users?.find(u => u.name.toLowerCase().includes(action.payload.assigned_to.toLowerCase()));
            
            if (!targetUser) {
              results.push(`Error: Team member "${action.payload.assigned_to}" not found. Please add them first.`);
              break;
            }

            await dbService.create('tasks', {
              title: action.payload.task_name,
              assigneeId: targetUser.uid || targetUser.id,
              deadline: action.payload.deadline || '',
              status: 'todo',
              priority: 'medium',
              createdAt: now
            });
            results.push(`Assigned "${action.payload.task_name}" to ${targetUser.name}`);
            break;
          }

          case 'SEND_NOTIFICATION': {
            await dbService.create('notifications', {
              userId: action.payload.to, // Using email as a proxy for ID if needed
              message: `[${action.payload.channel}] ${action.payload.subject}: ${action.payload.message}`,
              type: 'email_simulation',
              read: false,
              createdAt: now
            });
            results.push(`Sent ${action.payload.channel} notification to ${action.payload.to}`);
            break;
          }

          case 'GET_TEAM_TASKS': {
            const tasks = (await dbService.list('tasks')) as any[];
            const users = (await dbService.list('users')) as any[];
            
            if (action.payload.member_name) {
              const targetUser = users?.find(u => u.name.toLowerCase().includes(action.payload.member_name.toLowerCase()));
              if (targetUser) {
                const memberTasks = tasks.filter(t => t.assigneeId === (targetUser.id || targetUser.uid));
                results.push(`Tasks for ${targetUser.name}: ${memberTasks.length} found.`);
              } else {
                results.push(`Team member "${action.payload.member_name}" not found.`);
              }
            } else {
              results.push(`Total team tasks: ${tasks.length}`);
            }
            break;
          }
        }
      } catch (e) {
        console.error("Action execution failed:", e);
        results.push(`Failed to execute ${action.type}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
    return results;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const aiText = await getAIResponse(input);
      const actions = extractActions(aiText);
      
      // Strip JSON from the display text if it exists
      const displayText = aiText.replace(/\{[\s\S]*"actions"[\s\S]*\}/, '').trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayText || (actions.length > 0 ? "I've processed your request." : "I'm not sure how to process that."),
        actions,
        status: actions.length > 0 ? 'processing' : 'success'
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (actions.length > 0) {
        const results = await executeActions(actions);
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { 
                ...m, 
                content: `${m.content}\n\n${results.map(r => `• ${r}`).join('\n')}`, 
                status: 'success' 
              } 
            : m
        ));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request.",
        status: 'error'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-4">
      <div className="flex-1 overflow-y-auto py-8 space-y-8 scroll-smooth" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === 'user' ? "bg-zinc-800" : "bg-white text-black"
              )}>
                {message.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn(
                "max-w-[80%] space-y-2",
                message.role === 'user' ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  message.role === 'user' 
                    ? "bg-zinc-800 text-zinc-100" 
                    : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                )}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {message.status === 'processing' && (
                    <div className="mt-4 flex items-center gap-2 text-zinc-500 italic">
                      <Loader2 size={14} className="animate-spin" />
                      Executing actions...
                    </div>
                  )}
                  
                  {message.status === 'success' && (
                    <div className="mt-4 flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 size={14} />
                      All actions completed successfully.
                    </div>
                  )}

                  {message.status === 'error' && (
                    <div className="mt-4 flex items-center gap-2 text-red-500">
                      <AlertCircle size={14} />
                      Something went wrong.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="py-8">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your instructions here..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:border-zinc-700 transition-all text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 text-center mt-4 uppercase tracking-widest">
          WOODY can manage clients, projects, tasks, payments, and team members.
        </p>
      </div>
    </div>
  );
}
