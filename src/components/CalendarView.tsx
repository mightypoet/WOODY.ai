import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Task, Project, Client } from '../types';
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
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function CalendarView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubTasks = dbService.subscribe("tasks", (data: Task[]) => setTasks(data.filter(t => t.deadline)));
    const unsubProj = dbService.subscribe("projects", (data: Project[]) => setProjects(data));
    const unsubClients = dbService.subscribe("clients", (data: Client[]) => setClients(data));
    
    return () => {
      unsubTasks();
      unsubProj();
      unsubClients();
    };
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const parseDate = (d: string) => {
    if (!d) return new Date();
    if (d.length === 10 && d.includes("-")) {
      const [y, m, day] = d.split('-');
      return new Date(parseInt(y), parseInt(m)-1, parseInt(day));
    }
    return new Date(d);
  };

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (t.deadline) {
        const dateKey = format(parseDate(t.deadline), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const clientByProject = useMemo(() => {
    const map = new Map<string, Client | null>();
    const clientMap = new Map<string, Client>();
    clients.forEach(c => clientMap.set(c.id, c));
    
    projects.forEach(p => {
       map.set(p.id, clientMap.get(p.clientId) || null);
    });
    return map;
  }, [projects, clients]);

  const getClientForTask = (projectId?: string) => {
    if (!projectId) return null;
    return clientByProject.get(projectId) || null;
  };

  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-cyan-500", "bg-fuchsia-500", "bg-blue-500"];
  
  const getClientColor = (clientId: string) => {
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
        hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const selectedDateTasks = selectedDateStr ? tasksByDay.get(selectedDateStr) || [] : [];

  return (
    <div className="h-full flex flex-col p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
      <header className="flex items-center justify-between shrink-0">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-zinc-500 text-sm">
            Operational event dates and scheduled client tasks.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button onClick={prevMonth} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-sm w-32 text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <button onClick={nextMonth} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col xl:flex-row gap-8 min-h-0 overflow-y-auto xl:overflow-hidden pb-6 xl:pb-0">
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-8 flex flex-col min-h-0">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-bold text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-4 flex-1">
            {days.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(dayStr) || [];

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col rounded-2xl p-2 relative cursor-pointer border transition-all h-24 overflow-hidden",
                    !isCurrentMonth ? "border-transparent opacity-30" : "border-zinc-800/50 bg-zinc-800/20",
                    isTodayDate && "ring-2 ring-indigo-500 bg-indigo-500/10",
                    (!isTodayDate && isCurrentMonth) && "hover:border-zinc-600 hover:bg-zinc-800/50",
                    (selectedDate && isSameDay(selectedDate, day)) && "border-zinc-500 ring-1 ring-zinc-500"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold mb-1",
                    isTodayDate ? "text-indigo-400" : "text-zinc-400"
                  )}>
                    {format(day, "d")}
                  </span>
                  
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden pointer-events-none">
                    {dayTasks.slice(0, 3).map(task => {
                      const client = getClientForTask(task.projectId);
                      const colorClass = client ? getClientColor(client.id) : "bg-zinc-600";
                      
                      return (
                        <div key={task.id} className={cn(
                          "text-[10px] truncate px-1.5 py-0.5 rounded-md flex items-center gap-1",
                          task.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-white/10 text-zinc-300"
                        )}>
                          {client && (
                             <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorClass)} />
                          )}
                          <span className="truncate">{task.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[9px] text-zinc-500 font-medium px-1">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-4 min-h-0 xl:overflow-y-auto">
          {selectedDate ? (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-1">{format(selectedDate, "EEEE")}</h3>
                <p className="text-sm text-zinc-500">{format(selectedDate, "MMMM d, yyyy")}</p>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/30">
                  <CalendarIcon size={32} className="opacity-20 mb-4" />
                  <p className="text-sm">No tasks scheduled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateTasks.map(t => {
                    const client = getClientForTask(t.projectId);
                    const colorClass = client ? getClientColor(client.id) : "bg-zinc-600";
                    return (
                      <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-700 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {client && (
                              <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-black", colorClass)}>
                                {client.name.substring(0,2)}
                              </div>
                            )}
                            <h4 className={cn(
                              "font-semibold text-sm",
                              t.status === "completed" && "line-through text-zinc-500"
                            )}>{t.title}</h4>
                          </div>
                          {t.status === "completed" && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
                        </div>
                        {t.description && (
                          <p className="text-xs text-zinc-500 line-clamp-2">{t.description}</p>
                        )}
                        <div className="flex justify-between items-center mt-4">
                          <span className={cn(
                            "text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md",
                            t.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/30 p-6 text-center space-y-4">
              <CalendarIcon size={32} className="opacity-20" />
              <p className="text-sm">Select a date on the calendar to view scheduled tasks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
