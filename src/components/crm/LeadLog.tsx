import React, { useState } from "react";
import { Lead } from "../../types";

export default function LeadLog({ leads }: { leads: Lead[] }) {
  const [sortField, setSortField] = useState<keyof Lead>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");

  const sortedAndFiltered = leads
    .filter(l => 
      (l.name?.toLowerCase() || "").includes(filter.toLowerCase()) || 
      (l.company?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (l.status?.toLowerCase() || "").includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const isLeak = (lead: Lead) => {
    if (lead.status === "Follow-Up Ongoing" && lead.last_touch_date) {
      const days = (new Date().getTime() - new Date(lead.last_touch_date).getTime()) / (1000 * 3600 * 24);
      return days > 7;
    }
    // Booking lag > 4 days
    if (lead.first_contact_date && lead.date_of_meeting) {
      const days = (new Date(lead.date_of_meeting).getTime() - new Date(lead.first_contact_date).getTime()) / (1000 * 3600 * 24);
      if (days > 4) return true;
    }
    // Deposits unpaid for 14+ days
    if (lead.status === "Deposit" && lead.last_touch_date) {
      const days = (new Date().getTime() - new Date(lead.last_touch_date).getTime()) / (1000 * 3600 * 24);
      if (days > 14) return true;
    }
    return false;
  };

  return (
    <div className="flex-1 bg-zinc-950/20 backdrop-blur-sm rounded-2xl border border-white/5 p-4 flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Search leads..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar rounded-xl border border-white/5">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("name")}>Name</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("company")}>Company</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("status")}>Status</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("setter_name")}>Setter</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("closer_name")}>Closer</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("total_deal_value")}>Deal Value</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFiltered.map((lead) => {
              const leak = isLeak(lead);
              return (
                <tr key={lead.id} className={`border-b border-white/5 hover:bg-white/5 ${leak ? 'bg-red-950/20' : ''}`}>
                  <td className="p-3 text-white flex items-center gap-2">
                    {leak && <div className="w-2 h-2 rounded-full bg-red-500" title="Attention required (Leak)" />}
                    {lead.name}
                  </td>
                  <td className="p-3 text-zinc-300">{lead.company || "-"}</td>
                  <td className="p-3 text-zinc-300">
                    <span className="px-2 py-1 rounded bg-zinc-800 text-xs">{lead.status}</span>
                  </td>
                  <td className="p-3 text-zinc-300">{lead.setter_name || "-"}</td>
                  <td className="p-3 text-zinc-300">{lead.closer_name || "-"}</td>
                  <td className="p-3 text-zinc-300">{lead.total_deal_value ? `₹${lead.total_deal_value}` : "-"}</td>
                </tr>
              );
            })}
            {sortedAndFiltered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
