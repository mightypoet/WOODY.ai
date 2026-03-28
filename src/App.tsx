import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { dbService, testConnection } from './services/dbService';
import { User, UserRole } from './types';
import { Layout, MessageSquare, LayoutDashboard, Users, Briefcase, CreditCard, LogOut, Loader2, Send, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import ProjectBoard from './components/ProjectBoard';
import PaymentTracker from './components/PaymentTracker';
import TeamManagement from './components/TeamManagement';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'clients' | 'projects' | 'payments' | 'team'>('chat');

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore
        let userData = await dbService.get('users', firebaseUser.uid) as any;
        if (!userData) {
          // Create new user
          const role: UserRole = (firebaseUser.email === 'reelywood@gmail.com' || firebaseUser.email === 'rohan00as@gmail.com') ? 'admin' : 'team_member';
          userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: role,
            createdAt: new Date().toISOString()
          };
          await dbService.set('users', firebaseUser.uid, userData);
        }
        setUser(userData as User);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login popup was closed by the user.");
      } else {
        console.error("Login failed:", error);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="animate-spin w-8 h-8 opacity-50" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tighter">WOODY</h1>
            <p className="text-zinc-500 text-lg">The AI Operating System for Reelywood.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Sign in with Google
          </button>
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
  ];

  return (
    <div className="h-screen w-screen flex bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col p-4">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-bold tracking-tighter">WOODY</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Reelywood OS</p>
        </div>

        <nav className="flex-1 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <tab.icon size={18} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-4 border-t border-zinc-800 space-y-4">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            {activeTab === 'chat' && <ChatInterface user={user} />}
            {activeTab === 'dashboard' && <Dashboard user={user} />}
            {activeTab === 'clients' && <ClientList user={user} />}
            {activeTab === 'projects' && <ProjectBoard user={user} />}
            {activeTab === 'payments' && <PaymentTracker user={user} />}
            {activeTab === 'team' && <TeamManagement user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
