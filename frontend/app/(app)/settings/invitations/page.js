'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';

export default function InvitationCodes() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
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
      setInvitations(data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        jobTitle: form.jobTitle,
        department: form.department,
        managerId: form.managerId,
        salary: parseFloat(form.salary),
        joiningDate: form.joiningDate,
      };

      const result = await request('/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, session);

      setFormSuccess(`Code generated successfully: ${result.code}`);
      setForm({
        jobTitle: '',
        department: '',
        managerId: '',
        salary: '',
        joiningDate: '',
      });
      fetchInvitations();
    } catch (err) {
      setFormError(err.message || 'Failed to generate invitation code');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 animate-pulse">Loading invitations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded border border-red-200 max-w-xl mx-auto mt-10">
        <p className="font-bold">Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Invitation Codes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and manage codes for candidates to register themselves.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="h-10 px-5 border border-gray-300 rounded-full font-semibold text-sm hover:bg-gray-50 transition-all shadow-sm"
          >
            Back
          </button>
          <button
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setShowModal(true);
            }}
            className="h-10 px-5 bg-black text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition-all shadow-sm"
          >
            + Generate Code
          </button>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Job Title</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Manager ID</th>
              <th className="py-3 px-4">Salary</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-700">
            {invitations.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-400">
                  No invitation codes generated yet.
                </td>
              </tr>
            ) : (
              invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-black">{inv.code}</td>
                  <td className="py-3 px-4">{inv.jobTitle}</td>
                  <td className="py-3 px-4">{inv.department}</td>
                  <td className="py-3 px-4 font-mono text-xs">{inv.managerId}</td>
                  <td className="py-3 px-4">${inv.salary.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        inv.used ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {inv.used ? 'Used' : 'Unused'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Code Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">Generate Invitation Code</h3>

            {formError && (
              <div className="p-3 mb-4 text-xs text-red-700 bg-red-100 border border-red-200 rounded">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 mb-4 text-xs text-green-700 bg-green-100 border border-green-200 rounded font-semibold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  value={form.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Engineering"
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Manager ID</label>
                <input
                  type="text"
                  name="managerId"
                  value={form.managerId}
                  onChange={handleChange}
                  placeholder="e.g. mgr_123"
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Annual Salary ($)</label>
                  <input
                    type="number"
                    name="salary"
                    value={form.salary}
                    onChange={handleChange}
                    placeholder="e.g. 90000"
                    className="w-full p-2 border rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Joining Date</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={form.joiningDate}
                    onChange={handleChange}
                    className="w-full p-2 border rounded text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-black text-white p-2.5 rounded-full font-semibold text-sm hover:bg-gray-800 disabled:bg-gray-400 mt-2 transition-colors"
              >
                {formLoading ? 'Generating...' : 'Generate and Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
