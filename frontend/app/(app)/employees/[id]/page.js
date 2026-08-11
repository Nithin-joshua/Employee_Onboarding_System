'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { 
  ArrowLeft, FileText, User, Briefcase, 
  FileCheck2, Clock, AlertTriangle, Loader2,
  Mail, Phone, Calendar, DollarSign, Building, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const renderMockCard = (doc) => {
  if (!doc) return null;
  const fields = doc.extracted?.fields || doc.extracted || {};
  
  if (doc.type === 'AADHAAR') {
    return (
      <div className="relative overflow-hidden rounded-[12px] border border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/50 p-4.5 shadow-[0_4px_16px_rgba(249,115,22,0.06)] flex gap-4 text-neutral-800 border-t-4 border-t-orange-500 select-none">
        {/* Photo slot */}
        <div className="w-18 h-22 bg-neutral-100 border border-neutral-200 rounded-[6px] flex items-center justify-center shrink-0 self-center shadow-inner">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        
        {/* Card info */}
        <div className="flex-1 space-y-2.5">
          <div className="border-b border-orange-100 pb-1 flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold text-orange-700 tracking-wider uppercase leading-none">Unique Identification Authority of India</p>
              <p className="text-[8px] text-neutral-400 mt-0.5 leading-none">Government of India</p>
            </div>
            {/* Ashoka Chakra indicator symbol */}
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
      <div className="relative overflow-hidden rounded-[12px] border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 p-4.5 shadow-[0_4px_16px_rgba(14,165,233,0.06)] flex gap-4 text-neutral-800 border-t-4 border-t-sky-500 select-none">
        {/* Photo slot */}
        <div className="w-18 h-22 bg-neutral-100 border border-neutral-200 rounded-[6px] flex items-center justify-center shrink-0 self-center shadow-inner">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        
        {/* Card info */}
        <div className="flex-1 space-y-2.5">
          <div className="border-b border-sky-100 pb-1 flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold text-sky-700 tracking-wider uppercase leading-none">INCOME TAX DEPARTMENT</p>
              <p className="text-[8px] text-neutral-400 mt-0.5 leading-none">GOVERNMENT OF INDIA</p>
            </div>
            {/* Hologram symbol */}
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
    <div className="rounded-[12px] border border-[var(--border-color)] bg-[var(--background)] p-4 flex items-center gap-3 select-none">
      <div className="w-9 h-9 rounded-[8px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shadow-inner">
        <FileText className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-[13px] font-bold text-[var(--foreground)]">{DOC_LABELS[doc.type] || doc.type.replace(/_/g, ' ')}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Physical document archive verified</p>
      </div>
    </div>
  );
};

export default function EmployeeDetail({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState({});
  const [actionMessage, setActionMessage] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [f11Data, setF11Data] = useState({});
  const [f2Data, setF2Data] = useState({});

  useEffect(() => {
    if (employee?.complianceForms) {
      const f11 = employee.complianceForms.find(f => f.type === 'PF_FORM11');
      if (f11) setF11Data(f11.data || {});
      const f2 = employee.complianceForms.find(f => f.type === 'PF_FORM2');
      if (f2) setF2Data(f2.data || {});
    }
  }, [employee]);

  const handleSaveForm = async (formType, data) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const form = employee.complianceForms.find(f => f.type === formType);
      if (!form) throw new Error(`${formType} compliance form not found`);
      await request(`/employees/${params.id}/compliance-forms/${form.id}/update`, {
        method: 'POST',
        body: JSON.stringify(data),
      }, session);
      setActionMessage({ text: `Successfully updated ${formType === 'PF_FORM11' ? 'Form 11' : 'Form 2 / e-Nomination'} details`, type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to update details', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request(`/employees/${params.id}`, { method: 'GET' }, session);
      const curatedDocs = await request(`/employees/${params.id}/documents/review`, { method: 'GET' }, session);
      setEmployee({ ...data, documents: curatedDocs });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [params.id, session]);

  useEffect(() => {
    if (!session || !params.id) return;
    fetchEmployee();
  }, [session, params.id, fetchEmployee]);

  const handleApproveReview = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await request(`/employees/${params.id}/approve-review`, {
        method: 'POST',
      }, session);
      setActionMessage({ text: 'Approved to Manager Review phase', type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to approve review', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDoc = async (docId) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await request(`/employees/${params.id}/verify-document`, {
        method: 'POST',
        body: JSON.stringify({ docId }),
      }, session);
      setActionMessage({ text: 'Document verified successfully', type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to verify document', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDoc = async (docId) => {
    const reason = rejectionReason[docId];
    setActionMessage(null);
    if (!reason) {
      setActionMessage({ text: 'Please enter a rejection reason first.', type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      await request(`/employees/${params.id}/reject-document`, {
        method: 'POST',
        body: JSON.stringify({ docId, reason }),
      }, session);
      setActionMessage({ text: 'Document rejected successfully', type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to reject document', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMilestone = async (milestoneType) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await request(`/employees/${params.id}/complete-milestone`, {
        method: 'POST',
        body: JSON.stringify({ type: milestoneType }),
      }, session);
      setActionMessage({ text: 'Milestone completed successfully', type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to complete milestone', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const [managerRejectReason, setManagerRejectReason] = useState('');

  const handleApproveHire = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await request(`/employees/${params.id}/approve-hire`, { method: 'POST' }, session);
      setActionMessage({ text: 'Hiring successfully approved! Email confirmation sent.', type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to approve hire', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectHire = async () => {
    setActionMessage(null);
    if (!managerRejectReason.trim()) {
      setActionMessage({ text: 'Please specify a rejection reason', type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      await request(`/employees/${params.id}/reject-hire`, {
        method: 'POST',
        body: JSON.stringify({ reason: managerRejectReason }),
      }, session);
      setActionMessage({ text: 'Hiring rejected back to HR review stage', type: 'success' });
      fetchEmployee();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to reject hire', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--text-muted)] text-[14px]">Loading details...</p>
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

  if (!employee) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] mt-10">
        Employee profile not found.
      </div>
    );
  }

  const isHR = session?.user?.role === 'HR';
  const isManager = session?.user?.role === 'MANAGER';

  const getStatusBadge = (status) => {
    const map = {
      ACTIVE:                 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      DAY1_READY:             'bg-emerald-50 text-emerald-700 border border-emerald-100',
      UNDER_REVIEW:           'bg-indigo-50 text-indigo-700 border border-indigo-100',
      MANAGER_REVIEW:         'bg-violet-50 text-violet-700 border border-violet-100',
      DOCUMENTS_PENDING:      'bg-amber-50 text-amber-700 border border-amber-100',
      DOCUMENTS_SUBMITTED:    'bg-sky-50 text-sky-700 border border-sky-100',
      PENDING_SIGNATURE:      'bg-amber-50 text-amber-700 border border-amber-100',
      COMPLIANCE_PROCESSING:  'bg-sky-50 text-sky-700 border border-sky-100',
      REJECTED:               'bg-red-50 text-red-700 border border-red-100',
    };
    return map[status] || 'bg-[var(--border-color)]/60 text-[var(--text-muted)] border border-transparent';
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="space-y-6 max-w-5xl mx-auto"
      >
      {/* Profile Hero Header */}
      <div className="relative overflow-hidden rounded-[16px] border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--color-accent)]/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center gap-4.5 relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[var(--color-accent)] to-[#4cd995] text-white font-bold text-[20px] flex items-center justify-center shadow-md select-none" style={{ fontFamily: 'var(--font-display)' }}>
            {employee.personal?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--foreground)] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
              {employee.personal?.name}
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5">
              <span>{employee.job?.title}</span>
              <span className="w-1 h-1 bg-[var(--border-color)] rounded-full" />
              <span>{employee.job?.department}</span>
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(employee.status)}`}>
                {employee.status.replace(/_/g, ' ')}
              </span>
              {employee.lastRejectionReason && (
                <span className="text-red-600 bg-red-50 border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" /> Rejection Reason: {employee.lastRejectionReason}
                </span>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.back()} 
          className="h-9 px-4 rounded-[10px] border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/30 hover:border-[var(--border-hover)] transition-all text-xs font-semibold flex items-center gap-1.5 bg-[var(--card-bg)] shadow-sm relative z-10 shrink-0 self-start md:self-center"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-muted)]" /> Back
        </button>
      </div>

      <AnimatePresence>
        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3.5 rounded-[8px] border text-xs flex justify-between items-center ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-red-50 border-red-100 text-red-600'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button 
              onClick={() => setActionMessage(null)} 
              className="font-bold hover:opacity-80 text-[10px] ml-3 uppercase text-[var(--color-accent)]"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EPFO Onboarding Status Dashboard */}
      {employee.complianceForms?.length > 0 && (
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
            <p className={`text-[13px] font-extrabold ${
              ['UNDER_REVIEW', 'MANAGER_REVIEW', 'COMPLIANCE_PROCESSING', 'PENDING_SIGNATURE', 'DAY1_READY', 'ACTIVE'].includes(employee.status) ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {['UNDER_REVIEW', 'MANAGER_REVIEW', 'COMPLIANCE_PROCESSING', 'PENDING_SIGNATURE', 'DAY1_READY', 'ACTIVE'].includes(employee.status) ? 'Approved' : 'Pending'}
            </p>
          </div>
        </div>
      )}

      {/* 1. Manager Approval Panel */}
      {isManager && (employee.status === 'MANAGER_REVIEW' || employee.status === 'UNDER_REVIEW') && (
        <div className="p-5 border border-[var(--color-accent)] bg-[var(--color-accent-soft)] rounded-[12px] space-y-3.5">
          <h3 className="font-semibold text-[var(--color-accent)] text-[16px]" style={{ fontFamily: 'var(--font-display)' }}>Manager Final Approval Gate</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            As the assigned Manager, please review the compliance details below and sign off on this hire.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApproveHire}
              disabled={actionLoading}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 h-9 rounded-[8px] text-xs font-bold transition-all disabled:opacity-50"
            >
              Approve Hire & Finalize
            </button>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Reason for rejection"
                value={managerRejectReason}
                onChange={(e) => setManagerRejectReason(e.target.value)}
                className="border border-[var(--border-color)] px-3 h-9 rounded-[8px] text-xs flex-1 bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
              />
              <button
                onClick={handleRejectHire}
                disabled={actionLoading}
                className="border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/40 px-4 h-9 rounded-[8px] text-xs font-bold transition-all disabled:opacity-50 bg-[var(--card-bg)]"
              >
                Reject Hire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Personal Details + Job Details cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="p-5.5 bg-white/90 backdrop-blur-sm border border-emerald-100/60 rounded-[16px] shadow-sm shadow-emerald-500/5 relative overflow-hidden">
          <h2 className="text-[15px] font-bold mb-4 border-b border-emerald-100/60 pb-3 flex items-center gap-2 text-neutral-800" style={{ fontFamily: 'var(--font-display)' }}>
            <div className="p-1 rounded-[6px] bg-emerald-50 text-emerald-600 border border-emerald-100/40">
              <User className="w-4 h-4" />
            </div>
            Personal Details
          </h2>
          <div className="space-y-3.5 text-[13px]">
            <div className="flex justify-between items-center py-0.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Email
              </span>
              <span className="font-semibold text-[var(--foreground)]">{employee.personal?.email}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-emerald-100/40 pt-2.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Phone
              </span>
              <span className="font-semibold text-[var(--foreground)]">{employee.personal?.phone}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-emerald-100/40 pt-2.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Date of Birth
              </span>
              <span className="font-semibold text-[var(--foreground)]">{employee.personal?.dob}</span>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-5.5 bg-white/90 backdrop-blur-sm border border-emerald-100/60 rounded-[16px] shadow-sm shadow-emerald-500/5 relative overflow-hidden">
          <h2 className="text-[15px] font-bold mb-4 border-b border-emerald-100/60 pb-3 flex items-center gap-2 text-neutral-800" style={{ fontFamily: 'var(--font-display)' }}>
            <div className="p-1 rounded-[6px] bg-emerald-50 text-emerald-600 border border-emerald-100/40">
              <Briefcase className="w-4 h-4" />
            </div>
            Job Details
          </h2>
          <div className="space-y-3.5 text-[13px]">
            <div className="flex justify-between items-center py-0.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Job Title
              </span>
              <span className="font-bold text-[var(--foreground)]">{employee.job?.title}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-emerald-100/40 pt-2.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Department
              </span>
              <span className="font-semibold text-[var(--foreground)]">{employee.job?.department}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-emerald-100/40 pt-2.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Manager ID
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">{employee.job?.managerId}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-emerald-100/40 pt-2.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Annual Salary
              </span>
              <span className="font-bold text-[var(--color-accent)]">{employee.job?.salary?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-emerald-100/40 pt-2.5">
              <span className="font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-faint)]" /> Joining Date
              </span>
              <span className="font-semibold text-[var(--foreground)]">{employee.job?.joiningDate?.split('T')[0]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Documents review list */}
      <div className="p-5.5 bg-white/90 backdrop-blur-sm border border-emerald-100/60 rounded-[16px] shadow-sm shadow-emerald-500/5">
        <div className="flex justify-between items-center mb-4 border-b border-emerald-100/60 pb-3">
          <h2 className="text-[15px] font-bold text-neutral-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <FileText className="w-4 h-4 text-emerald-600" /> Documents
          </h2>
          {isHR && employee.status === 'UNDER_REVIEW' && (
            <button
              onClick={handleApproveReview}
              disabled={actionLoading}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3.5 h-8 rounded-[8px] text-xs font-semibold transition-all disabled:opacity-50"
            >
              Approve Review
            </button>
          )}
        </div>

        {employee.documents?.length === 0 ? (
          <p className="text-[var(--text-muted)] text-[13px]">No documents uploaded</p>
        ) : (
          <div className="space-y-3">
            {employee.documents?.map((doc) => (
              <div 
                key={doc.id} 
                onClick={() => setPreviewDoc(doc)}
                className="p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 hover:border-[var(--color-accent)]/30 hover:bg-[var(--border-color)]/5 cursor-pointer transition-all w-full group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[14px] text-[var(--foreground)] group-hover:text-[var(--color-accent)] transition-colors">{DOC_LABELS[doc.type] || doc.type.replace(/_/g, ' ')}</p>
                    <span className="text-[10px] text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity">Click to preview</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                    <span>Status:</span> 
                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold border ${getStatusBadge(doc.status)}`}>{doc.status}</span>
                  </p>
                  {doc.rejectionReason && (
                    <p className="text-[12px] text-red-600 font-medium bg-red-50 border border-red-100 px-2.5 py-1 rounded-[6px] mt-1.5">
                      Rejected: {doc.rejectionReason}
                    </p>
                  )}
                </div>

                {isHR && employee.status === 'UNDER_REVIEW' && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap gap-2 items-center text-xs"
                  >
                    {doc.status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleVerifyDoc(doc.id)}
                        disabled={actionLoading}
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3.5 h-7 rounded-[8px] font-semibold transition-all"
                      >
                        Verify
                      </button>
                    )}
                    {doc.status !== 'REJECTED' && (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Rejection reason"
                          value={rejectionReason[doc.id] || ''}
                          onChange={(e) => setRejectionReason({ ...rejectionReason, [doc.id]: e.target.value })}
                          className="border border-[var(--border-color)] px-3 h-7 rounded-[8px] max-w-[150px] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--border-color)] text-xs"
                        />
                        <button
                          onClick={() => handleRejectDoc(doc.id)}
                          disabled={actionLoading}
                          className="border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/40 px-3.5 h-7 rounded-[8px] font-semibold transition-all bg-[var(--card-bg)]"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Compliance Forms list */}
      <div className="p-5.5 bg-white/90 backdrop-blur-sm border border-emerald-100/60 rounded-[16px] shadow-sm shadow-emerald-500/5">
        <h2 className="text-[15px] font-bold text-neutral-800 flex items-center gap-2 mb-4 border-b border-emerald-100/60 pb-3" style={{ fontFamily: 'var(--font-display)' }}>
          <FileCheck2 className="w-4 h-4 text-emerald-600" /> Statutory & EPF Compliance Details
        </h2>

        {/* HR EPFO Form Editor Panel */}
        {isHR && employee.complianceForms?.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Form 11 Editor */}
            {employee.complianceForms.find(f => f.type === 'PF_FORM11') && (
              <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-xl space-y-4">
                <h3 className="font-bold text-[13.5px] text-emerald-800 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                  <Edit3 className="w-4 h-4" /> Form 11 (EPF Declaration)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Employee Name</label>
                    <input 
                      type="text" 
                      value={f11Data.employeeName || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, employeeName: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">UAN (12 digits)</label>
                    <input 
                      type="text" 
                      value={f11Data.uan || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, uan: e.target.value })}
                      placeholder="100XXXXXXXXX"
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Date of Birth</label>
                    <input 
                      type="text" 
                      value={f11Data.dob || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, dob: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Joining Date</label>
                    <input 
                      type="text" 
                      value={f11Data.joiningDate || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, joiningDate: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Prev PF Member ID</label>
                    <input 
                      type="text" 
                      value={f11Data.prevPfMemberId || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, prevPfMemberId: e.target.value })}
                      placeholder="MH/BAN/XXXXX/XXX"
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Prev Employer Name</label>
                    <input 
                      type="text" 
                      value={f11Data.prevEmployerName || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, prevEmployerName: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Previous EPF Member</label>
                    <select 
                      value={f11Data.prevEpfMember || 'No'} 
                      onChange={(e) => setF11Data({ ...f11Data, prevEpfMember: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Previous EPS Member</label>
                    <select 
                      value={f11Data.prevEpsMember || 'No'} 
                      onChange={(e) => setF11Data({ ...f11Data, prevEpsMember: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">International Worker</label>
                    <select 
                      value={f11Data.internationalWorker || 'No'} 
                      onChange={(e) => setF11Data({ ...f11Data, internationalWorker: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">KYC Status</label>
                    <input 
                      type="text" 
                      value={f11Data.kycStatus || ''} 
                      onChange={(e) => setF11Data({ ...f11Data, kycStatus: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveForm('PF_FORM11', f11Data)}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 rounded-md text-xs transition-colors mt-2"
                >
                  Save Form 11 Details
                </button>
              </div>
            )}

            {/* Form 2 / e-Nomination Editor */}
            {employee.complianceForms.find(f => f.type === 'PF_FORM2') && (
              <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-xl space-y-4">
                <h3 className="font-bold text-[13.5px] text-emerald-800 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                  <Edit3 className="w-4 h-4" /> Form 2 / e-Nomination
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Employee Name</label>
                    <input 
                      type="text" 
                      value={f2Data.employeeName || ''} 
                      onChange={(e) => setF2Data({ ...f2Data, employeeName: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Marital Status</label>
                    <select 
                      value={f2Data.maritalStatus || 'Unmarried'} 
                      onChange={(e) => setF2Data({ ...f2Data, maritalStatus: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                      <option value="Widow/Widower">Widow/Widower</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Nominee Name</label>
                    <input 
                      type="text" 
                      value={f2Data.nomineeName || ''} 
                      onChange={(e) => setF2Data({ ...f2Data, nomineeName: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Relationship</label>
                    <input 
                      type="text" 
                      value={f2Data.relationship || ''} 
                      onChange={(e) => setF2Data({ ...f2Data, relationship: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Nominee DOB</label>
                    <input 
                      type="text" 
                      value={f2Data.nomineeDob || ''} 
                      onChange={(e) => setF2Data({ ...f2Data, nomineeDob: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Nominee Address</label>
                    <input 
                      type="text" 
                      value={f2Data.nomineeAddress || ''} 
                      onChange={(e) => setF2Data({ ...f2Data, nomineeAddress: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">Percentage Share</label>
                    <input 
                      type="text" 
                      value={f2Data.percentageShare || '100%'} 
                      onChange={(e) => setF2Data({ ...f2Data, percentageShare: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-500 mb-1">e-Nomination Status</label>
                    <input 
                      type="text" 
                      value={f2Data.eNominationStatus || 'Pending Signature'} 
                      onChange={(e) => setF2Data({ ...f2Data, eNominationStatus: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveForm('PF_FORM2', f2Data)}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 rounded-md text-xs transition-colors mt-2"
                >
                  Save e-Nomination Details
                </button>
              </div>
            )}
          </div>
        )}

        {employee.complianceForms?.length === 0 ? (
          <p className="text-[var(--text-muted)] text-[13px]">No compliance forms generated</p>
        ) : (
          <div className="space-y-2">
            {employee.complianceForms?.map((cf) => (
              <div key={cf.id} className="p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex justify-between items-center text-[13px]">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {cf.type === 'PF_FORM11' ? 'Form 11 (EPF Declaration)' : 
                     cf.type === 'PF_FORM2' ? 'Form 2 / e-Nomination (EPF/EPS Nomination)' : 
                     cf.type}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Deadline: {cf.deadline}</p>
                </div>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-[4px] uppercase border ${
                  cf.status === 'SIGNED' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-[var(--border-color)]/60 text-[var(--text-muted)] border-transparent'
                }`}>
                  {cf.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Milestones & Checklist list */}
      <div className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-sm card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-[15px] font-semibold mb-4 border-b border-[var(--border-color)] pb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Clock className="w-4 h-4 text-[var(--text-muted)]" /> Milestones & Checklist
        </h2>
        {employee.milestones?.length === 0 ? (
          <p className="text-[var(--text-muted)] text-[13px]">No milestones assigned</p>
        ) : (
          <div className="space-y-3">
            {employee.milestones?.map((ms) => (
              <div key={ms.id} className="p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 text-[13px]">
                <div>
                  <p className="font-semibold text-[14px] text-[var(--foreground)]">Milestone {ms.type}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Due Date: {ms.dueDate}</p>
                  <div className="mt-2.5 pl-2.5 border-l border-[var(--border-color)] text-[12px] text-[var(--text-muted)] space-y-1">
                    <p className="font-bold text-[var(--foreground)] mb-0.5">Checklist:</p>
                    {ms.checklist?.map((item, idx) => (
                      <p key={idx}>- {item}</p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-[4px] uppercase border ${
                    ms.status === 'DONE' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-[var(--border-color)]/60 text-[var(--text-muted)] border-transparent'
                  }`}>
                    {ms.status}
                  </span>
                  {(isHR || isManager) && ms.status === 'PENDING' && (
                    <button
                      onClick={() => handleCompleteMilestone(ms.type)}
                      disabled={actionLoading}
                      className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 h-7 rounded-[8px] text-xs font-semibold transition-all"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
            className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[16px] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-4">
              <div>
                <h3 className="text-[18px] font-bold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {DOC_LABELS[previewDoc.type] || previewDoc.type.replace(/_/g, ' ')}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Document Details & Preview</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="h-7 w-7 rounded-full flex items-center justify-center border border-[var(--border-color)] hover:bg-[var(--border-color)]/40 transition-colors text-[var(--text-muted)] hover:text-[var(--foreground)]"
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

            {/* Action Footer */}
            {isHR && employee.status === 'UNDER_REVIEW' && (
              <div className="border-t border-[var(--border-color)] pt-4 mt-4 flex justify-end gap-2.5" onClick={(e) => e.stopPropagation()}>
                {previewDoc.status !== 'VERIFIED' && (
                  <button
                    onClick={() => {
                      handleVerifyDoc(previewDoc.id);
                      setPreviewDoc(null);
                    }}
                    disabled={actionLoading}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 h-9 rounded-[8px] text-xs font-bold transition-all"
                  >
                    Verify Document
                  </button>
                )}
                {previewDoc.status !== 'REJECTED' && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Rejection reason..."
                      value={rejectionReason[previewDoc.id] || ''}
                      onChange={(e) => setRejectionReason({ ...rejectionReason, [previewDoc.id]: e.target.value })}
                      className="border border-[var(--border-color)] px-3 h-9 rounded-[8px] text-xs bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--border-color)] flex-1 sm:w-44"
                    />
                    <button
                      onClick={() => {
                        handleRejectDoc(previewDoc.id);
                        setPreviewDoc(null);
                      }}
                      disabled={actionLoading}
                      className="border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/40 px-4 h-9 rounded-[8px] text-xs font-bold transition-all bg-[var(--card-bg)] shrink-0"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
