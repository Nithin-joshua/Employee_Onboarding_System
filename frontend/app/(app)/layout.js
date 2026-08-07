'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

export default function AppLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-neutral-white">
        <p className="text-brand-grey-muted text-[16px]">Loading session...</p>
      </div>
    );
  }

  // Redirect to sign in if no session
  if (!session) {
    if (typeof window !== 'undefined') {
      router.push('/signin');
    }
    return null;
  }

  const role = session.user?.role || 'NEW_HIRE';
  const name = session.user?.name || 'User';
  const email = session.user?.email || '';
  const initial = name.charAt(0).toUpperCase();

  // Mapped indicator border color based on role
  const getAvatarRingColor = () => {
    switch (role) {
      case 'HR':
        return 'border-[#BFBBF2]'; // Lavender
      case 'MANAGER':
        return 'border-[#F7B06B]'; // Amber
      case 'NEW_HIRE':
      default:
        return 'border-[#BEC658]'; // Lime
    }
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'HR':
        return 'bg-brand-lavender/25 text-[#5c598a]';
      case 'MANAGER':
        return 'bg-brand-amber/25 text-brand-black';
      case 'NEW_HIRE':
      default:
        return 'bg-brand-lime/25 text-[#4c5100]';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-neutral-white">
      {/* Dynamic Shell Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-brand-grey-light bg-brand-surface/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span 
            onClick={() => router.push('/')}
            className="text-[22px] font-black text-brand-black tracking-tight cursor-pointer hover:opacity-90 select-none"
          >
            OnboardPro
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${getRoleBadgeColor()}`}>
            {role.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {/* Suppressed / minimal search or links */}
          <button className="text-brand-grey-muted hover:text-brand-black transition-colors relative">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-pink rounded-full border border-brand-surface"></span>
          </button>

          {/* User Profile Dropdown & Logout Button */}
          <div className="flex items-center gap-3 border-l border-brand-grey-light pl-4">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[14px] font-bold text-brand-black">{name}</span>
              <span className="text-[11px] text-brand-grey-muted">{email}</span>
            </div>
            
            {/* Dynamic Avatar with Mapped Border Accent */}
            <div 
              className={`w-10 h-10 rounded-full border-[3px] ${getAvatarRingColor()} bg-brand-cool-white flex items-center justify-center text-brand-black font-bold text-[15px] select-none`}
            >
              {initial}
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/signin' })}
              className="text-[12px] font-bold text-brand-grey-muted hover:text-brand-pink transition-colors pl-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Authenticated Application Canvas */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
