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
  Menu,
  ListChecks,
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
import CampaignManager from './pages/CampaignManager';
import ErrorBoundary from './components/ErrorBoundary';

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'], path: '/dashboard' },
  { id: 'clients', label: 'Clients', icon: Users, roles: ['admin', 'agent'], path: '/clients' },
  { id: 'calls', label: 'Call Monitor', icon: PhoneCall, roles: ['admin', 'agent'], path: '/calls' },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, roles: ['admin'], path: '/knowledge' },
  { id: 'campaigns', label: 'Campaigns', icon: ListChecks, roles: ['admin'], path: '/campaigns' },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'], path: '/settings' },
];

function SidebarContent({
  expanded,
  userRole,
  setUserRole,
  onNavClick,
}: {
  expanded: boolean;
  userRole: UserRole;
  setUserRole: (r: UserRole) => void;
  onNavClick?: () => void;
}) {
  const visibleNav = SIDEBAR_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <>
      <div className="p-6 flex items-center gap-3 shrink-0">
        <img src="/logo.png" alt="VocalBridge Logo" className="w-10 h-10 object-contain rounded-lg shrink-0" />
        {expanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-lg tracking-tight"
          >
            VocalBridge
          </motion.span>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onNavClick}
              className={({ isActive }) => cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-[#E4E3E0] text-[#1a1a1a]"
                  : "text-[#8E9299] hover:text-[#E4E3E0] hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {expanded && (
        <div className="px-6 py-4 border-t border-white/5 space-y-3 shrink-0">
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

      <div className="p-4 border-t border-white/10 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#E4E3E0] border border-white/20 flex items-center justify-center font-bold text-[10px] text-[#1a1a1a] shrink-0">
          AD
        </div>
        {expanded && (
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
    </>
  );
}

function AppLayout({ userRole, setUserRole }: { userRole: UserRole; setUserRole: (role: UserRole) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#FDFCFB] text-[#1a1a1a] font-sans overflow-hidden">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-y-0 left-0 z-40 w-[260px] bg-[#1a1a1a] text-[#E4E3E0] flex flex-col md:hidden"
          >
            <SidebarContent
              expanded={true}
              userRole={userRole}
              setUserRole={setUserRole}
              onNavClick={() => setIsMobileOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="hidden md:flex bg-[#1a1a1a] text-[#E4E3E0] flex-col border-r border-[#1a1a1a]/10 shrink-0 overflow-hidden"
      >
        <SidebarContent
          expanded={isSidebarOpen}
          userRole={userRole}
          setUserRole={setUserRole}
        />
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative min-w-0">
        <header className="h-16 border-b border-[#1a1a1a]/5 bg-white/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-[#1a1a1a]" />
            </button>
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setIsSidebarOpen(o => !o)}
              className="hidden md:flex p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#8E9299]"
              aria-label="Toggle sidebar"
            >
              <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isSidebarOpen && "rotate-180")} />
            </button>
            <h1 className="text-lg md:text-xl font-semibold capitalize tracking-tight">
              {activeTab.replace(/-/g, ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="hidden sm:inline">Agent Online</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E4E3E0] border border-[#1a1a1a]/10" />
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes>
                <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="/clients" element={<ErrorBoundary><ClientManager /></ErrorBoundary>} />
                <Route path="/calls" element={<ErrorBoundary><CallMonitor /></ErrorBoundary>} />
                <Route path="/knowledge" element={<ErrorBoundary>{userRole === 'admin' ? <KnowledgeBase /> : <Navigate to="/dashboard" />}</ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary>{userRole === 'admin' ? <SettingsPage /> : <Navigate to="/dashboard" />}</ErrorBoundary>} />
                <Route path="/campaigns" element={<ErrorBoundary>{userRole === 'admin' ? <CampaignManager /> : <Navigate to="/dashboard" />}</ErrorBoundary>} />
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        {user ? (
          <Route path="/*" element={<AppLayout userRole={userRole} setUserRole={setUserRole} />} />
        ) : (
          <Route path="/*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
