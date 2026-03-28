import React, { useState, useEffect } from 'react';
import { User, Payment, Client } from '../types';
import { dbService } from '../services/dbService';
import { CreditCard, Plus, Search, Filter, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeFormat } from '../lib/dateUtils';
import Modal from './Modal';

export default function PaymentTracker({ user }: { user: User }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    clientId: '',
    totalAmount: 0,
    paidAmount: 0,
    dueDate: '',
    status: 'pending' as any
  });

  useEffect(() => {
    const unsubPayments = dbService.subscribe('payments', (data) => {
      setPayments(data);
      setLoading(false);
    });
    const unsubClients = dbService.subscribe('clients', (data) => setClients(data));

    return () => {
      unsubPayments();
      unsubClients();
    };
  }, []);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown Client';
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.clientId || !newPayment.totalAmount) return;
    await dbService.create('payments', {
      ...newPayment,
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    setNewPayment({ clientId: '', totalAmount: 0, paidAmount: 0, dueDate: '', status: 'pending' });
  };

  const handleDeletePayment = async (id: string) => {
    if (confirm('Delete this payment record?')) {
      await dbService.delete('payments', id);
    }
  };

  const filteredPayments = payments.filter(p => 
    getClientName(p.clientId).toLowerCase().includes(search.toLowerCase()) ||
    p.status.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total: payments.reduce((acc, curr) => acc + curr.totalAmount, 0),
    paid: payments.reduce((acc, curr) => acc + curr.paidAmount, 0),
    pending: payments.reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0),
  };

  return (
    <div className="h-full flex flex-col p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-zinc-500 text-sm">Track deal values, invoices, and pending amounts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Plus size={18} />
          New Invoice
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Total Deal Value</p>
          <p className="text-2xl font-bold">₹{totals.total.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-500">₹{totals.paid.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Total Pending</p>
          <p className="text-2xl font-bold text-orange-500">₹{totals.pending.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input
                type="text"
                placeholder="Search payments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-zinc-600 transition-all"
              />
            </div>
          </div>
          <button className="text-xs text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
            <Filter size={14} />
            Filter
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr className="border-b border-zinc-800">
                <th className="p-4 text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Client</th>
                <th className="p-4 text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Amount</th>
                <th className="p-4 text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Paid</th>
                <th className="p-4 text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Due Date</th>
                <th className="p-4 text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Status</th>
                <th className="p-4 text-[10px] text-zinc-500 uppercase font-mono tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <AnimatePresence mode="popLayout">
                {filteredPayments.map((payment, i) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <p className="text-sm font-medium">{getClientName(payment.clientId)}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-mono">₹{payment.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-mono text-emerald-500">₹{payment.paidAmount.toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-zinc-500 font-mono">{safeFormat(payment.dueDate)}</p>
                    </td>
                    <td className="p-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter",
                        payment.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" :
                        payment.status === 'overdue' ? "bg-red-500/10 text-red-500" :
                        "bg-blue-500/10 text-blue-500"
                      )}>
                        {payment.status === 'paid' ? <CheckCircle2 size={10} /> : 
                         payment.status === 'overdue' ? <AlertCircle size={10} /> : 
                         <Clock size={10} />}
                        {payment.status}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className="text-zinc-500 hover:text-white transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredPayments.length === 0 && !loading && (
            <div className="p-12 text-center text-zinc-500 text-sm italic">No payment records found.</div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Invoice">
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Client</label>
            <select
              required
              value={newPayment.clientId}
              onChange={(e) => setNewPayment({ ...newPayment, clientId: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
            >
              <option value="">Select a client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.brand})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Total Amount (₹)</label>
              <input
                required
                type="number"
                value={newPayment.totalAmount}
                onChange={(e) => setNewPayment({ ...newPayment, totalAmount: Number(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Paid Amount (₹)</label>
              <input
                type="number"
                value={newPayment.paidAmount}
                onChange={(e) => setNewPayment({ ...newPayment, paidAmount: Number(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Due Date</label>
              <input
                required
                type="date"
                value={newPayment.dueDate}
                onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Status</label>
              <select
                value={newPayment.status}
                onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value as any })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors mt-4">
            Create Invoice
          </button>
        </form>
      </Modal>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
