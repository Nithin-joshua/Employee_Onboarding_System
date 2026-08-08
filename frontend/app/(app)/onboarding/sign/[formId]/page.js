'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../../lib/apiClient';

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

  if (loading) return <div className="text-gray-500 p-4">Loading form...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!targetForm) return <div className="text-gray-500 p-4">Compliance form not found</div>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white border rounded shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Sign {targetForm.type}</h2>
        <button onClick={() => router.back()} className="text-gray-500 hover:underline text-sm">
          Cancel
        </button>
      </div>

      <div className="space-y-4 text-sm mb-6 bg-gray-50 p-4 border rounded">
        <p className="font-semibold text-base mb-2">Form Data</p>
        {Object.entries(targetForm.data || {}).map(([key, val]) => (
          <p key={key} className="capitalize">
            <span className="font-semibold">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(val)}
          </p>
        ))}
      </div>

      <form onSubmit={handleSign} className="space-y-4">
        {actionError && (
          <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded">
            {actionError}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold mb-1">Type your full name to E-Sign</label>
          <input
            type="text"
            value={signingName}
            onChange={(e) => setSigningName(e.target.value)}
            placeholder="John Doe"
            className="w-full p-2 border rounded"
            required
            id="signing-name-input"
          />
        </div>
        <button
          type="submit"
          disabled={actionLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 font-bold"
        >
          {actionLoading ? 'Signing Form...' : 'Complete Signature'}
        </button>
      </form>
    </div>
  );
}
