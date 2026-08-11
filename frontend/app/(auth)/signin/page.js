'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock, Sparkles, ShieldCheck, FileCheck, Eye, EyeOff } from 'lucide-react';

export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex bg-neutral-50/50">
      {/* Left side: Premium Branding/Info Panel (Visible on md+) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-50/70 via-emerald-100/30 to-white p-12 flex-col justify-between text-neutral-800 border-r border-[var(--border-color)] select-none">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-500/10 blur-[100px] rounded-full -mr-24 -mb-24" />

        {/* Top Header */}
        <div className="relative flex items-center gap-2">
          <span className="text-[22px] font-bold tracking-tight text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-display)' }}>
            OnboardPro
          </span>
        </div>

        {/* Feature showcase */}
        <div className="relative my-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-neutral-900" style={{ fontFamily: 'var(--font-display)' }}>
              Streamlined Candidate Compliance & OCR
            </h2>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Verify credentials, automate document parsing with Mistral AI, and fast-track hiring workflows in a secure workspace.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-500/10', title: 'Mistral OCR Parser', desc: 'Auto-extract structured metadata from IDs and forms.' },
              { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10', title: 'Statutory Verification', desc: 'Secure manager approval gates and audit logs.' },
              { icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10', title: 'Compliance Workflows', desc: 'Fully automated PDF generation and signatures.' }
            ].map((f, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="flex gap-4 p-4 rounded-xl border border-emerald-100/50 bg-white/80 backdrop-blur-sm shadow-[0_4px_16px_rgba(16,185,129,0.02)]"
              >
                <div className={`w-10 h-10 rounded-lg ${f.bg} ${f.color} flex items-center justify-center shrink-0`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-neutral-800">{f.title}</h4>
                  <p className="text-neutral-500 text-[12px] mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Login Form Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-[var(--background)]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="w-full max-w-[400px] space-y-6"
        >
          {/* Logo and title (visible on mobile only) */}
          <div className="text-center md:text-left space-y-1">
            <span className="text-[28px] font-bold tracking-tight text-[var(--foreground)] md:hidden" style={{ fontFamily: 'var(--font-display)' }}>
              OnboardPro
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Sign in to manage your onboardings
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] p-7" style={{ boxShadow: 'var(--shadow-md)' }}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[var(--foreground)]">
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-faint)] pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    required
                    id="signin-email"
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-[14px] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[13px] font-medium text-[var(--foreground)]">
                    Password
                  </label>
                  <span className="text-xs text-[var(--color-accent)] font-medium cursor-pointer hover:underline underline-offset-2 transition-all">
                    Forgot?
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-faint)] pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    id="signin-password"
                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-[14px] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-faint)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="signin-submit"
                className="w-full h-10 mt-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-[var(--color-accent)]/20"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                ) : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-[13px] text-[var(--text-muted)] mt-2">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--foreground)] font-semibold underline underline-offset-4 hover:text-[var(--color-accent)] transition-colors">
              Register with HR Invitation code
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
