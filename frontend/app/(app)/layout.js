'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '../../lib/apiClient';
import {
  Sun, Moon, Bell, Search, ChevronDown,
  Home, UserPlus, Key, FileText, CheckSquare, Shield,
  LogOut, Menu, X, Loader2
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const role = session?.user?.role || 'NEW_HIRE';
  const name = session?.user?.name || 'User';
  const email = session?.user?.email || '';

  const [photoUrl, setPhotoUrl] = useState(null);
  
  // Derives immediate fallback from email prefix (e.g. suprithe_023@... -> S) to avoid displaying generic 'User' / 'U'
  const getInitialName = () => {
    if (session?.user?.name && session.user.name !== 'User') return session.user.name;
    if (session?.user?.email) {
      const prefix = session.user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'User';
  };
  const [displayName, setDisplayName] = useState(getInitialName());

  useEffect(() => {
    if (!session || !session?.user?.employeeId) return;
    const fetchProfileDetails = async () => {
      try {
        const empData = await request(`/employees/${session.user.employeeId}`, { method: 'GET' }, session);
        if (empData?.personal?.name) {
          setDisplayName(empData.personal.name);
        }

        const docData = await request(`/employees/${session.user.employeeId}/documents`, { method: 'GET' }, session);
        const matchedPhoto = docData.find(d => d.type === 'PHOTO');
        if (matchedPhoto?.signedUrl) {
          setPhotoUrl(matchedPhoto.signedUrl);
        }
      } catch (err) {
        console.error('Failed to fetch profile details:', err);
      }
    };
    fetchProfileDetails();
  }, [session]);

  const initial = displayName.charAt(0).toUpperCase();

  // Fetch employees list on focus
  const handleSearchFocus = async () => {
    setSearchFocused(true);
    if (employeesList.length > 0) return;
    try {
      setSearchLoading(true);
      const data = await request('/employees', { method: 'GET' }, session);
      setEmployeesList(data || []);
    } catch (err) {
      console.error('Failed to load search index:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Filter list
  const filteredEmployees = searchQuery.trim() === ''
    ? []
    : employeesList.filter(emp => 
        emp.personal?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.personal?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.job?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  // SSE Stream
  useEffect(() => {
    if (!session || (role !== 'HR' && role !== 'MANAGER')) return;
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const eventSource = new EventSource(`${baseUrl}/employee/live-status`);
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const newNotification = {
          id: Date.now().toString(),
          title: `Status Changed`,
          desc: `${payload.employeeName || 'Employee'} status updated to ${payload.toStatus?.replace(/_/g, ' ')}`,
          time: 'Just now',
          unread: true
        };
        setNotifications(prev => [newNotification, ...prev]);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };
    
    return () => {
      eventSource.close();
    };
  }, [session, role]);

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

  const getNavItems = () => {
    if (role === 'HR') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: Home },
        { name: 'Add New Hire', path: '/employees/new', icon: UserPlus },
        { name: 'Invitations', path: '/settings/invitations', icon: Key },
        { name: 'Admin Panel', path: '/admin', icon: Shield },
      ];
    } else if (role === 'MANAGER') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: Home }
      ];
    } else {
      return [
        { name: 'Onboarding', path: '/onboarding', icon: CheckSquare },
        { name: 'Documents', path: '/onboarding/documents', icon: FileText },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 w-full h-14 border-b border-[var(--border-color)] bg-[var(--card-bg)]/95 backdrop-blur-md flex items-center px-6 justify-between gap-4 shadow-sm shadow-emerald-500/5">

        {/* Left Side: Brand and Links */}
        <div className="flex items-center gap-6 overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer select-none shrink-0" onClick={() => router.push('/')}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse" />
            <span
              className="text-[16px] font-bold text-[var(--foreground)] tracking-tight hover:text-[var(--color-accent)] transition-colors"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              OnboardPro
            </span>
          </div>

          <span className="hidden sm:inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-bold tracking-wider border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 uppercase shrink-0">
            {role.replace('_', ' ')}
          </span>

          {/* Top Header Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path === '/dashboard' && pathname === '/');
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`h-8 px-3.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold shadow-sm shadow-emerald-500/5'
                      : 'text-[var(--text-muted)] hover:text-neutral-900 hover:bg-neutral-100/55 border-transparent'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Search, Notifications, Avatar */}
        <div className="flex items-center gap-3">
          {/* Search — functional */}
          <div className="hidden lg:flex items-center w-52 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[var(--text-faint)]" />
            <input
              type="text"
              placeholder="Search employees…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-color)] bg-neutral-50/50 text-[12.5px] text-[var(--foreground)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[var(--color-accent)] transition-all"
            />
            {searchFocused && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSearchFocused(false)} />
                <div className="absolute top-9 left-0 right-0 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[8px] shadow-lg max-h-60 overflow-y-auto p-1.5 z-20 space-y-1">
                  {searchLoading && (
                    <p className="text-[12px] text-[var(--text-muted)] p-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-[var(--color-accent)]" /> Loading index...</p>
                  )}
                  {!searchLoading && filteredEmployees.length === 0 && (
                    <p className="text-[12px] text-[var(--text-muted)] p-2">
                      {searchQuery.trim() === '' ? 'Type to search...' : 'No employees found'}
                    </p>
                  )}
                  {!searchLoading && filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        router.push(`/employees/${emp.id}`);
                        setSearchQuery('');
                        setSearchFocused(false);
                      }}
                      className="p-2 rounded-[6px] hover:bg-[var(--border-color)]/30 cursor-pointer text-left text-[12px] transition-colors"
                    >
                      <p className="font-semibold text-[var(--foreground)]">{emp.personal?.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{emp.job?.title} · {emp.job?.department}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bell Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-neutral-900 hover:bg-neutral-100/50 transition-all border border-transparent hover:border-neutral-200/50"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white shadow-sm scale-90">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-9 w-72 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-lg p-3.5 z-20 space-y-2.5 text-left">
                  <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                    <span className="text-[13px] font-bold text-[var(--foreground)]">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-[var(--color-accent)] font-semibold hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-[var(--text-muted)] text-center py-4">No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            // Mark item as read on click
                            setNotifications(notifications.map(x => x.id === n.id ? { ...x, unread: false } : x));
                          }}
                          className={`p-2.5 rounded-lg text-[11px] leading-tight transition-colors cursor-pointer border ${
                            n.unread 
                              ? 'bg-emerald-50/50 border-emerald-100/70' 
                              : 'hover:bg-neutral-50 border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`font-semibold text-[var(--foreground)] ${n.unread ? 'text-emerald-950 font-bold' : ''}`}>{n.title}</span>
                            <span className="text-[9px] text-[var(--text-faint)] shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">{n.desc}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Avatar Profile Dropdown */}
          <div className="relative flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border-color)]">
            <button 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-8 h-8 rounded-full overflow-hidden bg-emerald-50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-[12px] flex items-center justify-center transition-all select-none border border-emerald-100 shadow-sm"
            >
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </button>

            {showProfileDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileDropdown(false)} />
                <div className="absolute right-0 top-10 w-48 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-lg p-3.5 z-20 space-y-3 text-left text-[12px]">
                  <div className="border-b border-[var(--border-color)] pb-2.5">
                    <p className="font-bold text-[var(--foreground)] leading-tight">{displayName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">Role</p>
                    <p className="font-medium text-[var(--foreground)]">{role.replace('_', ' ')}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/signin' })}
                    className="w-full py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sub-Navigation (Horizontal list visible on sm only) */}
      <div className="md:hidden w-full bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/dashboard' && pathname === '/');
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`h-7 px-3 rounded-md text-[11.5px] font-medium transition-all flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold'
                  : 'text-[var(--text-muted)] hover:text-neutral-900 border-transparent'
              }`}
            >
              <item.icon className="w-3 h-3" />
              {item.name}
            </button>
          );
        })}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex">
        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 px-6 py-8 md:px-8 overflow-y-auto max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
