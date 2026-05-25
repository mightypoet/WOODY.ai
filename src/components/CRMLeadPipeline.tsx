import React, { useState, useEffect } from "react";
import { User } from "../types";
import { getAccessToken } from "../services/googleAuth";
import { dbService } from "../services/dbService";
import { motion } from "motion/react";
import { Users, Mail, Calendar, FileSpreadsheet, Plus, Upload, Loader2, ArrowRight, CheckCircle2, RotateCcw, Pencil, X, CalendarCheck } from "lucide-react";
import Modal from "./Modal";

interface Lead {
  id: string;
  name: string;
  email: string;
  status: "Prospect" | "Contacted" | "Qualified" | "Follow up" | "Meeting" | "Sale";
  company: string;
  lastContactDate?: string;
  nextStep?: string;
  instagram_link?: string;
  contact_number?: string;
  conversations?: string;
  followup_date?: string;
  meeting_date?: string;
  calendar_synced?: boolean;
}

export default function CRMLeadPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [importing, setImporting] = useState(false);
  
  // Edit Lead state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const notifyTelegram = async (leadName: string, company: string, status: string, followupDate?: string) => {
    const telegramToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || "7031772261";
    if (!telegramToken) return;

    const text = `🔔 *Woody CRM Update*\n• *Lead:* ${leadName}\n• *Company:* ${company}\n• *New Status:* ${status}\n• *Followup Date:* ${followupDate || "N/A"}`;
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
      });
    } catch (err) {
      console.error("Telegram notification failed:", err);
    }
  };

  const createTaskForFollowup = async (leadName: string, company: string, followupDate: string) => {
    if (!followupDate) return;
    try {
      await dbService.create("tasks", {
        title: `Follow up with ${leadName} from ${company}`,
        description: `Automated task: Follow up scheduled.`,
        status: "todo",
        priority: "high",
        deadline: new Date(followupDate).toISOString(),
        projectId: "",
        assigneeId: "auto",
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Task creation failed:", err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await dbService.list("leads");
      setLeads(data as unknown as Lead[]);
    } catch (e) {
      console.error(e);
      // Ensure the table exists or handle error silently
    } finally {
      setLoading(false);
    }
  };

  const importFromSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId) return;
    setImporting(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated with Google");

      let actualId = spreadsheetId;
      if (spreadsheetId.includes('/d/')) {
        const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          actualId = match[1];
        }
      }

      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${actualId}/values/A2:I`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Google Sheets API error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.values && data.values.length > 0) {
        let imported = 0;
        for (const row of data.values) {
          const name = row[0] || "";
          const email = row[1] || "";
          const company = row[2] || "";
          const status = (row[3] as any) || "Prospect";
          const instagram_link = row[4] || "";
          const contact_number = row[5] || "";
          const conversations = row[6] || "";
          const followup_date = row[7] || "";
          const meeting_date = row[8] || "";
          
          if (name && email) {
            await dbService.create("leads", {
              name, email, company, status, instagram_link, contact_number, conversations, followup_date, meeting_date, createdAt: new Date().toISOString()
            });
            if (followup_date) {
              await createTaskForFollowup(name, company, followup_date);
            }
            await notifyTelegram(name, company, status, followup_date);
            imported++;
          }
        }
        alert(`Successfully imported ${imported} leads!`);
        fetchLeads();
      } else {
        alert("No valid data found in sheet. Make sure it has A: Name, B: Email, C: Company, D: Status through I: Meeting Date.");
      }
    } catch (error: any) {
      console.error("Error importing from Sheets:", error);
      alert("Error reading Google Sheet. Ensure the ID is correct and you have permission.");
    } finally {
      setImporting(false);
      setSpreadsheetId("");
    }
  };

  const handleSendIntroEmail = async (lead: Lead) => {
    const confirm = window.confirm(`Send an automated introduction email to ${lead.name} (${lead.email})?`);
    if (!confirm) return;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Google not authenticated");

      const emailLines = [
        `To: ${lead.email}`,
        `Subject: Connecting regarding ${lead.company}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        `Hi ${lead.name},`,
        "",
        `I would love to connect to discuss how we can help ${lead.company} reach its goals.`,
        "Let's schedule a brief call next week.",
        "",
        "Best regards,"
      ];
      const emailParams = btoa(emailLines.join("\r\n")).replace(/\+/g, '-').replace(/\//g, '_');

      const res = await fetch("https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ raw: emailParams })
      });
      
      if (!res.ok) {
        throw new Error(`Gmail API error: ${res.status} ${res.statusText}`);
      }

      // Update lead status
      await dbService.update("leads", lead.id, { 
        status: "Contacted",
        lastContactDate: new Date().toISOString(),
        nextStep: "Follow up"
      });
      fetchLeads();
      alert("Email sent successfully!");
    } catch (e) {
      console.error("Error sending email:", e);
      alert("Failed to send email. Check API permissions.");
    }
  };

  const handleScheduleCall = async (lead: Lead) => {
    const confirm = window.confirm(`Schedule a 30-min discovery call tomorrow with ${lead.name}?`);
    if (!confirm) return;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Google not authenticated");
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(tomorrow.getHours() + 1);

      const endTime = new Date(tomorrow);
      endTime.setMinutes(endTime.getMinutes() + 30);

      const event = {
        summary: `Discovery Call: ${lead.company} / Us`,
        description: `Introductory call with ${lead.name}`,
        attendees: [{ email: lead.email }],
        start: { dateTime: tomorrow.toISOString() },
        end: { dateTime: endTime.toISOString() }
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });
      
      if (!res.ok) {
        throw new Error(`Calendar API error: ${res.status} ${res.statusText}`);
      }
      
      await dbService.update("leads", lead.id, { 
        status: "Qualified",
        nextStep: "Discovery Call Scheduled"
      });
      fetchLeads();
      alert("Event scheduled and invite sent via Google Calendar!");
    } catch (e) {
      console.error("Error scheduling:", e);
      alert("Failed to schedule call.");
    }
  };

  const convertToClient = async (lead: Lead) => {
    const confirm = window.confirm(`Convert ${lead.name} to a Client and create a new project for them?`);
    if (!confirm) return;

    try {
      // Create Client
      const client = await dbService.create("clients", {
        name: lead.name,
        contact: lead.email,
        brand: lead.company,
        services: ["Consulting"],
        paymentTerms: "Net 30",
        createdAt: new Date().toISOString()
      });

      // Create Project
      await dbService.create("projects", {
        name: `Onboarding: ${lead.company}`,
        clientId: client.id,
        status: "active",
        createdAt: new Date().toISOString()
      });

      // Update lead
      await dbService.update("leads", lead.id, { 
        status: "Client",
        nextStep: "Onboarding"
      });
      
      fetchLeads();
      alert("Successfully converted to active Client & Project created!");
    } catch (e: any) {
      console.error("Conversion error:", e);
      alert("Failed to convert lead. Check if 'clients' and 'projects' tables exist.");
    }
  };

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm(lead);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setIsUpdating(true);
    try {
      let finalForm = { ...editForm };
      let calendarDidSync = false;

      // Auto-schedule if status is Contacted and meeting_date is present and not yet synced
      if (
        finalForm.status === "Contacted" && 
        finalForm.meeting_date && 
        !editingLead.calendar_synced
      ) {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error("Google not authenticated");
          
          const start = new Date(finalForm.meeting_date);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + 30);
          
          const event = {
            summary: `Meeting: ${finalForm.company || finalForm.name} / Us`,
            description: `Automated calendar invite from CRM for ${finalForm.name}`,
            attendees: [{ email: finalForm.email }],
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() }
          };

          const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(event)
          });
          
          if (res.ok) {
            calendarDidSync = true;
            finalForm.calendar_synced = true;
            finalForm.nextStep = "Meeting Scheduled";
          } else {
            console.error("Calendar sync failed:", await res.text());
          }
        } catch (syncError) {
          console.error("Auto Calendar sync error:", syncError);
        }
      }

      await dbService.update("leads", editingLead.id, finalForm);
      
      // Auto-create task if follow-up date changed or was set
      if (finalForm.followup_date && finalForm.followup_date !== editingLead.followup_date) {
        await createTaskForFollowup(finalForm.name || editingLead.name, finalForm.company || editingLead.company, finalForm.followup_date);
      }
      
      // Notify Telegram if status changed or follow-up scheduled
      if ((finalForm.status && finalForm.status !== editingLead.status) || (finalForm.followup_date && finalForm.followup_date !== editingLead.followup_date)) {
        await notifyTelegram(finalForm.name || editingLead.name, finalForm.company || editingLead.company, finalForm.status || editingLead.status, finalForm.followup_date);
      }

      setEditingLead(null);
      fetchLeads();
      if (calendarDidSync) alert("Event automatically scheduled via Google Calendar!");
    } catch (error) {
      console.error("Error updating lead:", error);
      alert("Failed to update lead.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await dbService.delete("leads", leadId);
      if (editingLead?.id === leadId) setEditingLead(null);
      fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Failed to delete lead.");
    }
  };

  const renderPipelineColumn = (status: "Prospect" | "Contacted" | "Qualified" | "Follow up" | "Meeting" | "Sale") => {
    const columnLeads = leads.filter(l => l.status === status);
    
    return (
      <div className="flex-1 min-w-[280px] bg-zinc-900/50 rounded-2xl p-4 border border-white/5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white tracking-wide">{status}</h3>
          <span className="bg-zinc-800 text-xs px-2 py-1 rounded-full text-zinc-400">{columnLeads.length}</span>
        </div>
        
        <div 
          className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={async (e) => {
            e.preventDefault();
            const leadId = e.dataTransfer.getData("text/plain");
            if (leadId) {
              const leadToMove = leads.find(l => l.id === leadId);
              if (leadToMove && leadToMove.status !== status) {
                await dbService.update("leads", leadId, { status });
                await notifyTelegram(leadToMove.name, leadToMove.company, status, leadToMove.followup_date);
                fetchLeads();
              }
            }
          }}
        >
          {columnLeads.map((lead) => (
            <motion.div 
              layout
              draggable
              onDragStart={(e: any) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={lead.id} 
              className="bg-zinc-950 border border-white/10 rounded-xl p-4 shadow-sm group hover:border-zinc-700 transition-colors relative cursor-grab active:cursor-grabbing"
            >
              <div className="absolute top-3 right-3 flex flex-row items-center gap-1">
                {lead.calendar_synced && (
                  <div title="Calendar Synced" className="p-1.5 flex items-center justify-center">
                    <CalendarCheck size={14} className="text-emerald-400" />
                  </div>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(lead)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit Lead"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-medium text-white mb-1 pr-14">{lead.company || lead.name}</h4>
              <p className="text-xs text-zinc-400 mb-2 truncate">{lead.email}</p>
              
              {lead.nextStep && (
                <p className="text-[10px] text-indigo-400 font-mono mb-3 bg-indigo-500/10 inline-block px-2 py-0.5 rounded">
                  {lead.nextStep}
                </p>
              )}

              <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-800/80">
                {status === "Prospect" && (
                  <button onClick={() => handleSendIntroEmail(lead)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors" title="Send Intro Email via Gmail">
                    <Mail size={12} /> Contact
                  </button>
                )}
                
                {status === "Contacted" && (
                  <button onClick={() => handleScheduleCall(lead)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors" title="Schedule Discovery Call via Calendar">
                    <Calendar size={12} /> Schedule
                  </button>
                )}

                {status === "Qualified" && (
                  <button onClick={() => convertToClient(lead)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                    <CheckCircle2 size={12} /> Client
                  </button>
                )}
                
                {status === "Sale" && (
                  <div className="flex-1 text-center text-xs text-green-400 py-1.5 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} /> Closed
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {columnLeads.length === 0 && (
            <div className="h-24 flex items-center justify-center text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
              Empty
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-6">
      <header className="flex items-center justify-between shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="text-indigo-400" /> CRM & Leads
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Manage your pipeline, sync Gmail, Calendar, and convert directly to Projects.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchLeads} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-white"
            title="Refresh Leads"
          >
            <RotateCcw size={18} className={loading && leads.length > 0 ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 mb-6 shrink-0 flex items-center gap-4">
        <FileSpreadsheet className="text-emerald-500 opacity-80" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Import from Google Sheets</h3>
          <p className="text-xs text-zinc-400">Import a list of prospects to start your pipeline. Sheet must have columns A: Name, B: Email, C: Company, D: Status (Up to I: Meeting Date).</p>
        </div>
        <form onSubmit={importFromSheets} className="flex gap-2 max-w-sm w-full">
          <input
            type="text"
            required
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="Spreadsheet ID"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
          />
          <button
            type="submit"
            disabled={importing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar min-h-0 bg-zinc-950/20 backdrop-blur-sm rounded-2xl border border-white/5 p-4 flex gap-4">
        {loading && leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-zinc-500 h-8 w-8" />
          </div>
        ) : (
          <>
            {renderPipelineColumn("Prospect")}
            {renderPipelineColumn("Contacted")}
            {renderPipelineColumn("Qualified")}
            {renderPipelineColumn("Follow up")}
            {renderPipelineColumn("Meeting")}
            {renderPipelineColumn("Sale")}
          </>
        )}
      </div>

      <Modal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        title="Edit Lead"
      >
        <form onSubmit={handleUpdateLead} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Name</label>
            <input
              required
              type="text"
              value={editForm.name || ""}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Email</label>
            <input
              required
              type="email"
              value={editForm.email || ""}
              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Company</label>
            <input
              type="text"
              value={editForm.company || ""}
              onChange={e => setEditForm({ ...editForm, company: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Status</label>
            <select
              value={editForm.status || "Prospect"}
              onChange={e => setEditForm({ ...editForm, status: e.target.value as Lead["status"] })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            >
              <option value="Prospect">Prospect</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Follow up">Follow up</option>
              <option value="Meeting">Meeting</option>
              <option value="Sale">Sale</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Next Step</label>
            <input
              type="text"
              value={editForm.nextStep || ""}
              onChange={e => setEditForm({ ...editForm, nextStep: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Instagram Link</label>
            <input
              type="text"
              value={editForm.instagram_link || ""}
              onChange={e => setEditForm({ ...editForm, instagram_link: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Contact Number</label>
            <input
              type="text"
              value={editForm.contact_number || ""}
              onChange={e => setEditForm({ ...editForm, contact_number: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Follow-up Date</label>
            <input
              type="date"
              value={editForm.followup_date || ""}
              onChange={e => setEditForm({ ...editForm, followup_date: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Meeting Date & Time</label>
            <input
              type="datetime-local"
              value={editForm.meeting_date || ""}
              onChange={e => setEditForm({ ...editForm, meeting_date: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Conversations History</label>
            <textarea
              value={editForm.conversations || ""}
              onChange={e => setEditForm({ ...editForm, conversations: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white min-h-[80px]"
            />
          </div>
          
          <div className="flex items-center gap-3 pt-4 border-t border-zinc-800 mt-6">
            <button
              type="button"
              onClick={() => editingLead && handleDeleteLead(editingLead.id)}
              className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded-xl transition-colors"
            >
              Delete Lead
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setEditingLead(null)}
              className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
