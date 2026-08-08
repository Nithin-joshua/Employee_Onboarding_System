'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { request } from '../../../lib/apiClient';

export default function Dashboard() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await request('/employees', { method: 'GET' }, session);
        
        // If logged in as MANAGER, filter employees by managerId matching current logged in user
        if (session.user.role === 'MANAGER') {
          const managerId = session.user.employeeId || session.user.id;
          const filtered = data.filter((emp) => emp.job?.managerId === managerId);
          setEmployees(filtered);
        } else {
          setEmployees(data);
        }
      } catch (err) {
        setError(err.message || 'Something went wrong, try again');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-brand-grey-muted text-[16px] animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-brand-pink-soft text-brand-black rounded-[8px] max-w-xl mx-auto mt-10">
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-[14px] mt-1">{error}</p>
      </div>
    );
  }

  const role = session?.user?.role || 'NEW_HIRE';
  const pendingReviewsCount = employees.filter(emp => emp.status === 'UNDER_REVIEW').length;

  const getConfidence = (emp) => {
    if (!emp.documents || emp.documents.length === 0) {
      return { label: 'High', color: 'bg-[#B5C7B0] text-[#1b1d00]' };
    }
    const confidences = emp.documents
      .map(d => d.ocrConfidence)
      .filter(c => c !== null && c !== undefined);

    if (confidences.length === 0) {
      return { label: 'High', color: 'bg-[#B5C7B0] text-[#1b1d00]' };
    }

    const minConfidence = Math.min(...confidences);
    if (minConfidence >= 0.85) return { label: 'High', color: 'bg-[#B5C7B0] text-[#1b1d00]' };
    if (minConfidence >= 0.60) return { label: 'Medium', color: 'bg-[#F7B06B] text-[#1b1d00]' };
    return { label: 'Low', color: 'bg-[#ECB6E6] text-[#310c32]' };
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-brand-lime/25 text-[#4c5100]';
      case 'UNDER_REVIEW':
        return 'bg-brand-amber/25 text-brand-black';
      case 'REJECTED':
        return 'bg-brand-pink-soft text-brand-black';
      default:
        return 'bg-brand-cool-white text-brand-grey-muted';
    }
  };

  return (
    <div className="space-y-8 -m-6 p-6 md:p-8 bg-[#F6F5FC] min-h-[90vh] rounded-[24px]">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-brand-black tracking-tight font-headline">
            {role === 'HR' ? 'HR Onboarding Dashboard' : 'Manager Boarding Workspace'}
          </h1>
          <p className="text-brand-grey-muted text-[16px] mt-1">
            Overview of verification processes and pending candidate reviews.
          </p>
        </div>
        {role === 'HR' && (
          <div className="flex gap-3">
            <Link
              href="/settings/invitations"
              className="h-11 px-6 bg-white border border-gray-300 text-brand-black rounded-full font-semibold text-[14px] flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
              id="invitations-btn"
            >
              Invitation Codes
            </Link>
            <Link
              href="/employees/new"
              className="h-11 px-6 bg-brand-black text-white rounded-full font-semibold text-[14px] flex items-center justify-center hover:bg-brand-charcoal transition-all shadow-sm"
              id="new-employee-btn"
            >
              + Add New Hire
            </Link>
          </div>
        )}
      </div>

      {/* Metrics Row (Bento Cards Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-brand-surface rounded-[16px] shadow-[0_4px_20px_rgba(18,18,18,0.06)] p-[24px] flex flex-col justify-between h-40 relative overflow-hidden group border border-brand-grey-light">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#BFBBF2] rounded-bl-full opacity-20 -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <h3 className="text-[14px] font-medium text-brand-grey-muted z-10">Pending Reviews</h3>
          <div className="flex items-baseline gap-2 z-10 mt-auto">
            <span className="text-5xl font-bold text-brand-black font-headline">{pendingReviewsCount}</span>
            <span className="text-[12px] font-semibold text-brand-grey-muted">Requires action</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-brand-surface rounded-[16px] shadow-[0_4px_20px_rgba(18,18,18,0.06)] p-[24px] flex flex-col justify-between h-40 relative overflow-hidden group border border-brand-grey-light">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#BEC658] rounded-bl-full opacity-20 -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <h3 className="text-[14px] font-medium text-brand-grey-muted z-10">OCR Extraction Success</h3>
          <div className="flex items-baseline gap-2 z-10 mt-auto">
            <span className="text-5xl font-bold text-brand-black font-headline">94.2%</span>
            <span className="text-[12px] font-semibold text-[#5c6300] flex items-center">✓ Optimal</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-brand-surface rounded-[16px] shadow-[0_4px_20px_rgba(18,18,18,0.06)] p-[24px] flex flex-col justify-between h-40 relative overflow-hidden group border border-brand-grey-light">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ECB6E6] rounded-bl-full opacity-20 -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <h3 className="text-[14px] font-medium text-brand-grey-muted z-10">Avg Verification Time</h3>
          <div className="flex items-baseline gap-2 z-10 mt-auto">
            <span className="text-5xl font-bold text-brand-black font-headline">4.8</span>
            <span className="text-[20px] font-bold text-brand-grey-muted ml-1">hrs</span>
          </div>
        </div>
      </div>

      {/* Verification Queue Section */}
      <div className="bg-brand-surface rounded-[16px] shadow-[0_4px_20px_rgba(18,18,18,0.06)] p-6 md:p-8 flex flex-col gap-6 w-full overflow-hidden border border-brand-grey-light">
        <div className="flex justify-between items-center border-b border-brand-grey-light pb-4">
          <h2 className="text-[22px] font-bold text-brand-black font-headline">Verification Queue</h2>
          <div className="text-[12px] text-brand-grey-muted bg-brand-cool-white px-3 py-1.5 rounded-full border border-brand-grey-light font-semibold">
            {employees.length} Candidates total
          </div>
        </div>

        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="p-12 text-center text-brand-grey-muted">No candidates in queue.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-grey-light">
                  <th className="py-3 px-4 text-[14px] font-medium text-brand-grey-muted">Candidate</th>
                  <th className="py-3 px-4 text-[14px] font-medium text-brand-grey-muted hidden sm:table-cell">Job Details</th>
                  <th className="py-3 px-4 text-[14px] font-medium text-brand-grey-muted">Status</th>
                  <th className="py-3 px-4 text-[14px] font-medium text-brand-grey-muted">OCR Confidence</th>
                  <th className="py-3 px-4 text-[14px] font-medium text-brand-grey-muted text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-grey-light text-brand-black text-[15px]">
                {employees.map((emp) => {
                  const conf = getConfidence(emp);
                  const initial = emp.personal?.name?.charAt(0).toUpperCase() || 'U';
                  return (
                    <tr key={emp.id} className="hover:bg-brand-cool-white transition-colors group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-cool-white border border-brand-grey-slate flex items-center justify-center text-brand-black font-bold text-[14px]">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-brand-black leading-tight">{emp.personal?.name}</p>
                            <p className="text-[12px] text-brand-grey-muted mt-0.5">{emp.personal?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <p className="font-medium text-brand-black">{emp.job?.title}</p>
                        <p className="text-[12px] text-brand-grey-muted mt-0.5">{emp.job?.department}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${getStatusBadgeColor(emp.status)}`}>
                          {emp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${conf.color}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="h-10 px-5 rounded-full bg-brand-black text-white font-semibold text-[13px] hover:bg-brand-charcoal transition-all shadow-sm inline-flex items-center justify-center"
                          id={`review-btn-${emp.id}`}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

