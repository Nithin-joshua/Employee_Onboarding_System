'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { ArrowLeft, UploadCloud, FileCheck2, Loader2, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MANDATORY_DOC_TYPES = ['AADHAAR', 'PAN', 'EDUCATION_10TH', 'EDUCATION_2ND_PUC', 'EDUCATION_DEGREE', 'BANK_PROOF', 'PHOTO'];
const OPTIONAL_DOC_TYPES = ['RELIEVING_LETTER'];
const ALL_DOC_TYPES = [...MANDATORY_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

const DOC_LABELS = {
  AADHAAR: 'Aadhaar Card',
  PAN: 'PAN Card',
  EDUCATION_10TH: '10th Marks Card',
  EDUCATION_2ND_PUC: '2nd PUC Marks Card',
  EDUCATION_DEGREE: 'Degree Certificate (6 sem marks card or PDC)',
  RELIEVING_LETTER: 'Relieving Letter (Optional)',
  BANK_PROOF: 'Bank Proof (Cancel Cheque / Passbook)',
  PHOTO: 'Passport Size Photo'
};

export default function DocumentUploads() {
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({});
  const [actionError, setActionError] = useState('');

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const empData = await request(`/employees/${session.user.employeeId}`, { method: 'GET' }, session);
      const docsData = await request(`/employees/${session.user.employeeId}/documents`, { method: 'GET' }, session);
      setEmployee(empData);
      setDocuments(docsData || []);
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

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
          docs: documents.map((d) => ({ type: d.type })),
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

  const uploadedCount = documents.filter(
    (d) => MANDATORY_DOC_TYPES.includes(d.type) && (d.status === 'SUBMITTED' || d.status === 'VERIFIED' || d.status === 'EXTRACTED')
  ).length || 0;

  return (
    <>
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
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{uploadedCount} of {MANDATORY_DOC_TYPES.length} mandatory categories completed</p>
        </div>
        <div className="text-[16px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3.5 py-1 rounded-[6px] border border-[var(--color-accent)]/20">
          {Math.round((uploadedCount / MANDATORY_DOC_TYPES.length) * 100)}%
        </div>
      </div>

      <div className="space-y-3">
        {ALL_DOC_TYPES.map((type) => {
          const matchedDoc = documents.find((d) => d.type === type);
          const hasUploaded = matchedDoc && (matchedDoc.status === 'SUBMITTED' || matchedDoc.status === 'VERIFIED' || matchedDoc.status === 'EXTRACTED');

          return (
            <div key={type} className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[var(--color-accent)]/30 transition-all card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="space-y-1">
                <p className="font-semibold text-[15px] tracking-tight text-[var(--foreground)]">
                  {DOC_LABELS[type] || type.replace(/_/g, ' ')}
                </p>
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

              <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
                {hasUploaded && (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(matchedDoc)}
                    className="h-9 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] text-xs font-semibold hover:bg-[var(--border-color)]/40 transition-all bg-[var(--card-bg)]"
                  >
                    Preview
                  </button>
                )}
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

      {uploadedCount === MANDATORY_DOC_TYPES.length && (
        <button
          onClick={handleSubmitAll}
          className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          <FileCheck2 className="w-4 h-4" /> Submit Documents For Review
        </button>
      )}
    </motion.div>

    {/* Document Preview Modal */}
    <AnimatePresence>
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewDoc(null)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          {/* Modal Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[16px] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] z-10 text-left"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-4">
              <div>
                <h3 className="text-[18px] font-bold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {previewDoc.type.replace(/_/g, ' ')}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Document Details & Preview</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="h-7 w-7 rounded-full flex items-center justify-center border border-[var(--border-color)] hover:bg-[var(--border-color)]/40 transition-colors text-[var(--text-muted)] hover:text-[var(--foreground)] text-[12px] font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Actual File Preview */}
              {previewDoc.signedUrl ? (
                <div className="border border-[var(--border-color)] rounded-[12px] overflow-hidden bg-neutral-900 flex items-center justify-center min-h-[300px]">
                  {previewDoc.storagePath?.endsWith('.pdf') ? (
                    <iframe
                      src={`${previewDoc.signedUrl}#toolbar=0`}
                      className="w-full h-[400px] border-none"
                      title="Document Preview"
                    />
                  ) : (
                    <img
                      src={previewDoc.signedUrl}
                      alt="Uploaded Document"
                      className="w-full max-h-[400px] object-contain"
                    />
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-[var(--text-muted)] italic text-center py-4">No file preview available</p>
              )}

              {/* Visual Card Preview */}
              {renderMockCard(previewDoc)}

              {/* Status Badge */}
              <div className="flex justify-between items-center bg-[var(--background)] p-3 rounded-[8px] border border-[var(--border-color)] text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Verification Status</span>
                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold border ${getStatusBadge(previewDoc.status)}`}>
                  {previewDoc.status}
                </span>
              </div>

              {/* Extracted Details */}
              {previewDoc.extracted && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wider">Extracted Data (OCR)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(previewDoc.extracted).map(([key, value]) => {
                      if (key === 'confidence') return null;
                      if (typeof value === 'object' && value !== null) {
                        return Object.entries(value).map(([subKey, subValue]) => {
                          if (typeof subValue === 'object') return null;
                          const friendlyKey = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          return (
                            <div key={subKey} className="px-3.5 py-2 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex justify-between items-center text-[13px]">
                              <span className="font-semibold text-[var(--text-muted)]">{friendlyKey}</span>
                              <span className={`font-bold ${subValue === null ? 'text-[var(--text-faint)] italic font-normal' : 'text-[var(--foreground)]'}`}>
                                {subValue === null ? 'N/A' : String(subValue)}
                              </span>
                            </div>
                          );
                        });
                      }
                      const friendlyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="px-3.5 py-2 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex justify-between items-center text-[13px]">
                          <span className="font-semibold text-[var(--text-muted)]">{friendlyKey}</span>
                          <span className={`font-bold ${value === null ? 'text-[var(--text-faint)] italic font-normal' : 'text-[var(--foreground)]'}`}>
                            {value === null ? 'N/A' : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extraction Confidence bar */}
              {previewDoc.extracted?.confidence !== undefined && (
                <div className="p-3 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 rounded-[10px] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--text-muted)]">Extraction Confidence</span>
                    <span className="text-[var(--color-accent)] font-bold">{(previewDoc.extracted.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" 
                      style={{ width: `${(previewDoc.extracted.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rejection Message */}
              {previewDoc.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-[8px] text-xs text-red-600 font-medium">
                  <p className="font-bold mb-0.5">Reason for Rejection:</p>
                  <p>{previewDoc.rejectionReason}</p>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}

const renderMockCard = (doc) => {
  if (!doc) return null;
  const fields = doc.extracted?.fields || doc.extracted || {};
  
  if (doc.type === 'AADHAAR') {
    return (
      <div className="relative overflow-hidden rounded-[12px] border border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/50 p-4.5 shadow-[0_4px_16px_rgba(249,115,22,0.06)] flex gap-4 text-neutral-800 border-t-4 border-t-orange-500 select-none text-left">
        <div className="w-18 h-22 bg-neutral-100 border border-neutral-200 rounded-[6px] flex items-center justify-center shrink-0 self-center shadow-inner">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="border-b border-orange-100 pb-1 flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold text-orange-700 tracking-wider uppercase leading-none">Unique Identification Authority of India</p>
              <p className="text-[8px] text-neutral-400 mt-0.5 leading-none">Government of India</p>
            </div>
            <div className="w-4 h-4 rounded-full border border-blue-600/40 flex items-center justify-center text-[7px] text-blue-600 font-bold shrink-0">⚙</div>
          </div>
          <div className="text-[11px] space-y-1">
            <p className="leading-tight"><span className="font-medium text-neutral-400 text-[10px]">Name:</span> <span className="font-bold text-neutral-800">{fields.name || 'N/A'}</span></p>
            <p className="leading-tight"><span className="font-medium text-neutral-400 text-[10px]">DOB:</span> <span className="font-semibold text-neutral-800">{fields.dob || 'N/A'}</span></p>
          </div>
          <div className="pt-2 border-t border-dashed border-orange-100 flex justify-between items-center">
            <p className="text-[13px] font-mono font-bold tracking-widest text-neutral-900 leading-none">
              {fields.aadhaarNumber || 'XXXX-XXXX-XXXX'}
            </p>
            <span className="text-[8px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-bold border border-emerald-100">Aadhaar</span>
          </div>
        </div>
      </div>
    );
  }

  if (doc.type === 'PAN') {
    return (
      <div className="relative overflow-hidden rounded-[12px] border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 p-4.5 shadow-[0_4px_16px_rgba(14,165,233,0.06)] flex gap-4 text-neutral-800 border-t-4 border-t-sky-500 select-none text-left">
        <div className="w-18 h-22 bg-neutral-100 border border-neutral-200 rounded-[6px] flex items-center justify-center shrink-0 self-center shadow-inner">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="border-b border-sky-100 pb-1 flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold text-sky-700 tracking-wider uppercase leading-none">INCOME TAX DEPARTMENT</p>
              <p className="text-[8px] text-neutral-400 mt-0.5 leading-none">GOVERNMENT OF INDIA</p>
            </div>
            <div className="w-4 h-4 rounded bg-gradient-to-tr from-amber-400 via-sky-400 to-emerald-400 shadow-sm shrink-0" />
          </div>
          <div className="text-[11px] space-y-1">
            <p className="leading-tight"><span className="font-medium text-neutral-400 text-[10px]">Name:</span> <span className="font-bold text-neutral-800">{fields.name || 'N/A'}</span></p>
            <p className="leading-tight"><span className="font-medium text-neutral-400 text-[10px]">Permanent Account Number:</span></p>
            <p className="text-[14px] font-mono font-bold tracking-wider text-neutral-900 leading-none">
              {fields.panNumber || 'XXXXXXXXXX'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[var(--border-color)] bg-[var(--background)] p-4 flex items-center gap-3 select-none text-left">
      <div className="w-9 h-9 rounded-[8px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shadow-inner">
        <FileText className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-[13px] font-bold text-[var(--foreground)]">{doc.type.replace(/_/g, ' ')}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Physical document archive verified</p>
      </div>
    </div>
  );
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'VERIFIED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-100';
    case 'SUBMITTED':
    case 'EXTRACTED':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    default:
      return 'bg-neutral-50 text-neutral-600 border-neutral-100';
  }
};
