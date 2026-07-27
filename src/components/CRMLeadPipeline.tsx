import React,
 { useState, useEffect } from "react";
import Papa from 'papaparse';
import { User, Lead } from "../types";
import { getAccessToken } from "../services/googleAuth";
import { dbService } from "../services/dbService";
import { motion } from "motion/react";
import { Users, Mail, Calendar, FileSpreadsheet, Plus, Upload, Loader2, ArrowRight, CheckCircle2, RotateCcw, Pencil, X, CalendarCheck } from "lucide-react";
import Modal from "./Modal";
import LeadLog from "./crm/LeadLog";
import VisibilityDashboard from "./crm/VisibilityDashboard";

export default function CRMLeadPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [importing, setImporting] = useState(false);
  
  // Edit Lead state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [formPage, setFormPage] = useState(0);

  const [viewMode, setViewMode] = useState<"kanban" | "list" | "dashboard">("kanban");

  const handleCreateLeadClick = () => {
    setEditForm({ status: "New" });
    setEditingLead(null);
    setIsCreatingLead(true);
    setFormPage(0);
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
        projectId: "00000000-0000-0000-0000-000000000000",
        assigneeId: "00000000-0000-0000-0000-000000000000",
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

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleCSVUpload triggered");
    const inputElement = e.target;
    const file = inputElement.files?.[0];
    console.log("Selected file:", file);
    if (!file) {
      console.log("No file selected, returning.");
      return;
    }

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      console.log("FileReader onload triggered");
      try {
        const text = event.target?.result as string;
        console.log("File read successfully, length:", text?.length);
        if (!text) throw new Error("File could not be read (empty text)");

        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: async function(results) {
            const rows = results.data as string[][];
            console.log(`Parsed ${rows.length} rows using PapaParse`);
            
            // Assuming first row is header
            const dataRows = rows.slice(1);
            console.log(`Data rows length: ${dataRows.length}`);
            
            let imported = 0;
            for (const row of dataRows) {
              if (!row || row.length < 2) continue;
              
              let name = row[0] || "";
              const email = row[1] || "";
              const company = row[2] || "";
              const statusRaw = (row[3] || "New").toUpperCase().trim();
              const contact_number = row[4] || "";
              const conversations = row[5] || ""; // Meeting Notes
              // Try to find meeting date in later columns, adjusting for empty cols
              const meeting_date = row[8] || row[7] || row[6] || "";

              let status = "New";
              if (["DEAD", "NOT INTERESTED", "DNP"].includes(statusRaw)) status = "Lost";
              else if (statusRaw === "SALE") status = "Won";
              else if (["FOLLOW UP", "INTERESTED"].includes(statusRaw)) status = "Follow-Up Ongoing";
              else if (statusRaw === "MEETING") status = "Meeting Follow-Up";
              else if (statusRaw === "SEND MATERIALS") status = "Proposal";

              if (!name && (company || contact_number)) {
                 name = company || "Unknown Contact";
              }

              if (name || email || contact_number) {
                console.log(`Inserting row ${imported + 1}: ${name} (${email})`);
                await dbService.create("leads", {
                  name, email, company, status, contact_number, conversations, meeting_date, 
                  createdAt: new Date().toISOString(), 
                  last_touch_date: new Date().toISOString()
                });
                imported++;
              } else {
                console.log("Skipping row due to no identifiable info:", row);
              }
            }
            
            console.log(`Finished import loop, imported count: ${imported}`);
            console.log(`Successfully imported ${imported} leads!`);
            await fetchLeads();
            setImporting(false);
            if (inputElement) {
              inputElement.value = '';
            }
          },
          error: function(error: any) {
            console.error("PapaParse error:", error);
            console.log("Failed to parse CSV: " + error.message);
            setImporting(false);
            if (inputElement) {
              inputElement.value = '';
            }
          }
        });
      } catch (error: any) {
        console.error("Error parsing CSV:", error);
        console.log(`Failed to parse CSV: ${error.message || JSON.stringify(error)}`);
        setImporting(false);
        if (inputElement) {
          inputElement.value = '';
        }
      }
    };

    reader.onerror = () => {
      console.error("Error reading file");
      console.log("Failed to read the file.");
      setImporting(false);
      if (inputElement) {
        inputElement.value = '';
      }
    };

    console.log("Calling readAsText");
    reader.readAsText(file);
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
        if (res.status === 401) {
            throw new Error("Google session expired or invalid. Please log out, and log back in to refresh your Google authentication token.");
        }
        throw new Error(`Gmail API error: ${res.status} ${res.statusText}`);
      }

      // Update lead status
      await dbService.update("leads", lead.id, { 
        status: "Proposal",
        lastContactDate: new Date().toISOString(),
        last_touch_date: new Date().toISOString(),
        nextStep: "Follow-Up Ongoing"
      });
      fetchLeads();
      console.log("Email sent successfully!");
    } catch (e: any) {
      console.error("Error sending email:", e);
      console.log(e.message || "Failed to send email. Check API permissions.");
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
        if (res.status === 401) {
            throw new Error("Google session expired or invalid. Please log out, and log back in to refresh your Google authentication token.");
        }
        throw new Error(`Calendar API error: ${res.status} ${res.statusText}`);
      }
      
      await dbService.update("leads", lead.id, { 
        status: "Meeting Follow-Up",
        nextStep: "Discovery Call Scheduled",
        last_touch_date: new Date().toISOString()
      });
      fetchLeads();
      console.log("Event scheduled and invite sent via Google Calendar!");
    } catch (e: any) {
      console.error("Error scheduling:", e);
      console.log(e.message || "Failed to schedule call.");
    }
  };

  const convertToClient = async (lead: Lead) => {
    const confirm = window.confirm(`Convert ${lead.name} to a Client and create a new project for them?`);
    if (!confirm) return;

    try {
      // Create Client
      const clientId = await dbService.create("clients", {
        name: lead.name,
        contact: lead.email,
        brand: lead.company,
        services: ["Consulting"],
        paymentTerms: "Net 30",
        createdAt: new Date().toISOString()
      });

      if (clientId) {
        // Create Project
        await dbService.create("projects", {
          name: `Onboarding: ${lead.company}`,
          clientId: clientId,
          status: "active",
          createdAt: new Date().toISOString()
        });
      }

      // Update lead
      await dbService.update("leads", lead.id, { 
        status: "Won",
        nextStep: "Onboarding",
        last_touch_date: new Date().toISOString()
      });
      
      fetchLeads();
      console.log("Successfully converted to active Client & Project created!");
    } catch (e: any) {
      console.error("Conversion error:", e);
      console.log(`Failed to convert lead: ${e.message || JSON.stringify(e)}`);
    }
  };

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm(lead);
    setFormPage(0);
  };

  const handleLeadStatusChange = async (lead: Lead, newStatus: Lead["status"]) => {
    let calendarDidSync = false;
    let updatedLead = { ...lead, status: newStatus, last_touch_date: new Date().toISOString() };

    // Optimistically update the UI state first
    setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? updatedLead : l));

    // Auto-schedule if status is Proposal and meeting_date is present and not yet synced
    if (
      newStatus === "Proposal" && 
      lead.meeting_date && 
      lead.meeting_status !== "Scheduled"
    ) {
      try {
        const token = await getAccessToken();
        if (token) {
          const start = new Date(lead.meeting_date);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + 30);
          
          const event = {
            summary: `Meeting: ${lead.company || lead.name} / Us`,
            description: `Automated calendar invite from CRM for ${lead.name}`,
            attendees: [{ email: lead.email }],
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
            updatedLead.meeting_status = "Scheduled";
            updatedLead.nextStep = "Meeting Scheduled";
            // Re-update the UI with the calendar info
            setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? updatedLead : l));
          } else {
            const errText = await res.text();
            if (res.status === 401) {
                console.log("Automated Calendar Sync Failed: Your Google session has expired. Please log out and back in to refresh it.");
            }
            console.error("Calendar sync failed:", errText);
          }
        }
      } catch (syncError) {
        console.error("Auto Calendar sync error:", syncError);
      }
    }

    try {
      await dbService.update("leads", lead.id, updatedLead);
      if (calendarDidSync) console.log("Event automatically scheduled via Google Calendar!");
    } catch (error) {
      console.error("Failed to update lead status:", error);
      // Revert the optimistic update on failure
      setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? lead : l));
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead && !isCreatingLead) return;
    setIsUpdating(true);
    try {
      if (isCreatingLead) {
          const newLeadDetails = {
          name: editForm.name || "",
          email: editForm.email || "",
          company: editForm.company || "",
          status: editForm.status || "New",
          instagram_link: editForm.instagram_link || "",
          contact_number: editForm.contact_number || "",
          conversations: editForm.conversations || "",
          followup_date: editForm.followup_date || null,
          meeting_date: editForm.meeting_date || null,
          setter_name: editForm.setter_name || "",
          closer_name: editForm.closer_name || "",
          first_contact_date: editForm.first_contact_date || null,
          date_of_meeting: editForm.date_of_meeting || null,
          meeting_status: editForm.meeting_status || "",
          call_outcome: editForm.call_outcome || "",
          loss_reason: editForm.loss_reason || "",
          total_deal_value: editForm.total_deal_value || 0,
          cash_collected: editForm.cash_collected || 0,
          commission_percentage: editForm.commission_percentage || 0,
          last_touch_date: new Date().toISOString()
        };
        await dbService.create("leads", newLeadDetails);
        if (newLeadDetails.followup_date) {
            await createTaskForFollowup(newLeadDetails.name, newLeadDetails.company, newLeadDetails.followup_date);
        }
        setIsCreatingLead(false);
        fetchLeads();
      } else if (editingLead) {
        let finalForm = { ...editForm, id: editingLead.id, last_touch_date: new Date().toISOString() };
        if (finalForm.followup_date === "") finalForm.followup_date = null as any;
        if (finalForm.meeting_date === "") finalForm.meeting_date = null as any;
        if (finalForm.first_contact_date === "") finalForm.first_contact_date = null as any;
        if (finalForm.date_of_meeting === "") finalForm.date_of_meeting = null as any;
        
        let calendarDidSync = false;

        // Optimistically update the UI for edit
        setLeads(prevLeads => prevLeads.map(l => l.id === editingLead.id ? (finalForm as unknown as Lead) : l));

        // Auto-schedule if status is Proposal and meeting_date is present and not yet synced
        if (
          finalForm.status === "Proposal" && 
          finalForm.meeting_date && 
          editingLead.meeting_status !== "Scheduled"
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
              finalForm.meeting_status = "Scheduled";
              finalForm.nextStep = "Meeting Scheduled";
              // Update optimistic UI with scheduled status
              setLeads(prevLeads => prevLeads.map(l => l.id === editingLead.id ? (finalForm as unknown as Lead) : l));
            } else {
              const errText = await res.text();
              if (res.status === 401) {
                  console.log("Automated Calendar Sync Failed: Your Google session has expired. Please log out and back in to refresh it.");
              }
              console.error("Calendar sync failed:", errText);
            }
          } catch (syncError) {
            console.error("Auto Calendar sync error:", syncError);
          }
        }

        try {
          await dbService.update("leads", editingLead.id, finalForm);
          
          // Auto-create task if follow-up date changed or was set
          if (finalForm.followup_date && finalForm.followup_date !== editingLead.followup_date) {
            await createTaskForFollowup(finalForm.name || editingLead.name, finalForm.company || editingLead.company, finalForm.followup_date);
          }
          
          setEditingLead(null);
          // fetchLeads(); // No need, optimistic update succeeded
          if (calendarDidSync) console.log("Event automatically scheduled via Google Calendar!");
        } catch (error) {
          console.error("Failed to update lead status:", error);
          // Revert optimistic update
          setLeads(prevLeads => prevLeads.map(l => l.id === editingLead.id ? editingLead : l));
          throw error; // Let the outer catch handle the alert/logging
        }
      }
    } catch (error: any) {
      console.error("Error saving lead:", error);
      console.log(`Failed to save lead: ${error.message || JSON.stringify(error)}`);
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
      console.log("Failed to delete lead.");
    }
  };

  const renderPipelineColumn = (status: "New" | "Proposal" | "Deposit" | "Follow-Up Ongoing" | "Meeting Follow-Up" | "Won" | "Lost") => {
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
                await handleLeadStatusChange(leadToMove, status);
              }
            }
          }}
        >
          {columnLeads.map((lead) => {
            const isStale = 
              (lead.status === "Follow-Up Ongoing" && lead.last_touch_date && (new Date().getTime() - new Date(lead.last_touch_date).getTime() > 7 * 24 * 60 * 60 * 1000)) ||
              (lead.first_contact_date && lead.date_of_meeting && (new Date(lead.date_of_meeting).getTime() - new Date(lead.first_contact_date).getTime() > 4 * 24 * 60 * 60 * 1000)) ||
              (lead.status === "Deposit" && lead.last_touch_date && (new Date().getTime() - new Date(lead.last_touch_date).getTime() > 14 * 24 * 60 * 60 * 1000));
            return (
            <motion.div 
              layout
              draggable
              onDragStart={(e: any) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={lead.id} 
              className={`bg-zinc-950 border ${isStale ? 'border-red-500 bg-red-950/20' : 'border-white/10'} rounded-xl p-4 shadow-sm group hover:${isStale ? 'border-red-400' : 'border-zinc-700'} transition-colors relative cursor-grab active:cursor-grabbing`}
            >
              <div className="absolute top-3 right-3 flex flex-row items-center gap-1">
                {lead.meeting_status === "Scheduled" && (
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
                {status === "New" && (
                  <button onClick={() => handleSendIntroEmail(lead)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors" title="Send Intro Email via Gmail">
                    <Mail size={12} /> Contact
                  </button>
                )}
                
                {status === "Proposal" && (
                  <button onClick={() => handleScheduleCall(lead)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors" title="Schedule Discovery Call via Calendar">
                    <Calendar size={12} /> Schedule
                  </button>
                )}

                {status === "Meeting Follow-Up" && (
                  <button onClick={() => convertToClient(lead)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                    <CheckCircle2 size={12} /> Client
                  </button>
                )}
                
                {status === "Won" && (
                  <div className="flex-1 text-center text-xs text-green-400 py-1.5 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} /> Closed
                  </div>
                )}
              </div>
            </motion.div>
          );
          })}
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
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="text-indigo-400" /> CRM & Leads
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Manage your pipeline, sync Gmail, Calendar, and convert directly to Projects.</p>
          </div>
          
          <div className="flex bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              Lead Log
            </button>
            <button
              onClick={() => setViewMode("dashboard")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              Dashboard
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleCreateLeadClick}
            className="px-4 py-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm font-semibold shadow-md"
            title="Add Lead manually"
          >
            <Plus size={16} /> Add Lead
          </button>
          <button 
            onClick={fetchLeads} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-white"
            title="Refresh Leads"
          >
            <RotateCcw size={18} className={loading && leads.length > 0 ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {viewMode === "kanban" && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 mb-6 shrink-0 flex items-center gap-4">
          <FileSpreadsheet className="text-emerald-500 opacity-80" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Import Leads from CSV</h3>
            <p className="text-xs text-zinc-400">Upload a CSV file to bulk import leads. Headers must include Name, Email, Company, Status, Phone, Meeting Notes, Meeting Date.</p>
          </div>
          <div className="flex gap-2 max-w-sm w-full">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
            />
            {importing && (
              <div className="flex items-center text-emerald-400 px-4">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {loading && leads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-zinc-500 h-8 w-8" />
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto custom-scrollbar min-h-0 bg-zinc-950/20 backdrop-blur-sm rounded-2xl border border-white/5 p-4 flex gap-4">
          {renderPipelineColumn("New")}
          {renderPipelineColumn("Proposal")}
          {renderPipelineColumn("Deposit")}
          {renderPipelineColumn("Follow-Up Ongoing")}
          {renderPipelineColumn("Meeting Follow-Up")}
          {renderPipelineColumn("Won")}
          {renderPipelineColumn("Lost")}
        </div>
      ) : viewMode === "list" ? (
        <LeadLog leads={leads} />
      ) : (
        <VisibilityDashboard leads={leads} />
      )}

      <Modal
        isOpen={!!editingLead || isCreatingLead}
        onClose={() => { setEditingLead(null); setIsCreatingLead(false); }}
        title={isCreatingLead ? "Add New Lead" : "Edit Lead"}
      >
        <form onSubmit={handleSaveLead} className="space-y-4">
          {formPage === 0 && (
            <>
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
                  value={editForm.status || "New"}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value as Lead["status"] })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                >
                  <option value="New">New</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Follow-Up Ongoing">Follow-Up Ongoing</option>
                  <option value="Meeting Follow-Up">Meeting Follow-Up</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Setter Name</label>
                  <input
                    type="text"
                    value={editForm.setter_name || ""}
                    onChange={e => setEditForm({ ...editForm, setter_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Closer Name</label>
                  <input
                    type="text"
                    value={editForm.closer_name || ""}
                    onChange={e => setEditForm({ ...editForm, closer_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
              </div>
            </>
          )}

          {formPage === 1 && (
            <>
              <div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">First Contact</label>
                  <input
                    type="date"
                    value={editForm.first_contact_date || ""}
                    onChange={e => setEditForm({ ...editForm, first_contact_date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Follow-up Date</label>
                  <input
                    type="date"
                    value={editForm.followup_date || ""}
                    onChange={e => setEditForm({ ...editForm, followup_date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Date of Meeting</label>
                  <input
                    type="date"
                    value={editForm.date_of_meeting || ""}
                    onChange={e => setEditForm({ ...editForm, date_of_meeting: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Meeting Status</label>
                  <select
                    value={editForm.meeting_status || ""}
                    onChange={e => setEditForm({ ...editForm, meeting_status: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  >
                    <option value="">None</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="No Show">No Show</option>
                    <option value="Rescheduled">Rescheduled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Call Outcome</label>
                <input
                  type="text"
                  value={editForm.call_outcome || ""}
                  onChange={e => setEditForm({ ...editForm, call_outcome: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Loss Reason</label>
                <input
                  type="text"
                  value={editForm.loss_reason || ""}
                  onChange={e => setEditForm({ ...editForm, loss_reason: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  placeholder="If status is Lost, explain why"
                />
              </div>
            </>
          )}

          {formPage === 2 && (
            <>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Total Deal Value</label>
                  <input
                    type="number"
                    value={editForm.total_deal_value || ""}
                    onChange={e => setEditForm({ ...editForm, total_deal_value: Number(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Cash Collected</label>
                  <input
                    type="number"
                    value={editForm.cash_collected || ""}
                    onChange={e => setEditForm({ ...editForm, cash_collected: Number(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Commission %</label>
                  <input
                    type="number"
                    value={editForm.commission_percentage || ""}
                    onChange={e => setEditForm({ ...editForm, commission_percentage: Number(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Instagram Link</label>
                <input
                  type="text"
                  value={editForm.instagram_link || ""}
                  onChange={e => setEditForm({ ...editForm, instagram_link: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Contact Number</label>
                  <input
                    type="text"
                    value={editForm.contact_number || ""}
                    onChange={e => setEditForm({ ...editForm, contact_number: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Auto Calendar Date/Time</label>
                <input
                  type="datetime-local"
                  value={editForm.meeting_date || ""}
                  onChange={e => setEditForm({ ...editForm, meeting_date: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white"
                  title="If set and status is Proposal, automatically schedule in Google Calendar"
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
            </>
          )}
          
          <div className="flex items-center gap-3 pt-4 border-t border-zinc-800 mt-6">
            {!isCreatingLead && (
              <button
                type="button"
                onClick={() => editingLead && handleDeleteLead(editingLead.id)}
                className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded-xl transition-colors"
              >
                Delete Lead
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { setEditingLead(null); setIsCreatingLead(false); }}
              className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            {formPage > 0 && (
              <button
                type="button"
                onClick={() => setFormPage(p => p - 1)}
                className="px-6 py-2 bg-zinc-800 text-white hover:bg-zinc-700 text-sm font-semibold rounded-xl transition-all"
              >
                Prev
              </button>
            )}
            {formPage < 2 ? (
              <button
                type="button"
                onClick={() => setFormPage(p => p + 1)}
                className="px-6 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
