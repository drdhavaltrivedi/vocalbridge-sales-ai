import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
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
import LandingPage from './pages/LandingPage';
import DocsPage from './pages/DocsPage';

function AppLayout({ userRole, setUserRole }: { userRole: UserRole, setUserRole: (role: UserRole) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'], path: '/dashboard' },
    { id: 'clients', label: 'Clients', icon: Users, roles: ['admin', 'agent'], path: '/clients' },
    { id: 'calls', label: 'Call Monitor', icon: PhoneCall, roles: ['admin', 'agent'], path: '/calls' },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, roles: ['admin'], path: '/knowledge' },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'], path: '/settings' },
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
          <img src="/logo.png" alt="VocalBridge Logo" className="w-10 h-10 object-contain rounded-lg" />
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
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
                  isActive 
                    ? "bg-[#E4E3E0] text-[#1a1a1a]" 
                    : "text-[#8E9299] hover:text-[#E4E3E0] hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5" />
                {isSidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{item.label}</motion.span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Role Switcher (Demo Only) */}
        {isSidebarOpen && (
          <div className="px-6 py-4 border-t border-white/5 space-y-3">
            <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest text-center">Switch Persona</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setUserRole('admin')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  userRole === 'admin' ? "bg-[#F27D26] text-[#1a1a1a]" : "bg-white/5 text-[#8E9299]"
                )}
              >
                Admin
              </button>
              <button 
                onClick={() => setUserRole('agent')}
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
            onClick={() => {
              localStorage.removeItem('vocalbridge_test_mode');
              signOut(auth);
              window.location.reload();
            }}
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
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<ClientManager />} />
                <Route path="/calls" element={<CallMonitor />} />
                <Route path="/knowledge" element={userRole === 'admin' ? <KnowledgeBase /> : <Navigate to="/dashboard" />} />
                <Route path="/settings" element={userRole === 'admin' ? <SettingsPage /> : <Navigate to="/dashboard" />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isTestMode = localStorage.getItem('vocalbridge_test_mode') === 'true';
    if (isTestMode) {
      setUser({ uid: 'test-user', email: 'test@vocalbridge.ai' } as User);
      setLoading(false);
      return;
    }

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

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

        {/* Protected app routes */}
        {user ? (
          <Route path="/*" element={<AppLayout userRole={userRole} setUserRole={setUserRole} />} />
        ) : (
          <Route path="/*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
