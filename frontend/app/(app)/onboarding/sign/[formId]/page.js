'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../../lib/apiClient';
import { Edit3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ComplianceFormSigning({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingName, setSigningName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request(`/employees/${session.user.employeeId}`, { method: 'GET' }, session);
      setEmployee(data);
    } catch (err) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.employeeId) {
      fetchEmployee();
    }
  }, [session, fetchEmployee]);

  const targetForm = employee?.complianceForms?.find((f) => f.id === params.formId);

  const handleSign = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!signingName.trim()) {
      setActionError('Please type your name to sign');
      return;
    }
    setActionLoading(true);
    try {
      await request(`/employees/${employee.id}/sign-form/${params.formId}`, {
        method: 'POST',
        body: JSON.stringify({ signedBy: signingName }),
      }, session);
      router.push('/onboarding');
    } catch (err) {
      setActionError(err.message || 'Failed to sign the form');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--text-muted)] text-[14px]">Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[8px] max-w-xl mx-auto mt-10">
        {error}
      </div>
    );
  }

  if (!targetForm) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] mt-10">
        Compliance form not found.
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="max-w-md mx-auto bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] p-6 md:p-8 space-y-6 shadow-sm"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Sign {targetForm.type}</h2>
        <button 
          onClick={() => router.back()} 
          className="h-8 px-3 rounded-[8px] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-xs font-semibold flex items-center gap-1"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2 text-[13px] bg-[var(--background)] p-4 border border-[var(--border-color)] rounded-[8px]">
        <p className="font-semibold text-[14px] mb-2 text-[var(--foreground)] border-b border-[var(--border-color)] pb-1.5" style={{ fontFamily: 'var(--font-display)' }}>Form Data Preview</p>
        {Object.entries(targetForm.data || {}).map(([key, val]) => (
          <p key={key} className="capitalize flex justify-between gap-2">
            <span className="font-semibold text-[var(--text-muted)]">{key.replace(/([A-Z])/g, ' $1')}:</span> 
            <span className="font-medium text-[var(--foreground)]">{String(val)}</span>
          </p>
        ))}
      </div>

      <form onSubmit={handleSign} className="space-y-4">
        {actionError && (
          <div className="p-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-[6px]">
            {actionError}
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-[var(--foreground)]">Type your full name to E-Sign</label>
          <input
            type="text"
            value={signingName}
            onChange={(e) => setSigningName(e.target.value)}
            placeholder="John Doe"
            className="w-full h-10 px-3 rounded-[8px] border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-[14px]"
            required
            id="signing-name-input"
          />
        </div>

        <button
          type="submit"
          disabled={actionLoading}
          className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Signing...
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" /> Complete Signature
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
