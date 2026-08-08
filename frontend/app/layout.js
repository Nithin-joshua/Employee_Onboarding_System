'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Default is now light; respect saved preference if it exists
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    // No 'dark' class by default → light mode on first load
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-[var(--background)] text-[var(--foreground)] font-sans">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
