'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../lib/apiClient';

const REQUIRED_DOC_TYPES = ['AADHAAR', 'PAN', 'EDUCATION', 'RELIEVING_LETTER', 'BANK_PROOF', 'PHOTO'];

export default function DocumentUploads() {
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({});

  const [actionError, setActionError] = useState('');

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const data = await request(`/employees/${session.user.employeeId}`, { method: 'GET' }, session);
      setEmployee(data);
    } catch (err) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.employeeId) {
      fetchEmployee();
    }
  }, [session]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [type]: true }));
    setActionError('');
    try {
      // Build standard multipart request
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

  if (loading) return <div className="text-gray-500 p-4">Loading uploads...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const uploadedCount = employee?.documents?.filter(
    (d) => d.status === 'SUBMITTED' || d.status === 'VERIFIED'
  ).length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Document Submission</h1>
          <p className="text-xs text-gray-500">Please upload a valid document for each required category</p>
        </div>
        <button onClick={() => router.back()} className="text-sm bg-gray-200 px-3 py-1.5 rounded hover:bg-gray-300">
          Back
        </button>
      </div>

      {actionError && (
        <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded">
          {actionError}
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOC_TYPES.map((type) => {
          const matchedDoc = employee?.documents?.find((d) => d.type === type);
          const hasUploaded = matchedDoc && (matchedDoc.status === 'SUBMITTED' || matchedDoc.status === 'VERIFIED');

          return (
            <div key={type} className="p-4 border rounded bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="font-bold text-sm">{type}</p>
                <p className="text-xs text-gray-500">
                  Status:{' '}
                  <span className={`font-semibold ${hasUploaded ? 'text-green-600' : 'text-yellow-600'}`}>
                    {matchedDoc?.status || 'NOT_STARTED'}
                  </span>
                </p>
                {matchedDoc?.rejectionReason && (
                  <p className="text-xs text-red-500 font-medium mt-1">Reason: {matchedDoc.rejectionReason}</p>
                )}
              </div>

              <div>
                <input
                  type="file"
                  id={`file-input-${type}`}
                  onChange={(e) => handleFileUpload(e, type)}
                  className="hidden"
                  accept="application/pdf,image/*"
                />
                <label
                  htmlFor={`file-input-${type}`}
                  className="cursor-pointer bg-gray-100 border text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-200 font-semibold"
                >
                  {uploading[type] ? 'Uploading...' : hasUploaded ? 'Replace File' : 'Upload File'}
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {uploadedCount === REQUIRED_DOC_TYPES.length && (
        <button
          onClick={handleSubmitAll}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 font-bold"
        >
          Submit Documents For Review
        </button>
      )}
    </div>
  );
}
