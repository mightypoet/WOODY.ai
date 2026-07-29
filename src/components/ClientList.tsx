import React, { useState, useEffect } from "react";
import { User, Client } from "../types";
import { dbService } from "../services/dbService";
import { gmailService } from "../services/gmailService";
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  ExternalLink,
  MoreVertical,
  Trash2,
  X,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import Modal from "./Modal";
import ClientPortal from "./ClientPortal";

export default function ClientList({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    brand: "",
    contact: "",
    contactNumber: "",
    poc_name: "",
    phone: "",
    budget: 0,
    amount_received: 0,
    services: "",
    paymentTerms: "",
    socialMediaSheetUrl: "",
  });

  useEffect(() => {
    const unsub = dbService.subscribe("clients", (data) => {
      // Map social_media_calendar_link to socialMediaSheetUrl if returned from DB
      const mappedData = data.map((c: any) => ({
        ...c,
        socialMediaSheetUrl: c.social_media_calendar_link || c.socialMediaSheetUrl
      }));
      setClients(mappedData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendEmail = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!client.contact) {
      showToast("Failed: No email address for this client.");
      return;
    }
    
    const confirm = window.confirm(`Send an automated update email to ${client.name} (${client.contact})?`);
    if (!confirm) return;

    try {
      showToast(`Sending email to ${client.contact}...`);
      await gmailService.sendEmail(
        client.contact,
        `Project Update: ${client.brand || client.name}`,
        `<p>Hi ${client.name},</p><p>We wanted to share a quick update regarding your account at ${client.brand || 'your company'}. Please let us know if you'd like to review the latest reports.</p><p>Best regards,</p>`
      );
      showToast("Email sent successfully!");
    } catch (e: any) {
      console.error("Error sending email:", e);
      showToast(`Failed to send email: ${e.message}`);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.brand) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await dbService.create("clients", {
        ...newClient,
        social_media_calendar_link: newClient.socialMediaSheetUrl,
        deliverables: newClient.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        services: newClient.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        amount_pending: Number(newClient.budget) - Number(newClient.amount_received),
        createdAt: new Date().toISOString(),
      });

      setNewClient({
        name: "",
        brand: "",
        contact: "",
        contactNumber: "",
        poc_name: "",
        phone: "",
        budget: 0,
        amount_received: 0,
        services: "",
        paymentTerms: "",
        socialMediaSheetUrl: "",
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error creating client:", err);
      setSubmitError(err.message || "Failed to create client. Make sure the 'clients' table exists.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      await dbService.delete("clients", id);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.brand.toLowerCase().includes(search.toLowerCase()),
  );

  if (selectedClient) {
    const updatedClient =
      clients.find((c) => c.id === selectedClient.id) || selectedClient;
    return (
      <ClientPortal
        client={updatedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-zinc-500 text-sm">
            Manage your brand partnerships and contacts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Plus size={18} />
          Add Client
        </button>
      </header>

      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Search clients by name or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-12 py-3 focus:outline-none focus:border-zinc-700 transition-all text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, i) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedClient(client)}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{client.name}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
                      {client.brand}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-zinc-600 hover:text-white transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="text-zinc-500 hover:text-white transition-colors p-1">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Mail size={14} className="shrink-0" />
                        <span className="truncate">{client.contact || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Phone size={14} className="shrink-0" />
                        <span className="truncate">{client.phone || client.contactNumber || "No phone"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-zinc-400 flex items-center">
                        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider w-12 shrink-0">POC</span>
                        <span className="truncate">{client.poc_name || "N/A"}</span>
                      </div>
                      <div className="text-sm text-zinc-400 flex items-center">
                        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider w-12 shrink-0">BGT</span>
                        <span>${client.budget?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Received</span>
                      <span className="text-sm text-emerald-400 font-medium">${client.amount_received?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Pending</span>
                      <span className="text-sm text-amber-400 font-medium">${client.amount_pending?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(client.deliverables) && client.deliverables.length > 0 ? client.deliverables : Array.isArray(client.services) ? client.services : typeof client.services === 'string' ? (client.services as string).split(',') : []).slice(0, 3).map((service, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700/50 text-[10px] font-medium text-zinc-300 whitespace-nowrap"
                        title={service.trim()}
                      >
                        {service.trim()}
                      </div>
                    ))}
                    {(client.deliverables?.length > 3 || client.services?.length > 3) && (
                      <div className="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700/50 text-[10px] font-medium text-zinc-500">
                        +{((client.deliverables?.length || client.services?.length) - 3)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <button onClick={(e) => handleSendEmail(client, e)} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded">
                      <Send size={10} /> Email
                    </button>
                    <button className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                      View <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!loading && filteredClients.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <Building2 size={48} className="opacity-20" />
            <p className="text-sm italic">
              No clients found matching your search.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Client"
      >
        <form onSubmit={handleAddClient} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Client Name
            </label>
            <input
              required
              type="text"
              value={newClient.name}
              onChange={(e) =>
                setNewClient({ ...newClient, name: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Brand Name
            </label>
            <input
              required
              type="text"
              value={newClient.brand}
              onChange={(e) =>
                setNewClient({ ...newClient, brand: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Contact Info
            </label>
            <input
              type="text"
              value={newClient.contact}
              onChange={(e) =>
                setNewClient({ ...newClient, contact: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. email@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Contact Number
            </label>
            <input
              type="text"
              value={newClient.contactNumber}
              onChange={(e) =>
                setNewClient({ ...newClient, contactNumber: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. +1 234 567 8900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Services (comma separated)
            </label>
            <input
              type="text"
              value={newClient.services}
              onChange={(e) =>
                setNewClient({ ...newClient, services: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. SEO, PPC, Social Media"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Payment Terms
            </label>
            <input
              type="text"
              value={newClient.paymentTerms}
              onChange={(e) =>
                setNewClient({ ...newClient, paymentTerms: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Net 30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">
              Social Media Calendar Link
            </label>
            <input
              type="url"
              value={newClient.socialMediaSheetUrl}
              onChange={(e) =>
                setNewClient({ ...newClient, socialMediaSheetUrl: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="Paste shared Google Sheets or calendar URL"
            />
          </div>
          
          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            {isSubmitting ? "Creating..." : "Create Client"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
