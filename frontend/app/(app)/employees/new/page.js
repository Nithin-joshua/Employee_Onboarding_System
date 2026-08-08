'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { ArrowLeft, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewEmployee() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    id: '',
    name: '',
    dob: '',
    phone: '',
    email: '',
    title: '',
    department: '',
    managerId: '',
    salary: '',
    joiningDate: '',
  });

  const [success, setSuccess] = useState(false);
  const [invitedName, setInvitedName] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        personal: {
          name: form.name,
          dob: form.dob,
          phone: form.phone,
          email: form.email,
        },
        job: {
          title: form.title,
          department: form.department,
          managerId: form.managerId,
          salary: parseFloat(form.salary),
          joiningDate: form.joiningDate,
        },
      };

      await request('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, session);

      setInvitedName(form.name);
      setInvitedEmail(form.email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] text-center space-y-6 shadow-sm"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-[20px] font-semibold text-[var(--foreground)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Invitation Sent!</h2>
          <p className="text-[var(--text-muted)] text-[13px] leading-relaxed">
            <strong className="text-[var(--foreground)]">{invitedName}</strong> has been successfully registered. A User account is active, and a temporary password has been emailed to <strong className="text-[var(--foreground)]">{invitedEmail}</strong>.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-[14px] transition-all"
        >
          Go to Dashboard
        </button>
      </motion.div>
    );
  }

  const inputClass = "w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]";
  const labelClass = "block text-[13px] font-medium text-[var(--foreground)]";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="max-w-2xl mx-auto p-6 md:p-8 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-sm space-y-6"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Invite New Employee</h2>
        <button
          onClick={() => router.back()}
          className="h-8 px-3 rounded-[8px] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-xs font-semibold flex items-center gap-1 bg-[var(--card-bg)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[6px] text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="John Doe"
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Joining Date</label>
            <input
              type="date"
              name="joiningDate"
              value={form.joiningDate}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="border-t border-[var(--border-color)] my-4"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Job Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Software Engineer"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Department</label>
            <input
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Engineering"
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Manager ID (UUID)</label>
            <input
              type="text"
              name="managerId"
              value={form.managerId}
              onChange={handleChange}
              placeholder="Manager User ID"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Salary</label>
            <input
              type="number"
              name="salary"
              value={form.salary}
              onChange={handleChange}
              placeholder="120000"
              className={inputClass}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Inviting...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> Invite Employee
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
