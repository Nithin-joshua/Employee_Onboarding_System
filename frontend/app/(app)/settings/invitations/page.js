'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { Key, ArrowLeft, X, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvitationCodes() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [form, setForm] = useState({
    jobTitle: '',
    department: '',
    managerId: '',
    salary: '',
    joiningDate: '',
  });

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request('/invitations', { method: 'GET' }, session);
      setInvitations(data);
    } catch (err) {
      setError(err.message || 'Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.role === 'HR') {
      fetchInvitations();
    } else if (session) {
      setError('Access Denied: Only HR can view invitation codes.');
      setLoading(false);
    }
  }, [session, fetchInvitations]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        jobTitle: form.jobTitle,
        department: form.department,
        managerId: form.managerId,
        salary: parseFloat(form.salary),
        joiningDate: form.joiningDate,
      };

      const result = await request('/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, session);

      setFormSuccess(`Code generated successfully: ${result.code}`);
      setForm({
        jobTitle: '',
        department: '',
        managerId: '',
        salary: '',
        joiningDate: '',
      });
      fetchInvitations();
    } catch (err) {
      setFormError(err.message || 'Failed to generate invitation code');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--text-muted)] text-[14px] animate-pulse">Loading invitations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[8px] max-w-xl mx-auto mt-10">
        <p className="font-bold">Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Invitation Codes</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Generate and manage codes for candidates to register themselves.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="h-9 px-4 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-[8px] font-medium text-[13px] hover:bg-[var(--border-color)]/40 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <button
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setShowModal(true);
            }}
            className="h-9 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-[13px] transition-all flex items-center gap-1.5"
            id="generate-code-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Code
          </button>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-5">
                <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Code</span>
              </th>
              <th className="py-3 px-5">Job Title</th>
              <th className="py-3 px-5">Department</th>
              <th className="py-3 px-5 hidden md:table-cell">Manager ID</th>
              <th className="py-3 px-5">Salary</th>
              <th className="py-3 px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] text-[var(--foreground)] text-[13px]">
            {invitations.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-10 text-center text-[var(--text-muted)]">
                  No invitation codes generated yet.
                </td>
              </tr>
            ) : (
              invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--background)]/60 transition-colors">
                  <td className="py-3 px-5 font-mono font-bold text-[var(--color-accent)] tracking-wider">{inv.code}</td>
                  <td className="py-3 px-5 font-medium">{inv.jobTitle}</td>
                  <td className="py-3 px-5">{inv.department}</td>
                  <td className="py-3 px-5 font-mono text-xs text-[var(--text-muted)] hidden md:table-cell">{inv.managerId}</td>
                  <td className="py-3 px-5 font-semibold">${inv.salary.toLocaleString()}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider ${
                      inv.used 
                        ? 'bg-[var(--border-color)]/60 text-[var(--text-muted)]' 
                        : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                    }`}>
                      {inv.used ? 'Used' : 'Unused'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Code Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-xl w-full max-w-md p-6 relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)] p-1 rounded-[6px] border border-[var(--border-color)] hover:bg-[var(--background)] transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <h3 className="text-[18px] font-semibold text-[var(--foreground)] mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Generate Invitation Code</h3>

              {formError && (
                <div className="p-3 mb-4 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-[6px]">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 mb-4 text-xs text-[var(--color-accent)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20 rounded-[6px] font-semibold">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Job Title</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={form.jobTitle}
                    onChange={handleChange}
                    placeholder="e.g. Senior Backend Engineer"
                    className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="e.g. Engineering"
                    className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Manager ID</label>
                  <input
                    type="text"
                    name="managerId"
                    value={form.managerId}
                    onChange={handleChange}
                    placeholder="e.g. mgr_123"
                    className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Annual Salary ($)</label>
                    <input
                      type="number"
                      name="salary"
                      value={form.salary}
                      onChange={handleChange}
                      placeholder="e.g. 90000"
                      className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Joining Date</label>
                    <input
                      type="date"
                      name="joiningDate"
                      value={form.joiningDate}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-1.5"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    'Generate and Save'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
