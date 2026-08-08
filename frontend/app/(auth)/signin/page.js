'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', {
      redirect: false,
      email: form.email,
      password: form.password,
    });
    if (result?.error) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <span className="text-[28px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
            OnboardPro
          </span>
          <p className="text-[14px] text-[var(--text-muted)] mt-1">
            Sign in to your workspace
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-[var(--card-bg)] rounded-[14px] p-8"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-[8px] bg-red-50 border border-red-100 text-red-600 text-[13px]"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[var(--foreground)]">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                id="signin-email"
                className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-[14px] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[13px] font-medium text-[var(--foreground)]">
                  Password
                </label>
                <span className="text-[12px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--foreground)] transition-colors">
                  Forgot?
                </span>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                id="signin-password"
                className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-[14px] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="signin-submit"
              className="w-full h-10 mt-2 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-[var(--text-muted)] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[var(--foreground)] font-medium underline underline-offset-4 hover:text-[var(--color-accent)] transition-colors">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
