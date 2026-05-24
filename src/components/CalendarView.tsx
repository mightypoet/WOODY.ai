import React from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';

export default function CalendarView() {
  return (
    <div className="h-full flex flex-col p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-zinc-500 text-sm">
            Operational event dates and scheduled client tasks.
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/30">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-md"
        >
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-zinc-700">
            <CalendarIcon size={32} className="text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Calendar Sync Infrastructure</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The calendar view is currently serving as a dedicated structural placeholder. Operational event dates from synced Client Social Media Calendars will populate here once the integration is fully connected.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest pt-4">
            <Clock size={14} />
            <span>Pending Integration</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
