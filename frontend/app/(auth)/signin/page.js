'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid credentials, please check email/password');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-brand-neutral-white overflow-hidden">
      {/* Left Column: Visual Panel (45%) */}
      <div className="hidden md:flex md:w-[45%] h-full bg-[#E1E9D2] relative overflow-hidden items-center justify-center p-8 select-none">
        <div className="w-full max-w-md aspect-[4/5] bg-brand-surface/65 backdrop-blur-md rounded-[32px] border border-white/50 shadow-2xl p-8 flex flex-col items-center justify-between relative">
          
          {/* Top-Left Avatar Accent */}
          <div className="absolute top-8 left-8 w-11 h-11 rounded-full border border-brand-black bg-[#FAFBFB] flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <svg viewBox="0 0 100 100" className="w-9 h-9 text-brand-black">
              <circle cx="50" cy="38" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M30 75 C30 62, 70 62, 70 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M43 38 A 1 1 0 0 0 45 38 A 1 1 0 0 0 43 38 Z M55 38 A 1 1 0 0 0 57 38 A 1 1 0 0 0 55 38 Z" fill="currentColor" />
              <path d="M44 48 Q50 54 56 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Middle-Right Avatar Accent */}
          <div className="absolute top-1/2 -right-4 w-11 h-11 rounded-full border border-brand-black bg-[#FAFBFB] flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] transform -translate-y-1/2">
            <svg viewBox="0 0 100 100" className="w-9 h-9 text-brand-black">
              <circle cx="50" cy="38" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M30 75 C30 62, 70 62, 70 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="48" r="4" fill="currentColor" />
              <path d="M42 38 A 1 1 0 0 0 44 38 A 1 1 0 0 0 42 38 Z M56 38 A 1 1 0 0 0 58 38 A 1 1 0 0 0 56 38 Z" fill="currentColor" />
            </svg>
          </div>

          {/* Floating Integration Task Card */}
          <div className="absolute bottom-28 left-4 bg-[#FAFBFB] rounded-[20px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-brand-grey-light/40 w-44 z-20 flex flex-col gap-2">
            <div>
              <p className="text-[13px] font-bold text-brand-black leading-tight">Canva Design</p>
              <p className="text-[10px] text-brand-grey-muted">10 Tasks</p>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="px-2 py-0.5 rounded-full border border-brand-black text-brand-black text-[9px] font-bold">Design</span>
              {/* Radial progress 84% */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="16" cy="16" r="12" stroke="#E1E9D2" strokeWidth="2.5" fill="transparent" />
                  <circle cx="16" cy="16" r="12" stroke="#BEC658" strokeWidth="2.5" fill="transparent" strokeDasharray="75.3" strokeDashoffset="12" />
                </svg>
                <span className="absolute text-[8px] font-extrabold text-brand-black">84%</span>
              </div>
            </div>
          </div>

          {/* Central Meditating Person Illustration */}
          <div className="w-full flex justify-center items-center mt-10">
            <svg viewBox="0 0 200 200" className="w-56 h-56 text-brand-black">
              {/* Calm energy waves */}
              <path d="M 60 70 C 40 50, 40 20, 80 20 C 90 5, 110 5, 120 20 C 160 20, 160 50, 140 70" fill="none" stroke="#BEC658" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" />
              
              {/* Crossed legs / Base */}
              <path d="M 45 150 C 55 168, 145 168, 155 150 C 135 138, 65 138, 45 150 Z" fill="#FAFBFB" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 65 146 C 80 137, 120 137, 135 146" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              
              {/* Mudra hands */}
              <circle cx="37" cy="115" r="4.5" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="163" cy="115" r="4.5" fill="none" stroke="currentColor" strokeWidth="3" />
              
              {/* Arms */}
              <path d="M 70 110 C 50 115, 40 115, 37 115" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 130 110 C 150 115, 160 115, 163 115" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />

              {/* Body (Green sweater) */}
              <path d="M 78 90 L 73 115 L 85 140 L 115 140 L 127 115 L 122 90 Z" fill="#BEC658" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
              
              {/* Heart logo on sweater */}
              <path d="M 100 110 C 96 103, 90 108, 100 118 C 110 108, 104 103, 100 110 Z" fill="#FAFBFB" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Neck */}
              <rect x="96" y="78" width="8" height="12" fill="#FAFBFB" stroke="currentColor" strokeWidth="3.5" />

              {/* Head */}
              <circle cx="100" cy="65" r="16" fill="#FAFBFB" stroke="currentColor" strokeWidth="3.5" />
              
              {/* Hair */}
              <path d="M 84 65 C 84 48, 116 48, 116 65" fill="currentColor" />
              
              {/* Face details */}
              <path d="M 94 64 Q96 65 98 64" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M 102 64 Q104 65 106 64" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M 97 73 Q100 75 103 73" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Carousel Indicator Dots */}
          <div className="flex gap-1.5 mt-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-black/20"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-black/20"></span>
            <span className="w-4.5 h-1.5 rounded-full bg-brand-black"></span>
          </div>

          {/* Slogan */}
          <div className="text-center mt-2">
            <h3 className="text-brand-black font-bold text-[16px] leading-tight">
              Make your work easier and organized
            </h3>
            <p className="text-[13px] text-brand-grey-muted mt-0.5 font-medium">
              with OnboardPro
            </p>
          </div>

        </div>
      </div>

      {/* Right Column: Form Card Area (55%) */}
      <div className="w-full md:w-[55%] h-full flex items-center justify-center p-8 lg:p-12 bg-brand-neutral-white">
        <div className="w-full max-w-md bg-brand-surface p-8 md:p-12 rounded-[16px] shadow-[0_4px_20px_rgba(18,18,18,0.06)] border border-brand-grey-light">
          <div className="mb-8">
            <h1 className="text-h1 font-bold text-brand-black mb-2 text-[32px] tracking-tight">Welcome Back</h1>
            <p className="text-brand-grey-muted text-[16px]">Sign in to continue to your dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-brand-pink-soft text-brand-black rounded-[8px] text-[14px]">
              {error}
            </div>
          )}

          {forgotMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-[8px] text-[13px] flex justify-between items-center">
              <span>To reset your password, please contact your HR administrator.</span>
              <button type="button" onClick={() => setForgotMessage(false)} className="font-bold hover:opacity-85 text-xs ml-2 uppercase">Close</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[14px] font-medium text-brand-black" htmlFor="signin-email">
                Email Address
              </label>
              <input
                type="email"
                id="signin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full h-12 px-5 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[16px]"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[14px] font-medium text-brand-black" htmlFor="signin-password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMessage(true)}
                  className="text-[12px] text-brand-lime-olive font-semibold hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <input
                type="password"
                id="signin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-5 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[16px]"
                required
              />
            </div>

            <button
              type="submit"
              id="signin-submit-btn"
              disabled={loading}
              className="w-full h-12 bg-brand-black text-white rounded-full font-semibold text-[16px] hover:bg-brand-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-brand-black disabled:bg-brand-grey-light disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-brand-grey-muted text-[14px]">
              Not a member?{' '}
              <a href="/register" className="text-brand-lime-olive font-bold hover:underline">
                Register
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
