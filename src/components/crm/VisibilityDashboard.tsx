import React, { useState, useEffect } from "react";
import { Lead, DailyActivity } from "../../types";
import { dbService } from "../../services/dbService";
import DailyActivityModal from "./DailyActivityModal";

export default function VisibilityDashboard({ leads }: { leads: Lead[] }) {
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [repFilter, setRepFilter] = useState("");
  const [dateRange, setDateRange] = useState("this_month");
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const data = await dbService.list("daily_activities");
      setActivities(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter leads based on rep filter
  const filteredLeads = leads.filter(l => 
    !repFilter || l.setter_name === repFilter || l.closer_name === repFilter
  );

  const filteredActivities = activities.filter(a => 
    !repFilter || a.rep_name === repFilter
  );

  const totalDials = filteredActivities.reduce((acc, a) => acc + (a.dials || 0), 0);
  const totalDMs = filteredActivities.reduce((acc, a) => acc + (a.dms || 0), 0);
  
  const meetingsScheduled = filteredLeads.filter(l => l.meeting_status).length;
  const meetingsCompleted = filteredLeads.filter(l => l.meeting_status === "Completed").length;
  const meetingsShowRate = meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0;
  
  let totalLagDays = 0;
  let lagCount = 0;
  filteredLeads.forEach(l => {
    if (l.first_contact_date && l.date_of_meeting) {
      const lag = (new Date(l.date_of_meeting).getTime() - new Date(l.first_contact_date).getTime()) / (1000 * 3600 * 24);
      if (lag >= 0) {
        totalLagDays += lag;
        lagCount++;
      }
    }
  });
    let totalSpeedHours = 0;
  let speedCount = 0;
  filteredLeads.forEach(l => {
    if (l.createdAt && l.first_contact_date) {
      const ms = new Date(l.first_contact_date).getTime() - new Date(l.createdAt).getTime();
      const hrs = ms / (1000 * 3600);
      if (hrs >= 0) {
        totalSpeedHours += hrs;
        speedCount++;
      }
    }
  });
  const avgSpeedToLead = speedCount > 0 ? totalSpeedHours / speedCount : 0;

  const avgBookingLag = lagCount > 0 ? totalLagDays / lagCount : 0;

  const wonLeads = filteredLeads.filter(l => l.status === "Won");
  const closeRate = meetingsCompleted > 0 ? (wonLeads.length / meetingsCompleted) * 100 : 0;
  
  const totalRevenue = wonLeads.reduce((acc, l) => acc + (l.total_deal_value || 0), 0);
  const totalCashCollected = filteredLeads.reduce((acc, l) => acc + (l.cash_collected || 0), 0);
  const avgDealSize = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;
  const rpc = meetingsCompleted > 0 ? totalRevenue / meetingsCompleted : 0;

  const lossReasons = filteredLeads.filter(l => l.status === "Lost" && l.loss_reason).reduce((acc: any, l) => {
    acc[l.loss_reason!] = (acc[l.loss_reason!] || 0) + 1;
    return acc;
  }, {});

  const revenueGoal = 1000000;
  const goalCompletion = (totalRevenue / revenueGoal) * 100;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/20 backdrop-blur-sm rounded-2xl border border-white/5 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Visibility Dashboard</h3>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Filter by Rep Name" 
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none"
          />
          <select 
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="ytd">Year to Date</option>
          </select>
          <button 
            onClick={() => setShowActivityModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl text-sm font-medium transition-colors"
          >
            Log Activity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Setter Metrics */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Setter Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{avgSpeedToLead.toFixed(1)}h</p>
              <p className="text-xs text-zinc-500">Speed to Lead</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalDials}</p>
              <p className="text-xs text-zinc-500">Dials</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalDMs}</p>
              <p className="text-xs text-zinc-500">DMs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{avgBookingLag.toFixed(1)}d</p>
              <p className="text-xs text-zinc-500">Booking Lag</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{meetingsShowRate.toFixed(1)}%</p>
              <p className="text-xs text-zinc-500">Show Rate</p>
            </div>
          </div>
        </div>

        {/* Closer Metrics */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Closer Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{closeRate.toFixed(1)}%</p>
              <p className="text-xs text-zinc-500">Close Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">₹{avgDealSize.toFixed(0)}</p>
              <p className="text-xs text-zinc-500">Avg Deal Size</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">₹{rpc.toFixed(0)}</p>
              <p className="text-xs text-zinc-500">Rev Per Call</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{wonLeads.length}</p>
              <p className="text-xs text-zinc-500">Total Deals</p>
            </div>
          </div>
        </div>

        {/* Money Metrics */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Money Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-emerald-400">₹{totalCashCollected}</p>
              <p className="text-xs text-zinc-500">Cash Collected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-400">₹{totalRevenue}</p>
              <p className="text-xs text-zinc-500">Total Contract Value</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">Goal Completion</span>
              <span className="text-white">{goalCompletion.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(goalCompletion, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Loss Reason Breakdown</h4>
          {Object.keys(lossReasons).length > 0 ? (
            <ul className="space-y-2">
              {Object.entries(lossReasons).map(([reason, count]) => (
                <li key={reason} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{reason}</span>
                  <span className="text-white font-medium">{count as React.ReactNode}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">No lost deals yet.</p>
          )}
        </div>
        
        {/* Projection Module */}
        <div className="bg-zinc-900/50 border border-indigo-500/20 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">Projection Module</h4>
          <p className="text-xs text-zinc-400 mb-4">Forecast based on {meetingsScheduled} scheduled meetings, {meetingsShowRate.toFixed(1)}% show rate, {closeRate.toFixed(1)}% close rate, and ₹{avgDealSize.toFixed(0)} avg deal size.</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-sm text-zinc-300">Worst Case (50% of expected)</span>
              <span className="text-lg font-bold text-red-400">₹{((meetingsScheduled * (meetingsShowRate/100) * (closeRate/100) * avgDealSize) * 0.5).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-sm text-zinc-300">Expected Case</span>
              <span className="text-lg font-bold text-indigo-400">₹{(meetingsScheduled * (meetingsShowRate/100) * (closeRate/100) * avgDealSize).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-300">Best Case (150% of expected)</span>
              <span className="text-lg font-bold text-emerald-400">₹{((meetingsScheduled * (meetingsShowRate/100) * (closeRate/100) * avgDealSize) * 1.5).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      <DailyActivityModal 
        isOpen={showActivityModal} 
        onClose={() => setShowActivityModal(false)} 
        onSuccess={() => {
          setShowActivityModal(false);
          fetchActivities();
        }}
      />
    </div>
  );
}
