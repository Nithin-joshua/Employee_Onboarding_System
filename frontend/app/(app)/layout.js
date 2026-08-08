'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, Bell, Search, ChevronDown,
  Home, UserPlus, Key, FileText, CheckSquare,
  LogOut, Menu, X, Loader2
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMoreOpen, setShowMoreOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!session) {
    if (typeof window !== 'undefined') router.push('/signin');
    return null;
  }

  const role = session.user?.role || 'NEW_HIRE';
  const name = session.user?.name || 'User';
  const email = session.user?.email || '';
  const initial = name.charAt(0).toUpperCase();

  const getNavItems = () => {
    if (role === 'HR') {
      return {
        general: [
          { name: 'Dashboard', path: '/dashboard', icon: Home },
          { name: 'Add New Hire', path: '/employees/new', icon: UserPlus },
        ],
        more: [
          { name: 'Invitations', path: '/settings/invitations', icon: Key },
        ]
      };
    } else if (role === 'MANAGER') {
      return {
        general: [{ name: 'Dashboard', path: '/dashboard', icon: Home }],
        more: []
      };
    } else {
      return {
        general: [
          { name: 'Onboarding', path: '/onboarding', icon: CheckSquare },
          { name: 'Documents', path: '/onboarding/documents', icon: FileText },
        ],
        more: []
      };
    }
  };

  const navItems = getNavItems();

  const NavButton = ({ item }) => {
    const isActive = pathname === item.path || (item.path === '/dashboard' && pathname === '/');
    const Icon = item.icon;
    return (
      <button
        onClick={() => { router.push(item.path); setSidebarOpen(false); }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all text-left ${
          isActive
            ? 'bg-[var(--color-accent)] text-white'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-color)]/40'
        }`}
      >
        <Icon className="w-[15px] h-[15px] shrink-0" />
        {item.name}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 w-full h-14 border-b border-[var(--border-color)] bg-[var(--card-bg)]/90 backdrop-blur-md flex items-center px-4 gap-4">

        {/* Mobile menu */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-color)]/40 transition-all">
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <span
          onClick={() => router.push('/')}
          className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight cursor-pointer select-none shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          OnboardPro
        </span>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-semibold tracking-wide border border-[var(--border-color)] text-[var(--text-muted)] uppercase shrink-0">
          {role.replace('_', ' ')}
        </span>

        {/* Search — decorative */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 text-[var(--text-faint)]" />
          <input
            type="text"
            readOnly
            aria-hidden="true"
            placeholder="Search…"
            className="w-full h-8 pl-8 pr-3 rounded-[6px] border border-[var(--border-color)] bg-[var(--background)] text-[13px] text-[var(--text-muted)] placeholder:text-[var(--text-faint)] cursor-default focus:outline-none opacity-70"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Period — decorative */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[var(--border-color)] text-[12px] text-[var(--text-muted)] cursor-default select-none opacity-70" aria-hidden="true">
            Monthly <ChevronDown className="w-3 h-3" />
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-color)]/40 transition-all" title="Toggle theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Bell */}
          <button className="relative p-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-color)]/40 transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full" />
          </button>

          {/* Avatar + Sign out */}
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border-color)]">
            <div className="w-7 h-7 rounded-full bg-[var(--foreground)]/10 flex items-center justify-center text-[var(--foreground)] font-semibold text-[12px] select-none" title={`${name} (${email})`}>
              {initial}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/signin' })}
              className="p-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-color)]/40 transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex">

        {/* ── SIDEBAR ── */}
        <AnimatePresence>
          {(sidebarOpen || true) && (
            <aside className={`
              fixed md:sticky top-14 bottom-0 left-0 z-30
              w-52 bg-[var(--card-bg)] border-r border-[var(--border-color)]
              py-4 px-3 flex flex-col gap-6
              h-[calc(100vh-56px)]
              transform transition-transform duration-200 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>

              {/* GENERAL */}
              {navItems.general.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-widest px-3 mb-2">General</p>
                  {navItems.general.map(item => <NavButton key={item.name} item={item} />)}
                </div>
              )}

              {/* MORE */}
              {navItems.more.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-widest px-3 mb-2">More</p>
                  {navItems.more.map(item => <NavButton key={item.name} item={item} />)}
                </div>
              )}

              {/* Interactions expander */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowMoreOpen(!showMoreOpen)}
                  className="w-full flex justify-between items-center px-3 py-1.5 text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-widest hover:text-[var(--text-muted)] transition-colors"
                >
                  Interactions
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMoreOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showMoreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {['Support Channel', 'HR Handbook', 'FAQ Docs'].map(label => (
                        <button key={label} className="w-full text-left px-3 py-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors rounded-[6px]">{label}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Enterprise CTA — HR/MANAGER only */}
              {(role === 'HR' || role === 'MANAGER') && (
                <div className="mt-auto">
                  <div className="rounded-[10px] border border-[var(--border-color)] bg-[var(--background)] p-3 text-center space-y-2">
                    <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest">Enterprise</p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight">Need custom automation?</p>
                    <button
                      onClick={() => alert('Contact sales@onboardpro.com')}
                      className="w-full py-1.5 rounded-[6px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[11px] font-semibold transition-all"
                    >
                      Contact Sales
                    </button>
                  </div>
                </div>
              )}
            </aside>
          )}
        </AnimatePresence>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 px-6 py-8 md:px-8 overflow-y-auto max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
