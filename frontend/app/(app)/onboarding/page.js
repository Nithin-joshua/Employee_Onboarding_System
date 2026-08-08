'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { request } from '../../../lib/apiClient';

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

  if (loading) return <div className="text-gray-500 p-4">Loading onboarding details...</div>;
  if (error) return (
    <div className="p-4 space-y-4">
      <div className="text-red-500">{error}</div>
      <button onClick={() => signOut({ callbackUrl: '/signin' })} className="bg-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Welcome, {employee?.personal?.name}</h1>
          <p className="text-xs text-gray-500">Employee ID: {employee?.id}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/signin' })}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300"
          id="onboarding-signout-btn"
        >
          Sign Out
        </button>
      </div>

      {actionError && (
        <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded">
          {actionError}
        </div>
      )}

      {/* Onboarding Stage Description */}
      <div className="p-4 border rounded bg-white space-y-3">
        <h2 className="text-lg font-bold">Onboarding Status</h2>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <p className="font-semibold text-base mb-1">{employee?.status}</p>
          <p>{statusDescriptions[employee?.status] || 'Processing onboarding stages...'}</p>
        </div>

        {employee?.status === 'DOCUMENTS_SUBMITTED' && (
          <button
            onClick={handleRunExtraction}
            disabled={actionLoading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 font-semibold disabled:bg-gray-400"
          >
            {actionLoading ? 'Running Extraction...' : 'Run OCR Extraction (Verify stage next)'}
          </button>
        )}
      </div>

      {/* Links to sections */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <Link
          href="/onboarding/documents"
          className="p-4 border rounded bg-white hover:bg-gray-50 flex flex-col items-center justify-center space-y-1"
        >
          <span className="font-bold text-sm">Upload Documents</span>
          <span className="text-xs text-gray-500">
            {employee?.documents?.filter(d => d.status === 'SUBMITTED' || d.status === 'VERIFIED').length || 0} of 6 uploaded
          </span>
        </Link>

        <div className="p-4 border rounded bg-white flex flex-col justify-center items-center">
          <span className="font-bold text-sm mb-2">Compliance Forms</span>
          {employee?.complianceForms?.length === 0 ? (
            <span className="text-xs text-gray-500">None generated yet</span>
          ) : (
            <div className="space-y-1 w-full text-xs">
              {employee?.complianceForms?.map(cf => (
                <div key={cf.id} className="flex justify-between items-center bg-gray-50 p-1.5 border rounded">
                  <span className="font-medium">{cf.type}</span>
                  {cf.status === 'PENDING_SIGNATURE' ? (
                    <Link href={`/onboarding/sign/${cf.id}`} className="text-blue-500 hover:underline font-bold">
                      Sign Form
                    </Link>
                  ) : (
                    <span className="text-gray-400">{cf.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
