'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const spring = { type: 'spring', stiffness: 300, damping: 28 };

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [regSection, setRegSection] = useState('A');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [form, setForm] = useState({
    invitationCode: '',
    email: '',
    pass: '',
    name: '',
    dob: '',
    phone: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split('');
      const newOtpValues = [...otpValues];
      pasted.forEach((char, i) => { newOtpValues[i] = char; });
      setOtpValues(newOtpValues);
      setOtp(newOtpValues.join(''));
      document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
      return;
    }
    const newOtpValues = [...otpValues];
    newOtpValues[index] = cleanValue;
    setOtpValues(newOtpValues);
    setOtp(newOtpValues.join(''));
    if (cleanValue && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.dob || !form.phone) {
      setError('Please fill in all personal details.');
      return;
    }
    setError('');
    setRegSection('B');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regSection === 'A') { handleContinue(e); return; }
    if (!form.invitationCode || !form.pass) {
      setError('Please fill in all security details.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Registration failed');
      }
      setEmail(form.email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Verification failed');
      }
      router.push('/signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setOtpSuccessMessage('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Resend failed');
      setOtpSuccessMessage('A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(form.pass);
  const strengthColor = strength <= 1 ? 'bg-red-400' : strength <= 3 ? 'bg-amber-400' : 'bg-emerald-500';
  const strengthLabel = strength <= 1 ? 'Weak' : strength <= 3 ? 'Fair' : 'Strong';

  // Step indicator
  const totalSteps = [
    { label: 'Personal' },
    { label: 'Credentials' },
    { label: 'Verify' },
  ];
  const currentStepIndex = step === 2 ? 2 : regSection === 'A' ? 0 : 1;

  const inputClass = "w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-[14px] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all";
  const labelClass = "block text-[13px] font-medium text-[var(--foreground)] mb-1.5";

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-[26px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
            OnboardPro
          </span>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Create your account</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-6 px-1">
          {totalSteps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  i < currentStepIndex ? 'bg-[var(--color-accent)] text-white' :
                  i === currentStepIndex ? 'bg-[var(--foreground)] text-[var(--card-bg)]' :
                  'bg-[var(--border-color)] text-[var(--text-faint)]'
                }`}>{i + 1}</div>
                <span className={`text-[10px] font-medium transition-colors ${
                  i === currentStepIndex ? 'text-[var(--foreground)]' : 'text-[var(--text-faint)]'
                }`}>{s.label}</span>
              </div>
              {i < totalSteps.length - 1 && (
                <div className={`flex-1 h-px mb-4 transition-colors ${i < currentStepIndex ? 'bg-[var(--color-accent)]' : 'bg-[var(--border-color)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[var(--card-bg)] rounded-[14px] p-7" style={{ boxShadow: 'var(--shadow-md)' }}>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 px-4 py-3 rounded-[8px] bg-red-50 border border-red-100 text-red-600 text-[13px]">
                {error}
              </motion.div>
            )}
            {otpSuccessMessage && (
              <motion.div key="suc" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 px-4 py-3 rounded-[8px] bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px]">
                {otpSuccessMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">

            {/* ── Step 1 Personal ── */}
            {step === 1 && regSection === 'A' && (
              <motion.form key="personal" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring}
                onSubmit={handleContinue} className="space-y-4">
                <div>
                  <label className={labelClass}>Full name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Work email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Date of birth</label>
                    <input type="date" name="dob" value={form.dob} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" required className={inputClass} />
                  </div>
                </div>
                <button type="submit" className="w-full h-10 mt-1 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[14px] font-semibold transition-all" style={{ fontFamily: 'var(--font-display)' }}>
                  Continue
                </button>
              </motion.form>
            )}

            {/* ── Step 2 Credentials ── */}
            {step === 1 && regSection === 'B' && (
              <motion.form key="credentials" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring}
                onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className={labelClass}>Invitation code (Use WELCOME2026)</label>
                  <input type="text" name="invitationCode" value={form.invitationCode} onChange={handleChange} placeholder="WELCOME2026" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="pass"
                      value={form.pass}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full h-10 pl-3 pr-10 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-[14px] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-faint)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.pass && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${strength >= i ? strengthColor : 'bg-[var(--border-color)]'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">{strengthLabel} password</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setRegSection('A'); setError(''); }}
                    className="h-10 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] text-[14px] font-medium hover:bg-[var(--background)] transition-all flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 h-10 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[14px] font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Registering…</> : 'Create account'}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Step 3 OTP ── */}
            {step === 2 && (
              <motion.form key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring}
                onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center space-y-1 mb-2">
                  <p className="text-[14px] font-medium text-[var(--foreground)]">Check your email</p>
                  <p className="text-[13px] text-[var(--text-muted)]">We sent a 6-digit code to <span className="font-medium text-[var(--foreground)]">{email}</span></p>
                </div>
                <div className="flex justify-center gap-2">
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={val}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-12 text-center text-[18px] font-bold rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
                    />
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setStep(1); setRegSection('B'); setError(''); setOtpSuccessMessage(''); }}
                    className="h-10 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] text-[14px] font-medium hover:bg-[var(--background)] transition-all flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button type="submit" disabled={loading || otp.length < 6}
                    className="flex-1 h-10 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[14px] font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Verify email'}
                  </button>
                </div>
                <p className="text-center text-[13px] text-[var(--text-muted)]">
                  Didn&apos;t receive it?{' '}
                  <button type="button" onClick={handleResendOtp} disabled={loading} className="text-[var(--foreground)] font-medium underline underline-offset-4 hover:text-[var(--color-accent)] transition-colors disabled:opacity-50">
                    Resend code
                  </button>
                </p>
              </motion.form>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-[13px] text-[var(--text-muted)] mt-6">
          Already have an account?{' '}
          <Link href="/signin" className="text-[var(--foreground)] font-medium underline underline-offset-4 hover:text-[var(--color-accent)] transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
