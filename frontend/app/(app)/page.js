'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/signin');
    } else {
      const role = session.user?.role;
      if (role === 'HR' || role === 'MANAGER') {
        router.push('/dashboard');
      } else if (role === 'NEW_HIRE') {
        router.push('/onboarding');
      } else {
        router.push('/signin');
      }
    }
  }, [session, status, router]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-3"
    >
      <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" />
      <p className="text-[var(--text-muted)] text-[14px] font-medium tracking-wide">Redirecting you...</p>
    </motion.div>
  );
}
