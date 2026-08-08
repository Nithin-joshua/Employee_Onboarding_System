'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { ArrowLeft, UploadCloud, FileCheck2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const REQUIRED_DOC_TYPES = ['AADHAAR', 'PAN', 'EDUCATION', 'RELIEVING_LETTER', 'BANK_PROOF', 'PHOTO'];

export default function DocumentUploads() {
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({});
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

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [type]: true }));
    setActionError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', type);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
      const res = await fetch(`${baseUrl}/employees/${employee.id}/documents/${type}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.message || 'Upload failed');
      }

      await fetchEmployee();
    } catch (err) {
      setActionError(err.message || 'Upload failed');
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmitAll = async () => {
    setLoading(true);
    setActionError('');
    try {
      await request(`/employees/${employee.id}/submit-documents`, {
        method: 'POST',
        body: JSON.stringify({
          docs: REQUIRED_DOC_TYPES.map((type) => ({ type })),
        }),
      }, session);
      router.push('/onboarding');
    } catch (err) {
      setActionError(err.message || 'Submission failed');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--text-muted)] text-[14px]">Loading uploads...</p>
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

  const uploadedCount = employee?.documents?.filter(
    (d) => d.status === 'SUBMITTED' || d.status === 'VERIFIED'
  ).length || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Document Submission</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Please upload a valid document for each required category</p>
        </div>
        <button 
          onClick={() => router.back()} 
          className="h-9 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/40 transition-all text-xs font-semibold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {actionError && (
        <div className="p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-[8px]">
          {actionError}
        </div>
      )}

      {/* Upload Progress Overview */}
      <div className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] flex justify-between items-center shadow-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h3 className="font-semibold text-[15px]" style={{ fontFamily: 'var(--font-display)' }}>Upload Status</h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{uploadedCount} of {REQUIRED_DOC_TYPES.length} categories completed</p>
        </div>
        <div className="text-[16px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3.5 py-1 rounded-[6px] border border-[var(--color-accent)]/20">
          {Math.round((uploadedCount / REQUIRED_DOC_TYPES.length) * 100)}%
        </div>
      </div>

      <div className="space-y-3">
        {REQUIRED_DOC_TYPES.map((type) => {
          const matchedDoc = employee?.documents?.find((d) => d.type === type);
          const hasUploaded = matchedDoc && (matchedDoc.status === 'SUBMITTED' || matchedDoc.status === 'VERIFIED');

          return (
            <div key={type} className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[var(--color-accent)]/30 transition-all card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="space-y-1">
                <p className="font-semibold text-[15px] tracking-tight text-[var(--foreground)]">{type.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)]">Status:</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${
                    hasUploaded 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-[var(--border-color)]/60 text-[var(--text-muted)] border-transparent'
                  }`}>
                    {matchedDoc?.status || 'NOT STARTED'}
                  </span>
                </div>
                {matchedDoc?.rejectionReason && (
                  <p className="text-[12px] text-red-500 font-medium bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-[6px] mt-2">
                    Reason: {matchedDoc.rejectionReason}
                  </p>
                )}
              </div>

              <div className="w-full sm:w-auto shrink-0">
                <input
                  type="file"
                  id={`file-input-${type}`}
                  onChange={(e) => handleFileUpload(e, type)}
                  className="hidden"
                  accept="application/pdf,image/*"
                />
                <label
                  htmlFor={`file-input-${type}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center cursor-pointer h-9 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--color-accent)] hover:text-white hover:border-transparent transition-all text-xs font-semibold gap-1.5 bg-[var(--card-bg)]"
                >
                  {uploading[type] ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </>
                  ) : hasUploaded ? (
                    'Replace File'
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" /> Upload File
                    </>
                  )}
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {uploadedCount === REQUIRED_DOC_TYPES.length && (
        <button
          onClick={handleSubmitAll}
          className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          <FileCheck2 className="w-4 h-4" /> Submit Documents For Review
        </button>
      )}
    </motion.div>
  );
}
