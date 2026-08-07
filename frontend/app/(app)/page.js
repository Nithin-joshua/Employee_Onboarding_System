'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
