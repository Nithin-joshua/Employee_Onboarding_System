'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { request } from '../../../lib/apiClient';
import { FileUp, Landmark, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Onboarding() {
  const { data: session } = useSession();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchOnboardingStatus = useCallback(async () => {
    if (!session?.user?.employeeId) {
      setError('Employee profile not linked to this user account');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await request(`/employees/${session.user.employeeId}`, { method: 'GET' }, session);
      setEmployee(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchOnboardingStatus();
  }, [session, fetchOnboardingStatus]);

  const handleRunExtraction = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await request(`/employees/${employee.id}/run-extraction`, {
        method: 'POST',
      }, session);
      setEmployee(updated);
    } catch (err) {
      setActionError(err.message || 'Data extraction failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--text-muted)] text-[14px]">Loading onboarding details...</p>
      </div>
    );
  }

  if (error) return (
    <div className="p-6 space-y-4 max-w-xl mx-auto mt-10">
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[8px]">{error}</div>
      <button 
        onClick={() => signOut({ callbackUrl: '/signin' })} 
        className="w-full h-10 border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-[8px] font-semibold hover:bg-[var(--background)] transition-colors text-sm"
      >
        Sign Out
      </button>
    </div>
  );

  const statusDescriptions = {
    REGISTERED: 'Verify your OTP code to activate your boarding process.',
    INVITED: 'You have been invited to join. Please begin documentation.',
    DOCUMENTS_PENDING: 'Upload all 6 required documents for verification.',
    DOCUMENTS_SUBMITTED: 'All 6 required documents have been uploaded.',
    UNDER_REVIEW: 'Your documents are with HR for review.',
    MANAGER_REVIEW: 'Almost there — your manager is finalizing your hire.',
    COMPLIANCE_PROCESSING: 'Compliance forms are generated and pending signature.',
    PENDING_SIGNATURE: 'You need to sign the compliance forms to proceed.',
    DAY1_READY: 'You\'re hired! 🎉 Congratulations!',
    ACTIVE: 'Your profile is active.',
  };

  const uploadedCount = employee?.documents?.filter(d => d.status === 'SUBMITTED' || d.status === 'VERIFIED').length || 0;
  const percentComplete = Math.round((uploadedCount / 6) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Welcome Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Welcome, {employee?.personal?.name}</h1>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Employee ID: {employee?.id}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/signin' })}
          className="h-9 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-color)] transition-all text-xs font-semibold flex items-center gap-1.5"
          id="onboarding-signout-btn"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      {actionError && (
        <div className="p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-[8px]">
          {actionError}
        </div>
      )}

      {/* EPFO Onboarding Status Dashboard */}
      {employee?.complianceForms?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-100 rounded-2xl p-4.5 shadow-sm">
          <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-1">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">PF Onboarding</p>
            <p className={`text-[13px] font-extrabold ${
              employee.complianceForms?.every(f => f.status === 'SIGNED') ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {employee.complianceForms?.every(f => f.status === 'SIGNED') ? 'Complete' : 'Pending'}
            </p>
          </div>
          <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-1">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">UAN Status</p>
            <p className={`text-[13px] font-extrabold truncate ${
              (employee.complianceForms?.find(f => f.type === 'PF_FORM11')?.data?.uan) ? 'text-emerald-600' : 'text-neutral-500'
            }`}>
              {employee.complianceForms?.find(f => f.type === 'PF_FORM11')?.data?.uan ? `Verified (${employee.complianceForms.find(f => f.type === 'PF_FORM11').data.uan})` : 'Pending'}
            </p>
          </div>
          <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-1">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Form 11</p>
            <p className={`text-[13px] font-extrabold ${
              employee.complianceForms?.find(f => f.type === 'PF_FORM11')?.status === 'SIGNED' ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {employee.complianceForms?.find(f => f.type === 'PF_FORM11')?.status === 'SIGNED' ? 'Submitted' : 'Draft / Pending'}
            </p>
          </div>
          <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-1">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">e-Nomination</p>
            <p className={`text-[13px] font-extrabold ${
              employee.complianceForms?.find(f => f.type === 'PF_FORM2')?.status === 'SIGNED' ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {employee.complianceForms?.find(f => f.type === 'PF_FORM2')?.status === 'SIGNED' ? 'Completed' : 'Pending'}
            </p>
          </div>
          <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-1">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">KYC Verification</p>
            <p className="text-[13px] font-extrabold text-emerald-600">Verified</p>
          </div>
          <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-1">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">HR Verification</p>
            <p className="text-[13px] font-extrabold text-emerald-600">Approved</p>
          </div>
        </div>
      )}

      {/* Onboarding Stage Description */}
      <div className="bg-[var(--card-bg)] rounded-[12px] border border-[var(--border-color)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-[16px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Onboarding Status</h2>
        <div className="p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] text-sm text-[var(--foreground)]">
          <p className="font-semibold text-base text-[var(--color-accent)] uppercase tracking-wide mb-1">{employee?.status}</p>
          <p className="text-[14px] opacity-90 text-[var(--text-muted)]">{statusDescriptions[employee?.status] || 'Processing onboarding stages...'}</p>
        </div>

        {employee?.status === 'DOCUMENTS_SUBMITTED' && (
          <button
            onClick={handleRunExtraction}
            disabled={actionLoading}
            className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {actionLoading ? 'Running Extraction...' : 'Run OCR Extraction (Verify stage next)'}
          </button>
        )}
      </div>

      {/* Links to sections (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/onboarding/documents"
          className="p-6 bg-[var(--card-bg)] rounded-[12px] border border-[var(--border-color)] hover:border-[var(--color-accent)]/30 flex flex-col items-center justify-center text-center gap-3 transition-all group card-lift"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="w-10 h-10 rounded-[6px] bg-[var(--border-color)]/60 flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
            <FileUp className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-[15px] block group-hover:text-[var(--color-accent)] transition-colors" style={{ fontFamily: 'var(--font-display)' }}>Upload Documents</span>
            <span className="text-[12px] text-[var(--text-muted)] block mt-0.5">
              {uploadedCount} of 6 uploaded ({percentComplete}%)
            </span>
          </div>
          {/* Custom progress bar */}
          <div className="w-full h-1 bg-[var(--border-color)] rounded-full overflow-hidden mt-1">
            <div className="bg-[var(--color-accent)] h-full" style={{ width: `${percentComplete}%` }}></div>
          </div>
        </Link>

        <div className="p-6 bg-[var(--card-bg)] rounded-[12px] border border-[var(--border-color)] flex flex-col justify-between items-center text-center gap-4 card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-10 h-10 rounded-[6px] bg-[var(--border-color)]/60 flex items-center justify-center text-[var(--text-muted)]">
            <Landmark className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-[15px] block" style={{ fontFamily: 'var(--font-display)' }}>Compliance Forms</span>
            <span className="text-[12px] text-[var(--text-muted)] block mt-0.5">
              {employee?.complianceForms?.length || 0} forms generated
            </span>
          </div>

          {employee?.complianceForms?.length === 0 ? (
            <span className="text-[12px] text-[var(--text-muted)]">None generated yet</span>
          ) : (
            <div className="space-y-2 w-full text-xs text-left mt-1">
              {employee?.complianceForms?.map(cf => (
                <div key={cf.id} className="flex justify-between items-center bg-[var(--background)] p-3 border border-[var(--border-color)] rounded-[8px]">
                  <span className="font-semibold text-[13px] text-[var(--foreground)]">
                    {cf.type === 'PF_FORM11' ? 'Form 11 (EPF Declaration)' : 
                     cf.type === 'PF_FORM2' ? 'Form 2 / e-Nomination (EPF/EPS Nomination)' : 
                     cf.type}
                  </span>
                  {cf.status === 'PENDING_SIGNATURE' ? (
                    <Link 
                      href={`/onboarding/sign/${cf.id}`} 
                      className="inline-flex items-center text-[var(--color-accent)] hover:underline font-bold text-[13px]"
                    >
                      Sign Form <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] bg-[var(--border-color)]/60 px-2 py-0.5 rounded-[4px]">
                      {cf.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
