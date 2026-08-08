'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';
import { 
  ArrowLeft, FileText, User, Briefcase, 
  FileCheck2, Clock, AlertTriangle, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleCompleteMilestone = async (milestoneId) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await request(`/employees/${params.id}/complete-milestone`, {
        method: 'POST',
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
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>{employee.personal?.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] text-[var(--text-muted)]">Status:</span>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${getStatusBadge(employee.status)}`}>
              {employee.status.replace(/_/g, ' ')}
            </span>
          </div>
          {employee.lastRejectionReason && (
            <p className="text-[var(--text-muted)] text-xs font-semibold mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Rejection: {employee.lastRejectionReason}
            </p>
          )}
        </div>
        <button 
          onClick={() => router.back()} 
          className="h-8 px-3 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/40 transition-all text-xs font-semibold flex items-center gap-1.5 bg-[var(--card-bg)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
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

      {/* 1. Manager Approval Panel */}
      {employee.status === 'MANAGER_REVIEW' && isManager && (
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
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-sm card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-[15px] font-semibold mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <User className="w-4 h-4 text-[var(--text-muted)]" /> Personal Details
          </h2>
          <div className="space-y-3 text-[13px]">
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Email:</span> <span className="font-medium text-[var(--foreground)]">{employee.personal?.email}</span></p>
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Phone:</span> <span className="font-medium text-[var(--foreground)]">{employee.personal?.phone}</span></p>
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">DOB:</span> <span className="font-medium text-[var(--foreground)]">{employee.personal?.dob}</span></p>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-sm card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-[15px] font-semibold mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Briefcase className="w-4 h-4 text-[var(--text-muted)]" /> Job Details
          </h2>
          <div className="space-y-3 text-[13px]">
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Title:</span> <span className="font-medium text-[var(--foreground)]">{employee.job?.title}</span></p>
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Department:</span> <span className="font-medium text-[var(--foreground)]">{employee.job?.department}</span></p>
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Manager ID:</span> <span className="font-mono text-[11px] text-[var(--text-muted)]">{employee.job?.managerId}</span></p>
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Salary:</span> <span className="font-semibold text-[var(--color-accent)]">${employee.job?.salary?.toLocaleString()}</span></p>
            <p className="flex justify-between"><span className="font-semibold text-[var(--text-muted)]">Joining Date:</span> <span className="font-medium text-[var(--foreground)]">{employee.job?.joiningDate}</span></p>
          </div>
        </div>
      </div>

      {/* 3. Documents review list */}
      <div className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-sm card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-3">
          <h2 className="text-[15px] font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <FileText className="w-4 h-4 text-[var(--text-muted)]" /> Documents
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
              <div key={doc.id} className="p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 hover:border-[var(--color-accent)]/20 transition-all">
                <div className="space-y-1">
                  <p className="font-semibold text-[14px] text-[var(--foreground)]">{doc.type.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                    <span>Status:</span> 
                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold border ${getStatusBadge(doc.status)}`}>{doc.status}</span>
                  </p>
                  {doc.storagePath && (
                    <p className="text-[11px] text-[var(--text-muted)] font-mono overflow-hidden overflow-ellipsis max-w-xs">{doc.storagePath}</p>
                  )}
                  {doc.rejectionReason && (
                    <p className="text-[12px] text-red-600 font-medium bg-red-50 border border-red-100 px-2.5 py-1 rounded-[6px] mt-1.5">
                      Rejected: {doc.rejectionReason}
                    </p>
                  )}
                </div>

                {isHR && employee.status === 'UNDER_REVIEW' && (
                  <div className="flex flex-wrap gap-2 items-center text-xs">
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
      <div className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] shadow-sm card-lift" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-[15px] font-semibold mb-4 border-b border-[var(--border-color)] pb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <FileCheck2 className="w-4 h-4 text-[var(--text-muted)]" /> Compliance Forms
        </h2>
        {employee.complianceForms?.length === 0 ? (
          <p className="text-[var(--text-muted)] text-[13px]">No compliance forms generated</p>
        ) : (
          <div className="space-y-2">
            {employee.complianceForms?.map((cf) => (
              <div key={cf.id} className="p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-[8px] flex justify-between items-center text-[13px]">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{cf.type}</p>
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
                      onClick={() => handleCompleteMilestone(ms.id)}
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
  );
}
