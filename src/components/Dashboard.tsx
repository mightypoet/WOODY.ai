import React, { useState, useEffect } from 'react';
import { User, Client, Project, Task, Payment } from '../types';
import { dbService } from '../services/dbService';
import { Users, Briefcase, CheckCircle2, Clock, CreditCard, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { safeFormat } from '../lib/dateUtils';

export default function Dashboard({ user }: { user: User }) {
  const [stats, setStats] = useState({
    clients: 0,
    projects: 0,
    tasks: 0,
    payments: 0,
    pendingAmount: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const unsubClients = dbService.subscribe('clients', (data) => setStats(prev => ({ ...prev, clients: data.length })));
    const unsubProjects = dbService.subscribe('projects', (data) => setStats(prev => ({ ...prev, projects: data.length })));
    const unsubTasks = dbService.subscribe('tasks', (data) => {
      setStats(prev => ({ ...prev, tasks: data.length }));
      setRecentTasks(data.slice(0, 5));
    });
    const unsubPayments = dbService.subscribe('payments', (data) => {
      setStats(prev => ({ ...prev, payments: data.length }));
      setRecentPayments(data.slice(0, 5));
      const pending = data.reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0);
      setStats(prev => ({ ...prev, pendingAmount: pending }));
    });

    return () => {
      unsubClients();
      unsubProjects();
      unsubTasks();
      unsubPayments();
    };
  }, []);

  const cards = [
    { label: 'Active Clients', value: stats.clients, icon: Users, color: 'text-blue-500' },
    { label: 'Ongoing Projects', value: stats.projects, icon: Briefcase, color: 'text-purple-500' },
    { label: 'Pending Tasks', value: stats.tasks, icon: Clock, color: 'text-orange-500' },
    { label: 'Total Revenue', value: `₹${stats.pendingAmount.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500 text-sm">Welcome back, {user.name}. Here's what's happening at Reelywood.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4"
          >
            <div className={`w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              Recent Tasks
            </h3>
            <button className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentTasks.length > 0 ? recentTasks.map((task) => (
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-zinc-500">{task.status.replace('_', ' ')}</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter",
                  task.priority === 'high' ? "bg-red-500/10 text-red-500" :
                  task.priority === 'medium' ? "bg-orange-500/10 text-orange-500" :
                  "bg-emerald-500/10 text-emerald-500"
                )}>
                  {task.priority}
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-zinc-500 text-sm italic">No tasks found.</div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard size={18} className="text-blue-500" />
              Recent Payments
            </h3>
            <button className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentPayments.length > 0 ? recentPayments.map((payment) => (
              <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-1">
                  <p className="text-sm font-medium">₹{payment.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500">Due: {safeFormat(payment.dueDate)}</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter",
                  payment.status === 'overdue' ? "bg-red-500/10 text-red-500" :
                  payment.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" :
                  "bg-blue-500/10 text-blue-500"
                )}>
                  {payment.status}
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-zinc-500 text-sm italic">No payments found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
