'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';

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

  const fetchEmployee = async () => {
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
  };

  useEffect(() => {
    if (!session || !params.id) return;
    fetchEmployee();
  }, [session, params.id]);

  const handleApproveReview = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await request(`/employees/${params.id}/approve-review`, {
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

  if (loading) return <div className="text-gray-500 p-4">Loading details...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!employee) return <div className="text-gray-500 p-4">Employee not found</div>;

  const isHR = session?.user?.role === 'HR';
  const isManager = session?.user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{employee.personal?.name}</h1>
          <p className="text-gray-500 text-sm">Status: <span className="font-semibold text-blue-600">{employee.status}</span></p>
          {employee.lastRejectionReason && (
            <p className="text-red-500 text-xs font-semibold mt-1">Manager Rejection Reason: {employee.lastRejectionReason}</p>
          )}
        </div>
        <button onClick={() => router.back()} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm">
          Back
        </button>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded border text-sm flex justify-between items-center ${
          actionMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold hover:opacity-85 text-xs ml-3 uppercase">Dismiss</button>
        </div>
      )}

      {/* Manager Approval Panel */}
      {employee.status === 'MANAGER_REVIEW' && isManager && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded space-y-4">
          <h3 className="font-bold text-blue-900">Manager Final Approval Gate</h3>
          <p className="text-xs text-blue-700">As the assigned Manager, please review the compliance details below and sign off on this hire.</p>
          <div className="flex gap-2">
            <button
              onClick={handleApproveHire}
              disabled={actionLoading}
              className="bg-green-600 text-white px-4 py-2 rounded text-xs hover:bg-green-700 disabled:bg-gray-400 font-bold"
            >
              Approve Hire & Finalize
            </button>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Reason for rejection"
                value={managerRejectReason}
                onChange={(e) => setManagerRejectReason(e.target.value)}
                className="border p-2 rounded text-xs flex-1 bg-white"
              />
              <button
                onClick={handleRejectHire}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded text-xs hover:bg-red-700 disabled:bg-gray-400 font-bold"
              >
                Reject Hire
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="p-4 border rounded bg-white">
          <h2 className="text-lg font-bold mb-3 border-b pb-2">Personal Details</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Email:</span> {employee.personal?.email}</p>
            <p><span className="font-semibold">Phone:</span> {employee.personal?.phone}</p>
            <p><span className="font-semibold">DOB:</span> {employee.personal?.dob}</p>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-4 border rounded bg-white">
          <h2 className="text-lg font-bold mb-3 border-b pb-2">Job Details</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Title:</span> {employee.job?.title}</p>
            <p><span className="font-semibold">Department:</span> {employee.job?.department}</p>
            <p><span className="font-semibold">Manager ID:</span> {employee.job?.managerId}</p>
            <p><span className="font-semibold">Salary:</span> {employee.job?.salary}</p>
            <p><span className="font-semibold">Joining Date:</span> {employee.job?.joiningDate}</p>
          </div>
        </div>
      </div>

      {/* Documents review */}
      <div className="p-4 border rounded bg-white">
        <div className="flex justify-between items-center mb-3 border-b pb-2">
          <h2 className="text-lg font-bold">Documents</h2>
          {isHR && employee.status === 'UNDER_REVIEW' && (
            <button
              onClick={handleApproveReview}
              disabled={actionLoading}
              className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600 disabled:bg-gray-400 font-semibold"
            >
              Approve Review (Compliance phase next)
            </button>
          )}
        </div>

        {employee.documents?.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents uploaded</p>
        ) : (
          <div className="space-y-4">
            {employee.documents?.map((doc) => (
              <div key={doc.id} className="p-3 border rounded bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <p className="font-semibold text-sm">{doc.type}</p>
                  <p className="text-xs text-gray-500">Status: <span className="font-medium">{doc.status}</span></p>
                  {doc.storagePath && (
                    <p className="text-xs text-blue-500 font-mono mt-1 overflow-hidden overflow-ellipsis max-w-xs">{doc.storagePath}</p>
                  )}
                  {doc.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1 font-semibold">Rejected reason: {doc.rejectionReason}</p>
                  )}
                </div>

                {isHR && employee.status === 'UNDER_REVIEW' && (
                  <div className="flex gap-2 items-center text-xs">
                    {doc.status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleVerifyDoc(doc.id)}
                        disabled={actionLoading}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:bg-gray-400"
                      >
                        Verify
                      </button>
                    )}
                    {doc.status !== 'REJECTED' && (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Rejection reason"
                          value={rejectionReason[doc.id] || ''}
                          onChange={(e) => setRejectionReason({ ...rejectionReason, [doc.id]: e.target.value })}
                          className="border p-1 rounded max-w-[150px]"
                        />
                        <button
                          onClick={() => handleRejectDoc(doc.id)}
                          disabled={actionLoading}
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:bg-gray-400"
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

      {/* Compliance Forms */}
      <div className="p-4 border rounded bg-white">
        <h2 className="text-lg font-bold mb-3 border-b pb-2">Compliance Forms</h2>
        {employee.complianceForms?.length === 0 ? (
          <p className="text-gray-500 text-sm">No compliance forms generated</p>
        ) : (
          <div className="space-y-3">
            {employee.complianceForms?.map((form) => (
              <div key={form.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{form.type}</p>
                  <p className="text-xs text-gray-500">Deadline: {form.deadline}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${form.status === 'SIGNED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {form.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones checklist */}
      <div className="p-4 border rounded bg-white">
        <h2 className="text-lg font-bold mb-3 border-b pb-2">Milestones & Checklist</h2>
        {employee.milestones?.length === 0 ? (
          <p className="text-gray-500 text-sm">No milestones assigned</p>
        ) : (
          <div className="space-y-4">
            {employee.milestones?.map((ms) => (
              <div key={ms.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">Milestone {ms.type}</p>
                  <p className="text-xs text-gray-500">Due Date: {ms.dueDate}</p>
                  <div className="mt-2 pl-2 border-l-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">Checklist:</p>
                    {ms.checklist?.map((item, idx) => (
                      <p key={idx}>- {item}</p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${ms.status === 'DONE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {ms.status}
                  </span>
                  {(isHR || isManager) && ms.status === 'PENDING' && (
                    <button
                      onClick={() => handleCompleteMilestone(ms.id)}
                      disabled={actionLoading}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:bg-gray-400"
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
    </div>
  );
}
