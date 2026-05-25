import React, { useState, useEffect } from "react";
import { Client, Project, Task } from "../types";
import { dbService } from "../services/dbService";
import { calendarService, sheetsService } from "../services/workspaceService";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ClientPortal({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  const [annotation, setAnnotation] = useState(client.annotation || "");
  const [sheetUrl, setSheetUrl] = useState(client.socialMediaSheetUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubProjects = dbService.subscribe("projects", (data: Project[]) => {
      setProjects(data.filter((p) => p.clientId === client.id));
    });

    const unsubTasks = dbService.subscribe("tasks", (data: Task[]) => {
      setTasks(data);
    });

    return () => {
      unsubProjects();
      unsubTasks();
    };
  }, [client.id]);

  const handleSaveAnnotation = async () => {
    setIsSaving(true);
    await dbService.update("clients", client.id, { annotation });
    setIsSaving(false);
  };

  const handleSyncSheet = async () => {
    setIsSyncingSheet(true);
    try {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error("Invalid Google Sheet URL");
      const spreadsheetId = match[1];

      if (client.socialMediaSheetUrl !== sheetUrl) {
        await dbService.update("clients", client.id, { socialMediaSheetUrl: sheetUrl });
      }

      const sheetName = await sheetsService.getFirstSheetName(spreadsheetId);
      const res = await sheetsService.getSpreadsheetValues(spreadsheetId, `${sheetName}!A2:C`);
      const rows = res.values || [];

      let projectId = projects[0]?.id;
      if (!projectId) {
        projectId = await dbService.create("projects", {
          clientId: client.id,
          name: `${client.name} - Social Media Calendar`,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }

      for (const row of rows) {
        const title = row[0];
        const dateStr = row[1];
        const notes = row[2] || '';
        if (!title) continue;

        let deadline = '';
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            deadline = d.toISOString();
          }
        }

        const exists = tasks.some(t => t.projectId === projectId && t.title === title);
        
        if (!exists) {
          await dbService.create("tasks", {
            projectId,
            title,
            description: notes,
            status: 'todo',
            priority: 'medium',
            assigneeId: 'system',
            deadline,
            createdAt: new Date().toISOString()
          });

          if (deadline) {
            try {
              const startDate = new Date(deadline);
              const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour duration
              await calendarService.createEvent(
                `Social Media: ${title} (${client.name})`,
                notes,
                startDate.toISOString(),
                endDate.toISOString()
              );
            } catch (err) {
              console.error("Failed to sync to gcal", err);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to sync sheet. Please ensure the URL is correct and you have granted permissions.");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const clientTasks = tasks.filter((t) =>
    projects.some((p) => p.id === t.projectId),
  );

  useEffect(() => {
    const checkNotifications = async () => {
      const now = new Date();
      for (const task of clientTasks) {
        if (task.status === "completed" || !task.deadline) continue;
        
        const deadline = new Date(task.deadline);
        // If deadline is reached or passed
        if (now.getTime() >= deadline.getTime()) {
          const tier = task.notificationTier || 0;
          if (tier < 3) {
            const lastNotif = task.lastNotificationAt ? new Date(task.lastNotificationAt) : new Date(0);
            
            // Wait at least 30s between tiers for demo purposes (normally would be hours/days)
            if (now.getTime() - lastNotif.getTime() > 30000) {
              const newTier = tier + 1;
              
              const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
              const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
              
              const text = `🚨 *Reminder [${newTier}/3]*\n*Client:* ${client.name}\n*Post Title:* ${task.title}\n*Due Date:* ${format(deadline, "MMM d, yyyy")}`;

              if (token && chatId) {
                try {
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                  });
                } catch (e) {
                  console.error("Telegram error:", e);
                }
              }
              
              await dbService.update("tasks", task.id, {
                notificationTier: newTier,
                lastNotificationAt: now.toISOString()
              });
            }
          }
        }
      }
    };
    
    // Check every 10 seconds
    const interval = setInterval(checkNotifications, 10000);
    // Initial check
    checkNotifications();
    return () => clearInterval(interval);
  }, [clientTasks]);

  const selectedDateTasks = selectedDate 
    ? clientTasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), selectedDate)) 
    : [];

  const completedTasks = clientTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const totalTasks = clientTasks.length;
  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="h-full flex flex-col p-8 space-y-8 overflow-y-auto">
      <header className="flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{client.name}</h2>
          <p className="text-zinc-500 text-sm">{client.brand} Portal</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        {/* Left Column: Details & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-lg">Project Progress</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Total Completion</span>
              <span className="text-sm font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-6">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-800">
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                  <AlertCircle size={14} /> Active Projects
                </div>
                <div className="text-2xl font-bold text-white">
                  {projects.filter((p) => p.status === "active").length}
                </div>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-800">
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Completed Tasks
                </div>
                <div className="text-2xl font-bold text-white">
                  {completedTasks} / {totalTasks}
                </div>
              </div>
            </div>
          </div>

          {/* Annotation Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">
            <h3 className="font-semibold mb-4 text-lg">Client Annotation</h3>
            <textarea
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              placeholder="Add private notes, meeting summaries, or special requirements for this client..."
              className="flex-1 w-full bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-zinc-500 transition-all resize-none min-h-[200px] mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveAnnotation}
                disabled={isSaving}
                className="bg-white text-black px-6 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Calendar & Details */}
        <div className="space-y-6">
          {/* Client Details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-lg">Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
                  Contact (Email)
                </p>
                <p className="text-sm mt-1">{client.contact || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
                  Contact Number
                </p>
                <p className="text-sm mt-1">{client.contactNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
                  Payment Terms
                </p>
                <p className="text-sm mt-1">{client.paymentTerms || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
                  Services
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(client.services) ? client.services : typeof client.services === 'string' ? (client.services as string).split(',') : []).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 bg-zinc-800 rounded-md text-xs border border-zinc-700"
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Integration */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <LinkIcon size={18} /> Social Media Sheet
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Google Sheet URL"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-500"
              />
              <button
                onClick={handleSyncSheet}
                disabled={isSyncingSheet || !sheetUrl.trim()}
                className="w-full py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm"
              >
                {isSyncingSheet ? 'Syncing...' : 'Sync to Calendar & Tasks'}
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CalendarIcon size={18} /> Calendar
              </h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={prevMonth}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                >
                  &lt;
                </button>
                <span className="text-sm font-medium w-20 text-center">
                  {format(currentDate, dateFormat)}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-bold text-zinc-500 uppercase"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);

                const hasDeadline = clientTasks.some(
                  (t) => t.deadline && isSameDay(new Date(t.deadline), day),
                );

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (hasDeadline || isCurrentMonth) {
                        setSelectedDate(day);
                      }
                    }}
                    className={cn(
                      "h-8 flex flex-col items-center justify-center text-xs rounded-md relative cursor-pointer",
                      !isCurrentMonth ? "text-zinc-700" : "text-zinc-300",
                      isTodayDate && "bg-white text-black font-bold",
                      (!isTodayDate && isCurrentMonth) && "hover:bg-zinc-800",
                      (selectedDate && isSameDay(selectedDate, day)) && "bg-zinc-700 font-bold text-white ring-1 ring-zinc-500"
                    )}
                  >
                    <span>{format(day, "d")}</span>
                    {hasDeadline && !isTodayDate && (
                      <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Modal (Slide-over panel) */}
      {selectedDate && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl z-50 flex flex-col transition-transform transform translate-x-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">{format(selectedDate, "MMMM d, yyyy")}</h3>
            <button onClick={() => setSelectedDate(null)} className="text-zinc-400 hover:text-white p-2">
              &times;
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedDateTasks.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center mt-10">No tasks for this day.</p>
            ) : (
              selectedDateTasks.map(t => (
                <div key={t.id} className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h4 className="font-semibold text-sm flex-1">{t.title}</h4>
                    <button
                      onClick={async () => {
                        const newStatus = t.status === "completed" ? "todo" : "completed";
                        await dbService.update("tasks", t.id, { status: newStatus });
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer border whitespace-nowrap", 
                        t.status === "completed" 
                          ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" 
                          : "bg-zinc-700 text-zinc-300 border-zinc-600 hover:bg-zinc-600"
                      )}
                    >
                      {t.status === "completed" ? "Done" : "Mark as Done"}
                    </button>
                  </div>
                  {t.description && (
                    <p className="text-xs text-zinc-400 mb-2 p-2 bg-zinc-900/50 rounded-md">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs mt-auto">
                    <span className="text-zinc-500 uppercase flex items-center gap-1">
                      Status: <span className={cn("font-medium", t.status === "completed" ? "text-green-500" : "text-amber-500")}>
                        {t.status.replace("_", " ")}
                      </span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
