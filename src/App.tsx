import React, { useState, useEffect } from 'react';
import { dbService, testConnection } from './services/dbService';
import { googleSignIn, initAuth, logout as googleLogout } from './services/googleAuth';
import { User, UserRole } from './types';
import { Layout, MessageSquare, LayoutDashboard, Users, Briefcase, CreditCard, LogOut, Loader2, Send, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ErrorBoundary from './components/ErrorBoundary';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import ProjectBoard from './components/ProjectBoard';
import PaymentTracker from './components/PaymentTracker';
import TeamManagement from './components/TeamManagement';
import Todos from './components/Todos';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'clients' | 'projects' | 'payments' | 'team' | 'todos'>('chat');
  const [supabaseConfigError, setSupabaseConfigError] = useState<boolean>(false);

  useEffect(() => {
    // If we're inside the popup, let Supabase process hash then close
    if (window.opener && window.name === 'oauth_popup') {
      setTimeout(() => window.close(), 1000);
    }

    
    testConnection();
    
    // Subscribe to auth state changes for Workspace integration
    const unsubscribe = initAuth(
      async (authUser, _fToken) => {
        let userData;
        try {
          // If the get fails, it will fall through to null check
          const rawData = await dbService.get('users', authUser.id);
          userData = rawData as any;
        } catch (err: any) {
          console.warn("Supabase fetch error:", err);
        }
        
        if (!userData) {
          userData = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.displayName || 'Unknown User',
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          try {
            await dbService.set('users', authUser.id, userData);
          } catch(e) {
            console.warn("Could not save to DB, using local default.");
          }
        }
        setUser(userData as User);
        setLoading(false);
      },
      () => {
        setUser(null);
        setLoading(false);
      }
    );
    
    return () => {
      // Unsubscribe wrapper
      unsubscribe();
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    setSupabaseConfigError(false);
    try {
      const result = await googleSignIn();
      if (result) {
        let userData;
        try {
          userData = await dbService.get('users', result.user.id) as any;
        } catch (err: any) {
          console.warn("Supabase fetch error:", err);
        }
        
        if (!userData) {
          userData = {
            id: result.user.id,
            email: result.user.email || '',
            name: result.user.displayName || 'User',
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          try {
            await dbService.set('users', result.user.id, userData);
          } catch(e) {}
        }
        setUser(userData as User);
      } else {
        // If popup closed without result
        setSupabaseConfigError(true);
      }
    } catch(e: any) {
      console.error(e);
      setSupabaseConfigError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="animate-spin w-8 h-8 opacity-50 mb-4" />
        <p className="text-zinc-500 text-sm animate-pulse">Initializing Woody OS...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#111111] text-white p-4 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center space-y-6 max-w-sm w-full relative z-10 flex flex-col items-center"
        >
          <div className="space-y-4 text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white">WOODY</h1>
            <p className="text-[#888888] text-sm tracking-wide font-medium">The AI Operating System for Reelywood.</p>
          </div>
          
          {supabaseConfigError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-4 rounded-xl text-sm w-full mt-4 flex flex-col gap-3 text-left">
              <div className="flex items-start gap-2 text-red-400 font-semibold">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>Supabase Redirect Configuration Missing</p>
              </div>
              <div className="space-y-2 leading-relaxed">
                <p>Authentication succeeded, but Supabase failed to redirect back to this application because this URL is not whitelisted.</p>
                <p><strong>Please follow these steps:</strong></p>
                <ol className="list-decimal pl-4 space-y-1 text-red-200">
                  <li>Go to your <strong>Supabase Dashboard</strong>.</li>
                  <li>Go to <strong>Authentication</strong> &gt; <strong>URL Configuration</strong>.</li>
                  <li>Under <strong>Redirect URIs</strong>, click "Add URI".</li>
                  <li>Copy and paste this exact URL:<br/> <code className="block mt-1 bg-black/40 p-2 rounded selectable text-white break-all">https://ais-dev-hgkbm6uthvuybsjxlc5lgl-57159167953.asia-southeast1.run.app</code> </li>
                  <li>Try signing in again.</li>
                </ol>
              </div>
            </div>
          )}

          <div className="w-full pt-8">
            <button 
              onClick={handleLogin}
              className="w-full py-3.5 px-6 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Building2 },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'todos', label: 'Supabase', icon: CheckCircle2 },
  ];

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex bg-zinc-950 text-white overflow-hidden relative selection:bg-white/30">
        
        {/* DeepMind-style subtle ambient background layers */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-white/5 blur-[120px]" />
        </div>

        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-zinc-950/50 backdrop-blur-3xl flex flex-col p-4 relative z-10">
          <div className="mb-10 px-2 mt-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <span className="font-bold text-black tracking-tighter">W</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">WOODY</h1>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Reelywood Alpha</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative group ${
                  activeTab === tab.id 
                    ? 'text-white bg-white/5 shadow-inner border border-white/10' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-xl bg-white/10 border border-white/20"
                  />
                )}
                <tab.icon size={18} className={`relative z-10 ${activeTab === tab.id ? 'text-white' : 'group-hover:text-white transition-colors'}`} />
                <span className="text-sm font-medium relative z-10">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
              <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-8 h-8 rounded-full object-cover shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-400 uppercase font-mono">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative z-10 overflow-hidden bg-zinc-950/80 backdrop-blur-xl rounded-tl-3xl border-t border-l border-white/5 shadow-2xl flex flex-col">
          {dbError && (
            <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 p-3 px-6 text-sm flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle size={16} />
                <p>{dbError}</p>
              </div>
              <button onClick={() => setDbError(null)} className="text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded-lg text-xs font-bold uppercase tracking-wider">Dismiss</button>
            </div>
          )}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full w-full"
            >
              {activeTab === 'chat' && <ChatInterface user={user} />}
              {activeTab === 'dashboard' && <Dashboard user={user} />}
              {activeTab === 'clients' && <ClientList user={user} />}
              {activeTab === 'projects' && <ProjectBoard user={user} />}
              {activeTab === 'payments' && <PaymentTracker user={user} />}
              {activeTab === 'team' && <TeamManagement user={user} />}
              {activeTab === 'todos' && <Todos />}
            </motion.div>
          </AnimatePresence>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
