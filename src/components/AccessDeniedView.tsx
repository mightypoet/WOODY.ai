import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { logout as googleLogout } from '../services/googleAuth';

export default function AccessDeniedView() {
  const handleLogout = () => {
    googleLogout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="text-red-500" size={32} />
        </div>
        
        <h1 className="text-2xl font-bold mb-3 tracking-tight">Access Denied</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Your account is pending approval. You must be added to the authorized team list by the administrator before you can access this workspace.
        </p>

        <button 
          onClick={handleLogout}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
