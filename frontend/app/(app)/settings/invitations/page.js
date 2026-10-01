'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { Key, ArrowLeft, X, Loader2, Plus, Mail, Send, CheckSquare, Square, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvitationCodes() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table Batch Selection State
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [batchSending, setBatchSending] = useState(false);
  const [batchNotification, setBatchNotification] = useState('');

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [availableCandidates, setAvailableCandidates] = useState([]);

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
      setInvitations(data || []);

      // Also fetch employee list for candidate email suggestions
      try {
        const emps = await request('/employees', { method: 'GET' }, session);
        const emails = (emps || [])
          .map((e) => e.personal?.email)
          .filter((em) => Boolean(em) && em.includes('@'));
        setAvailableCandidates(Array.from(new Set(emails)));
      } catch {
        // Fallback if employee list inaccessible
      }
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

  // Multi-Email selection helpers in Modal
  const handleAddEmail = (raw) => {
    const list = raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@'));
    
    const updated = Array.from(new Set([...selectedEmails, ...list]));
    setSelectedEmails(updated);
    setEmailInput('');
  };

  const handleToggleCandidateEmail = (email) => {
    const normalized = email.toLowerCase();
    if (selectedEmails.includes(normalized)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== normalized));
    } else {
      setSelectedEmails([...selectedEmails, normalized]);
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    setSelectedEmails(selectedEmails.filter((e) => e !== emailToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      // Include any lingering input in emailInput
      let finalEmails = [...selectedEmails];
      if (emailInput.trim()) {
        const extra = emailInput
          .split(/[,;\s]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0 && e.includes('@'));
        finalEmails = Array.from(new Set([...finalEmails, ...extra]));
      }

      const payload = {
        jobTitle: form.jobTitle,
        department: form.department,
        managerId: form.managerId,
        salary: parseFloat(form.salary),
        joiningDate: form.joiningDate,
        emails: finalEmails.length > 0 ? finalEmails : undefined,
      };

      const result = await request('/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, session);

      const sentCount = result.emailsSent || 0;
      const count = result.count || 1;
      const msg = sentCount > 0
        ? `Successfully created ${count} code(s) and dispatched invitation emails to ${sentCount} candidate(s)!`
        : `Code generated successfully: ${result.code || result.codes?.join(', ')}`;

      setFormSuccess(msg);
      setForm({
        jobTitle: '',
        department: '',
        managerId: '',
        salary: '',
        joiningDate: '',
      });
      setSelectedEmails([]);
      setEmailInput('');
      fetchInvitations();
    } catch (err) {
      setFormError(err.message || 'Failed to generate invitation code');
    } finally {
      setFormLoading(false);
    }
  };

  // Table Bulk Selection handlers
  const handleToggleCode = (code) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter((c) => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCodes.length === invitations.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(invitations.map((i) => i.code));
    }
  };

  const handleSendSelected = async () => {
    if (selectedCodes.length === 0) return;
    setBatchSending(true);
    setBatchNotification('');
    try {
      const res = await request('/invitations/resend', {
        method: 'POST',
        body: JSON.stringify({ codes: selectedCodes }),
      }, session);

      setBatchNotification(
        `Successfully sent invitation emails to ${res.sentCount} selected candidate(s)!`
      );
      setSelectedCodes([]);
    } catch (err) {
      setBatchNotification(`Failed to send emails: ${err.message}`);
    } finally {
      setBatchSending(false);
      setTimeout(() => setBatchNotification(''), 7000);
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
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Page Header */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Invitation Codes</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Generate and dispatch invitation codes directly to selected candidate emails.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => router.back()}
            className="h-9 px-4 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-[8px] font-medium text-[13px] hover:bg-[var(--border-color)]/40 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          {/* Bulk Send to Selected */}
          {selectedCodes.length > 0 && (
            <button
              onClick={handleSendSelected}
              disabled={batchSending}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] font-semibold text-[13px] transition-all flex items-center gap-1.5 shadow-sm animate-in fade-in zoom-in-95 duration-200"
            >
              {batchSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Send Email to Selected ({selectedCodes.length})
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setSelectedEmails([]);
              setEmailInput('');
              setShowModal(true);
            }}
            className="h-9 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-[13px] transition-all flex items-center gap-1.5"
            id="generate-code-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Generate & Send Codes
          </button>
        </div>
      </div>

      {batchNotification && (
        <div className="p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-[8px] flex items-center justify-between shadow-sm">
          <span className="font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600" />
            {batchNotification}
          </span>
          <button onClick={() => setBatchNotification('')} className="text-emerald-700 font-bold hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Codes Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--background)]/50 text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">
                  <button 
                    onClick={handleSelectAll} 
                    className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
                    title={selectedCodes.length === invitations.length ? "Deselect All" : "Select All"}
                  >
                    {selectedCodes.length > 0 && selectedCodes.length === invitations.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-5">
                  <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Code</span>
                </th>
                <th className="py-3 px-5">Job Title</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Candidate Email</th>
                <th className="py-3 px-5">Manager ID</th>
                <th className="py-3 px-5">Salary</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--foreground)] text-[13px]">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-[var(--text-muted)]">
                    No invitation codes generated yet.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const isSelected = selectedCodes.includes(inv.code);
                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-[var(--background)]/60 transition-colors ${isSelected ? 'bg-emerald-50/20' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCode(inv.code)}
                          className="w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </td>
                      <td className="py-3 px-5 font-mono font-bold text-[var(--color-accent)] tracking-wider">
                        {inv.code}
                      </td>
                      <td className="py-3 px-5 font-medium">{inv.jobTitle}</td>
                      <td className="py-3 px-5 text-[var(--text-muted)]">{inv.department}</td>
                      <td className="py-3 px-5">
                        {inv.email ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 bg-emerald-100/70 border border-emerald-300/80 px-2.5 py-1 rounded-[6px] text-[12px] font-mono select-all">
                            <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            {inv.email}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[11px] italic font-normal">No email assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs text-[var(--text-muted)]">{inv.managerId}</td>
                      <td className="py-3 px-5 font-semibold">${inv.salary.toLocaleString()}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider ${
                          inv.used 
                            ? 'bg-[var(--border-color)]/60 text-[var(--text-muted)]' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {inv.used ? 'Used' : 'Unused'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Code Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[14px] shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)] p-1 rounded-[6px] border border-[var(--border-color)] hover:bg-[var(--background)] transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <h3 className="text-[19px] font-bold text-[var(--foreground)] mb-1 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Generate & Dispatch Invitations
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] mb-4">
                Assign candidate emails to auto-send selection notices and onboarding codes.
              </p>

              {formError && (
                <div className="p-3 mb-4 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-[6px]">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-[6px] font-semibold">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Job Title</label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Department</label>
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
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Manager ID</label>
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
                </div>

                {/* Candidate Email Selection Component */}
                <div className="space-y-2 p-3.5 bg-[var(--background)]/80 border border-[var(--border-color)] rounded-[10px]">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-[var(--foreground)] uppercase tracking-wide flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" /> Candidate Emails (Multi-Select)
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedEmails.length} selected
                    </span>
                  </div>

                  {/* Quick Select Candidates */}
                  {availableCandidates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Quick Pick From Registered Candidates:</p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-[var(--card-bg)] rounded-[6px] border border-[var(--border-color)]">
                        {availableCandidates.map((candEmail) => {
                          const isChecked = selectedEmails.includes(candEmail.toLowerCase());
                          return (
                            <button
                              type="button"
                              key={candEmail}
                              onClick={() => handleToggleCandidateEmail(candEmail)}
                              className={`text-[11px] px-2 py-0.5 rounded-[4px] border transition-colors flex items-center gap-1 font-mono ${
                                isChecked
                                  ? 'bg-emerald-600 text-white border-emerald-700 font-semibold'
                                  : 'bg-[var(--background)] text-[var(--foreground)] border-[var(--border-color)] hover:border-emerald-500'
                              }`}
                            >
                              <span>{isChecked ? '✓' : '+'}</span> {candEmail}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Email Chips */}
                  {selectedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedEmails.map((em) => (
                        <span 
                          key={em} 
                          className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-900 border border-emerald-300 text-[11px] font-mono px-2 py-0.5 rounded-[4px]"
                        >
                          {em}
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(em)}
                            className="text-emerald-700 hover:text-emerald-950 font-bold ml-1"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add or Paste Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (emailInput.trim()) handleAddEmail(emailInput);
                        }
                      }}
                      placeholder="Paste or type email(s) (comma separated)..."
                      className="flex-1 h-9 px-3 rounded-[6px] border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[12px] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (emailInput.trim()) handleAddEmail(emailInput);
                      }}
                      className="h-9 px-3 bg-[var(--card-bg)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] text-[var(--foreground)] rounded-[6px] text-xs font-semibold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] italic">
                    Tip: Enter multiple emails separated by commas or spaces. A unique code will be dispatched to each candidate automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Annual Salary ($)</label>
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
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Joining Date</label>
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
                  className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-3 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Invitations...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> 
                      {selectedEmails.length > 1 
                        ? `Generate & Send to All ${selectedEmails.length} Candidates` 
                        : 'Generate & Save Invitation'}
                    </>
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
