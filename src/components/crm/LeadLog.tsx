import React, { useState } from "react";
import { Lead } from "../../types";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";
import { gmailService } from "../../services/gmailService";

export default function LeadLog({ leads }: { leads: Lead[] }) {
  const [sortField, setSortField] = useState<keyof Lead>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
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

  const handleSendEmail = async (lead: Lead) => {
    if (!lead.email) {
      showToast("Failed: No email address for this lead.");
      return;
    }
    
    const confirm = window.confirm(`Send an automated email to ${lead.name} (${lead.email})?`);
    if (!confirm) return;

    try {
      showToast(`Sending email to ${lead.email}...`);
      await gmailService.sendEmail(
        lead.email,
        `Connecting regarding ${lead.company || lead.name}`,
        `<p>Hi ${lead.name},</p><p>I would love to connect to discuss how we can help ${lead.company || 'your business'} reach its goals.</p><p>Let's schedule a brief call next week.</p><p>Best regards,</p>`
      );
      showToast("Email sent successfully!");
    } catch (e: any) {
      console.error("Error sending email:", e);
      showToast(`Failed to send email: ${e.message}`);
    }
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
        <table className="w-full text-left border-collapse text-sm min-w-[800px]">
          <thead className="bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="p-3 w-10"></th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("name")}>Name</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("email")}>Email</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("contact_number")}>Phone</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("company")}>Company</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("status")}>Status</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("total_deal_value")}>Deal Value</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("instagram_link")}>Source</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("setter_name")}>Setter</th>
              <th className="p-3 text-zinc-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("closer_name")}>Closer</th>
              <th className="p-3 text-zinc-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFiltered.map((lead) => {
              const leak = isLeak(lead);
              const isExpanded = expandedRows[lead.id];
              return (
                <React.Fragment key={lead.id}>
                  <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${leak ? 'bg-red-950/20' : ''}`}>
                    <td className="p-3">
                      <button onClick={() => toggleRow(lead.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className="p-3 text-white flex items-center gap-2 whitespace-nowrap">
                      {leak && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Attention required (Leak)" />}
                      <span className="truncate max-w-[150px]">{lead.name}</span>
                    </td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap truncate max-w-[150px]">{lead.email || "-"}</td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap">{lead.contact_number || "-"}</td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap truncate max-w-[150px]">{lead.company || "-"}</td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-zinc-800 text-xs">{lead.status}</span>
                    </td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap">{lead.total_deal_value ? `₹${lead.total_deal_value}` : "-"}</td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap truncate max-w-[120px]">{lead.instagram_link || "-"}</td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap truncate max-w-[120px]">{lead.setter_name || "-"}</td>
                    <td className="p-3 text-zinc-300 whitespace-nowrap truncate max-w-[120px]">{lead.closer_name || "-"}</td>
                    <td className="p-3">
                      <button onClick={() => handleSendEmail(lead)} className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1.5 rounded transition-colors whitespace-nowrap" title="Send Auto Email via Gmail">
                        <Mail size={12} /> Send Email
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={`border-b border-white/5 bg-zinc-900/50 ${leak ? 'bg-red-950/10' : ''}`}>
                      <td colSpan={11} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-10">
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Notes & Conversations</h4>
                            <div className="bg-zinc-950/50 p-3 rounded-xl text-zinc-300 text-sm whitespace-pre-wrap border border-white/5 min-h-[80px]">
                              {lead.conversations || <span className="text-zinc-600 italic">No notes available.</span>}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Key Dates</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                                  <div className="text-xs text-zinc-500 mb-1">First Contact</div>
                                  <div className="text-sm text-zinc-200">{lead.first_contact_date ? new Date(lead.first_contact_date).toLocaleDateString() : "-"}</div>
                                </div>
                                <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                                  <div className="text-xs text-zinc-500 mb-1">Follow-up Date</div>
                                  <div className="text-sm text-zinc-200">{lead.followup_date ? new Date(lead.followup_date).toLocaleDateString() : "-"}</div>
                                </div>
                              </div>
                            </div>
                            {lead.meeting_date && (
                              <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Meeting Details</h4>
                                <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                  <div>
                                    <div className="text-xs text-zinc-500 mb-1">Meeting Date</div>
                                    <div className="text-sm text-zinc-200">{new Date(lead.meeting_date).toLocaleString()}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-zinc-500 mb-1">Status</div>
                                    <div className="text-sm text-emerald-400">{lead.meeting_status || "Scheduled"}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {sortedAndFiltered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[9999] ${toastMessage.includes("Failed") ? "bg-red-900/90 border-red-800 text-white" : "bg-zinc-800 text-white border-zinc-700"}`}>
          <div className={`w-2 h-2 rounded-full ${toastMessage.includes("Failed") ? "bg-red-400" : "bg-green-500"}`}></div>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
