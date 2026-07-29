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
  const [emailServiceStatus, setEmailServiceStatus] = useState<'loading' | 'configured' | 'missing'>('loading');

  useEffect(() => {
    const checkEmailStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setEmailServiceStatus(data.emailServiceConfigured ? 'configured' : 'missing');
      } catch (error) {
        console.error("Failed to check email status:", error);
        setEmailServiceStatus('missing');
      }
    };
    checkEmailStatus();

    const unsubClients = dbService.subscribe('clients', (data) => setStats(prev => ({ ...prev, clients: data.length })));
    const unsubProjects = dbService.subscribe('projects', (data) => {
      const uniqueProjects = Array.from(new Map(data.map(p => [p.name, p])).values());
      setStats(prev => ({ ...prev, projects: uniqueProjects.length }));
    });
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
    { label: 'Active Clients', value: stats.clients, icon: Users, color: 'text-white' },
    { label: 'Ongoing Projects', value: stats.projects, icon: Briefcase, color: 'text-white' },
    { label: 'Pending Tasks', value: stats.tasks, icon: Clock, color: 'text-zinc-400' },
    { label: 'Total Revenue', value: `₹${stats.pendingAmount.toLocaleString()}`, icon: TrendingUp, color: 'text-white' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-zinc-500 text-sm">Welcome back, {user.name}. Here's what's happening at Reelywood.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: user.email,
                    subject: 'Test Email from WOODY',
                    html: '<p>This is a test email to verify your Resend configuration.</p>'
                  })
                });
                const data = await response.json();
                if (response.ok) {
                  alert('Test email sent successfully! Check your inbox.');
                } else {
                  alert(`Failed to send test email: ${data.error}`);
                }
              } catch (error) {
                alert('Error sending test email. Check console for details.');
                console.error(error);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
          >
            Test Email
          </button>
          <div className={cn(
            "px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
            emailServiceStatus === 'configured' ? "bg-white/10 border-white/20 text-white" :
            emailServiceStatus === 'loading' ? "bg-zinc-800 border-zinc-700 text-zinc-500" :
            "bg-white/5 border-white/10 text-zinc-400"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              emailServiceStatus === 'configured' ? "bg-white animate-pulse" :
              emailServiceStatus === 'loading' ? "bg-zinc-500" :
              "bg-zinc-600"
            )} />
            {emailServiceStatus === 'configured' ? 'Email Service Active' : 
             emailServiceStatus === 'loading' ? 'Checking Service...' : 
             'Email Service Not Configured'}
          </div>
        </div>
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
              <CheckCircle2 size={18} className="text-white" />
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
                  task.priority === 'high' ? "bg-white/10 text-white" :
                  task.priority === 'medium' ? "bg-white/5 text-zinc-300" :
                  "bg-transparent text-zinc-500 border border-zinc-700"
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
              <CreditCard size={18} className="text-white" />
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
                  payment.status === 'overdue' ? "bg-white/10 text-white" :
                  payment.status === 'paid' ? "bg-transparent text-zinc-500 border border-zinc-700" :
                  "bg-white/5 text-zinc-300"
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
