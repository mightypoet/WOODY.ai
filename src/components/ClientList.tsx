import React, { useState, useEffect } from 'react';
import { User, Client } from '../types';
import { dbService } from '../services/dbService';
import { Building2, Plus, Search, Mail, Phone, ExternalLink, MoreVertical, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import Modal from './Modal';

export default function ClientList({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    brand: '',
    contact: '',
    services: '',
    paymentTerms: ''
  });

  useEffect(() => {
    const unsub = dbService.subscribe('clients', (data) => {
      setClients(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.brand) return;

    await dbService.create('clients', {
      ...newClient,
      services: newClient.services.split(',').map(s => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString()
    });

    setNewClient({ name: '', brand: '', contact: '', services: '', paymentTerms: '' });
    setIsModalOpen(false);
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await dbService.delete('clients', id);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-zinc-500 text-sm">Manage your brand partnerships and contacts.</p>
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
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
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 hover:border-zinc-700 transition-all group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{client.name}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">{client.brand}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="text-zinc-500 hover:text-white transition-colors p-1">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Mail size={14} />
                    <span className="truncate">{client.contact || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Phone size={14} />
                    <span>{client.contact || 'No phone provided'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {client.services?.map((service, idx) => (
                      <div 
                        key={idx}
                        className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] font-bold uppercase"
                        title={service}
                      >
                        {service[0]}
                      </div>
                    ))}
                  </div>
                  <button className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                    View Details <ExternalLink size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!loading && filteredClients.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <Building2 size={48} className="opacity-20" />
            <p className="text-sm italic">No clients found matching your search.</p>
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
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Client Name</label>
            <input
              required
              type="text"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Brand Name</label>
            <input
              required
              type="text"
              value={newClient.brand}
              onChange={(e) => setNewClient({ ...newClient, brand: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Contact Info</label>
            <input
              type="text"
              value={newClient.contact}
              onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. email@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Services (comma separated)</label>
            <input
              type="text"
              value={newClient.services}
              onChange={(e) => setNewClient({ ...newClient, services: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. SEO, PPC, Social Media"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Payment Terms</label>
            <input
              type="text"
              value={newClient.paymentTerms}
              onChange={(e) => setNewClient({ ...newClient, paymentTerms: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Net 30"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors mt-4"
          >
            Create Client
          </button>
        </form>
      </Modal>
    </div>
  );
}
