'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = Registration Form, 2 = OTP Verification
  const [regSection, setRegSection] = useState('A'); // 'A' = Personal Details, 'B' = Credentials
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split('');
      const newOtpValues = [...otpValues];
      pasted.forEach((char, i) => {
        newOtpValues[i] = char;
      });
      setOtpValues(newOtpValues);
      const combined = newOtpValues.join('');
      setOtp(combined);
      const nextFocus = Math.min(pasted.length, 5);
      document.getElementById(`otp-${nextFocus}`)?.focus();
      return;
    }

    const newOtpValues = [...otpValues];
    newOtpValues[index] = cleanValue;
    setOtpValues(newOtpValues);
    const combined = newOtpValues.join('');
    setOtp(combined);

    if (cleanValue && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
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
    if (regSection === 'A') {
      handleContinue(e);
      return;
    }

    if (!form.invitationCode || !form.pass) {
      setError('Please fill in all security details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
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
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
      const res = await fetch(`${baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Resend failed');
      }
      alert('A new OTP has been sent to your email.');
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
  const getStrengthColor = () => {
    if (strength <= 1) return 'bg-brand-pink';
    if (strength <= 3) return 'bg-brand-amber';
    return 'bg-brand-lime';
  };

  // Compute overall progress info
  const getCurrentProgressInfo = () => {
    if (step === 2) {
      return { stepLabel: 'Step 3 of 3', width: '100%', title: 'Verify OTP' };
    }
    if (regSection === 'A') {
      return { stepLabel: 'Step 1 of 3', width: '33%', title: 'Personal Info' };
    }
    return { stepLabel: 'Step 2 of 3', width: '66%', title: 'Credentials' };
  };

  const progress = getCurrentProgressInfo();

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-brand-neutral-white overflow-hidden">
      {/* Left Column: Visual Panel (45%) */}
      <div className="hidden md:flex md:w-[45%] h-full bg-[#F1B7D7] relative overflow-hidden items-center justify-center">
        {/* Soft-edged geometric shapes/blobs */}
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-[#BFBBF2] rounded-full blur-[90px] opacity-35 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#BEC658] rounded-full blur-[100px] opacity-25"></div>
        <div className="absolute top-[35%] left-[25%] w-[45%] h-[45%] bg-[#ECB6E6] rounded-full blur-[80px] opacity-40"></div>

        {/* Custom geometric compositions and icon accents */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 space-y-6 select-none">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-3xl bg-brand-surface shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/40 flex items-center justify-center text-[#F68EE1] transform rotate-[-6deg] hover:rotate-0 transition-transform duration-300">
              <span className="material-symbols-outlined text-[36px] font-semibold">description</span>
            </div>
            <div className="w-16 h-16 rounded-3xl bg-brand-surface shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/40 flex items-center justify-center text-[#5c598a] transform rotate-[8deg] hover:rotate-0 transition-transform duration-300">
              <span className="material-symbols-outlined text-[36px] font-semibold">assignment_turned_in</span>
            </div>
          </div>
          <div className="max-w-xs space-y-2">
            <h2 className="text-brand-black font-bold text-[20px] tracking-tight">Onboarding Registration</h2>
            <p className="text-brand-grey-muted text-[14px] leading-relaxed">Provide your details to initiate document verification and contract generation.</p>
          </div>
        </div>
      </div>

      {/* Right Column: Form Panel (55%) */}
      <div className="w-full md:w-[55%] h-full flex flex-col justify-center items-center p-8 lg:p-12 relative bg-brand-neutral-white">
        {step === 1 && regSection === 'B' && (
          <button
            onClick={() => setRegSection('A')}
            className="absolute top-8 left-8 flex items-center text-brand-grey-muted hover:text-brand-black transition-colors font-semibold text-[14px] select-none"
          >
            ← Back
          </button>
        )}
        {step === 2 && (
          <button
            onClick={() => {
              setStep(1);
              setRegSection('B');
            }}
            className="absolute top-8 left-8 flex items-center text-brand-grey-muted hover:text-brand-black transition-colors font-semibold text-[14px] select-none"
          >
            ← Back
          </button>
        )}

        {/* Compact Horizontal Roadmap positioned ABOVE the form card */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-6 px-2 text-[11px] font-bold text-brand-black select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-brand-lime flex items-center justify-center text-brand-black text-[10px] font-extrabold">1</div>
            <span className="text-brand-black">Register</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-brand-grey-slate mx-3"></div>
          <div className="flex items-center gap-1.5 opacity-60">
            <div className="w-5 h-5 rounded-full border-2 border-brand-grey-slate flex items-center justify-center text-brand-grey-muted text-[10px] font-bold">2</div>
            <span className="text-brand-grey-muted">Verify</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-brand-grey-slate mx-3"></div>
          <div className="flex items-center gap-1.5 opacity-60">
            <div className="w-5 h-5 rounded-full border-2 border-brand-grey-slate flex items-center justify-center text-brand-grey-muted text-[10px] font-bold">3</div>
            <span className="text-brand-grey-muted">Sign</span>
          </div>
        </div>

        <div className="w-full max-w-md bg-brand-surface rounded-[16px] shadow-[0_4px_20px_rgba(18,18,18,0.06)] overflow-hidden border border-brand-grey-light">
          {/* Progress Bar Top */}
          <div className="h-1.5 w-full bg-brand-grey-light relative">
            <div
              className="absolute top-0 left-0 h-full bg-brand-lime transition-all duration-500 rounded-r-full"
              style={{ width: progress.width }}
            ></div>
          </div>

          <div className="p-8 lg:p-10">
            <div className="mb-6">
              <p className="text-[12px] font-medium text-brand-grey-muted uppercase tracking-wider mb-1">
                {progress.stepLabel}
              </p>
              <h1 className="text-h2 font-bold text-brand-black text-[28px] leading-tight">
                {progress.title}
              </h1>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-brand-pink-soft text-brand-black rounded-[8px] text-[14px]">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRegister} className="space-y-5">
                {/* Section A: Personal Details */}
                {regSection === 'A' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="block text-[14px] font-medium text-brand-black" htmlFor="name">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full legal name"
                        className="w-full h-11 px-4 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[15px]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[14px] font-medium text-brand-black" htmlFor="email">
                        Work Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@company.com"
                        className="w-full h-11 px-4 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[15px]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[14px] font-medium text-brand-black" htmlFor="dob">
                          Birth Date
                        </label>
                        <input
                          type="date"
                          name="dob"
                          id="dob"
                          value={form.dob}
                          onChange={handleChange}
                          className="w-full h-11 px-4 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all text-[15px]"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[14px] font-medium text-brand-black" htmlFor="phone">
                          Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          className="w-full h-11 px-4 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[15px]"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleContinue}
                      className="w-full h-12 bg-brand-black text-white rounded-full font-semibold text-[16px] hover:bg-brand-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-brand-black mt-4"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Section B: Security Details */}
                {regSection === 'B' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="block text-[14px] font-medium text-brand-black" htmlFor="invitationCode">
                        Invitation Code
                      </label>
                      <input
                        type="text"
                        name="invitationCode"
                        id="invitationCode"
                        value={form.invitationCode}
                        onChange={handleChange}
                        placeholder="Enter 8-digit code"
                        className="w-full h-11 px-4 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[15px]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[14px] font-medium text-brand-black" htmlFor="pass">
                        Password
                      </label>
                      <input
                        type="password"
                        name="pass"
                        id="pass"
                        value={form.pass}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full h-11 px-4 rounded-full border border-brand-grey-slate bg-brand-surface text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-lime focus:border-transparent transition-all placeholder:text-brand-grey-muted/50 text-[15px]"
                        required
                      />
                      
                      {form.pass && (
                        <div className="space-y-1 mt-1.5">
                          <div className="h-1.5 w-full bg-brand-grey-light rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getStrengthColor()} transition-all duration-300`}
                              style={{ width: `${(strength / 4) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-[11px] text-brand-grey-muted">
                            Password strength: {strength <= 1 ? 'Weak' : strength <= 3 ? 'Moderate' : 'Strong'}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-brand-black text-white rounded-full font-semibold text-[16px] hover:bg-brand-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-brand-black disabled:bg-brand-grey-light disabled:cursor-not-allowed mt-4"
                    >
                      {loading ? 'Submitting...' : 'Register'}
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-center text-[14px] font-medium text-brand-black">
                    Enter the 6-Digit OTP Code
                  </label>
                  
                  <div className="flex justify-between gap-2">
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={6}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-12 text-center text-[20px] font-bold border border-brand-grey-slate rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-lime bg-brand-surface text-brand-black"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-12 bg-brand-black text-white rounded-full font-semibold text-[16px] hover:bg-brand-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-brand-black disabled:bg-brand-grey-light disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Setup Profile'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-[14px] font-bold text-brand-lime-olive hover:underline"
                  >
                    Resend OTP Code
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-brand-grey-muted text-[14px]">
                Already have an account?{' '}
                <a href="/signin" className="text-brand-lime-olive font-bold hover:underline">
                  Log in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
