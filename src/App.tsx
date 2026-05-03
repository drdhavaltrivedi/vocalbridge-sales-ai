import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  BookOpen, 
  Settings,
  LogOut,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { UserRole } from './types';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import CallMonitor from './components/CallMonitor';
import KnowledgeBase from './components/KnowledgeBase';
import Login from './components/Login';
import SettingsPage from './components/Settings';

type Tab = 'dashboard' | 'clients' | 'calls' | 'knowledge' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'] },
    { id: 'clients', label: 'Clients', icon: Users, roles: ['admin', 'agent'] },
    { id: 'calls', label: 'Call Monitor', icon: PhoneCall, roles: ['admin', 'agent'] },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  const visibleNav = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-[#FDFCFB] text-[#1a1a1a] font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-[#1a1a1a] text-[#E4E3E0] flex flex-col border-r border-[#1a1a1a]/10"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F27D26] rounded-lg flex items-center justify-center font-bold text-[#1a1a1a]">
            V
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg tracking-tight"
            >
              VocalBridge
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
                  isActive 
                    ? "bg-[#E4E3E0] text-[#1a1a1a]" 
                    : "text-[#8E9299] hover:text-[#E4E3E0] hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-[#1a1a1a]" : "text-[#8E9299] group-hover:text-[#E4E3E0]")} />
                {isSidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{item.label}</motion.span>}
              </button>
            );
          })}
        </nav>

        {/* Role Switcher (Demo Only) */}
        {isSidebarOpen && (
          <div className="px-6 py-4 border-t border-white/5 space-y-3">
            <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest text-center">Switch Persona</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { setUserRole('admin'); setActiveTab('dashboard'); }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  userRole === 'admin' ? "bg-[#F27D26] text-[#1a1a1a]" : "bg-white/5 text-[#8E9299]"
                )}
              >
                Admin
              </button>
              <button 
                onClick={() => { setUserRole('agent'); setActiveTab('dashboard'); }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  userRole === 'agent' ? "bg-[#F27D26] text-[#1a1a1a]" : "bg-white/5 text-[#8E9299]"
                )}
              >
                Agent
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E4E3E0] border border-white/20 flex items-center justify-center font-bold text-[10px] text-[#1a1a1a]">
            AD
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
               <p className="text-xs font-bold truncate">System {userRole === 'admin' ? 'Manager' : 'Executive'}</p>
               <p className="text-[9px] text-[#8E9299] uppercase font-bold tracking-tight">{userRole} Portal</p>
            </div>
          )}
          <button 
            onClick={() => signOut(auth)}
            className="text-[#8E9299] hover:text-[#E4E3E0] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <header className="h-16 border-bottom border-[#1a1a1a]/5 bg-white/50 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold capitalize tracking-tight">{activeTab.replace('-', ' ')}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Agent Online
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E4E3E0] border border-[#1a1a1a]/10" />
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'clients' && <ClientManager />}
              {activeTab === 'calls' && <CallMonitor />}
              {activeTab === 'knowledge' && <KnowledgeBase />}
              {activeTab === 'settings' && <SettingsPage />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
