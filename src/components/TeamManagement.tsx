import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { dbService } from '../services/dbService';
import { Users, Plus, Mail, Shield, Trash2, Loader2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal';

export default function TeamManagement({ user }: { user: User }) {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'team_member' as UserRole
  });

  useEffect(() => {
    const unsub = dbService.subscribe('users', (data) => {
      setMembers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    // Use email as ID for consistency as per previous instructions
    await dbService.set('users', newMember.email, {
      uid: newMember.email,
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      createdAt: new Date().toISOString()
    });

    setNewMember({ name: '', email: '', role: 'team_member' });
    setIsModalOpen(false);
  };

  const handleDeleteMember = async (id: string) => {
    if (id === user.uid) {
      alert("You cannot delete yourself.");
      return;
    }
    if (confirm('Are you sure you want to remove this team member?')) {
      await dbService.delete('users', id);
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="h-full flex flex-col p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Team</h2>
          <p className="text-zinc-500 text-sm">Manage your agency team and roles.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <UserPlus size={18} />
            Add Member
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {members.map((member, i) => (
                <motion.div
                  key={member.uid || member.email}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 hover:border-zinc-700 transition-all group relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-white">
                        {member.name[0]}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{member.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-widest font-mono">
                          <Shield size={12} className={member.role === 'admin' ? 'text-amber-500' : 'text-zinc-500'} />
                          {member.role.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    {isAdmin && member.uid !== user.uid && (
                      <button 
                        onClick={() => handleDeleteMember(member.uid || member.email)}
                        className="text-zinc-600 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <Mail size={14} />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                      <span>Status</span>
                      <span className="text-emerald-500">Active</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add Team Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Full Name</label>
            <input
              required
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Rahul Sharma"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Email Address</label>
            <input
              required
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. rahul@gmail.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Role</label>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value as UserRole })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
            >
              <option value="team_member">Team Member</option>
              <option value="account_manager">Account Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors mt-4"
          >
            Add Member
          </button>
        </form>
      </Modal>
    </div>
  );
}
