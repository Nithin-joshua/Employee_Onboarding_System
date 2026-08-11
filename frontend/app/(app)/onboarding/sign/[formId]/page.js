'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../../lib/apiClient';
import { Edit3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Signature Pad drawing component
function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#059669'; // Elegant emerald color for signature
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set background color of canvas to white so transparent images don't look weird on PDF
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Scale coordinates correctly matching CSS layout sizing
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div className="space-y-2">
      <div className="border border-[var(--border-color)] bg-white rounded-xl overflow-hidden shadow-inner relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          className="w-full h-[180px] cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <button
          type="button"
          onClick={clearCanvas}
          className="absolute right-3.5 bottom-2.5 h-6 px-2.5 rounded-[4px] bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-bold border border-neutral-300 transition-colors uppercase tracking-wider"
        >
          Clear
        </button>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] text-center italic">Draw your signature inside the box above</p>
    </div>
  );
}


export default function ComplianceFormSigning({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
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
    if (!signatureBase64) {
      setActionError('Please draw your signature to sign');
      return;
    }
    setActionLoading(true);
    try {
      await request(`/employees/${employee.id}/sign-form/${params.formId}`, {
        method: 'POST',
        body: JSON.stringify({ signedBy: signatureBase64 }),
      }, session);
      router.push('/onboarding');
    } catch (err) {
      setActionError(err.message || 'Failed to sign the form');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--text-muted)] text-[14px]">Loading form...</p>
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

  if (!targetForm) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] mt-10">
        Compliance form not found.
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="max-w-md mx-auto bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[12px] p-6 md:p-8 space-y-6 shadow-sm"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Sign {targetForm.type}</h2>
        <button 
          onClick={() => router.back()} 
          className="h-8 px-3 rounded-[8px] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-xs font-semibold flex items-center gap-1"
        >
          Cancel
        </button>
      </div>

      {/* Form Explanation Box */}
      <div className="p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-xl space-y-1.5">
        <h4 className="font-bold text-[13.5px] text-emerald-800" style={{ fontFamily: 'var(--font-display)' }}>
          {targetForm.type === 'PF_FORM11' ? 'Provident Fund Declaration (Form 11)' : 
           targetForm.type === 'PF_FORM2' ? 'Provident Fund Nomination (Form 2)' : 
           'ESI Registration (Form 1)'}
        </h4>
        <p className="text-xs text-neutral-600 leading-relaxed">
          {targetForm.type === 'PF_FORM11' && 'Form 11 is a statutory declaration used to link your Universal Account Number (UAN) to OnboardPro, declaring your prior membership status with the Employees Provident Fund.'}
          {targetForm.type === 'PF_FORM2' && 'Form 2 is a nomination form to declare your family details and nominate beneficiaries who will receive your EPF savings and pension benefits in case of unforeseen circumstances.'}
          {targetForm.type === 'ESI_FORM1' && 'Form 1 registers you under the Employee State Insurance Scheme, enabling medical care, cash benefits, and dependency support for you and your family.'}
        </p>
      </div>

      <div className="space-y-2 text-[13px] bg-[var(--background)] p-4 border border-[var(--border-color)] rounded-[8px]">
        <p className="font-semibold text-[14px] mb-2 text-[var(--foreground)] border-b border-[var(--border-color)] pb-1.5" style={{ fontFamily: 'var(--font-display)' }}>Form Data Preview</p>
        {Object.entries(targetForm.data || {}).map(([key, val]) => {
          if (key === 'signedBy') return null;
          if (key === 'signedAt') return null;
          if (key === 'declarationText') return null;
          
          const PF_FIELD_LABELS = {
            employeeName: 'Employee Full Name',
            dob: 'Date of Birth',
            joiningDate: 'Date of Joining',
            uan: 'Universal Account Number (UAN)',
            prevPfMemberId: 'Previous PF Member ID',
            prevEmployerName: 'Previous Employer Name',
            prevEpfMember: 'Previous EPF Membership',
            prevEpsMember: 'Previous EPS Membership',
            schemeCertificateDetails: 'Scheme Certificate Details',
            internationalWorker: 'International Worker Status',
            kycStatus: 'KYC Verification Status',
            maritalStatus: 'Marital Status',
            nomineeName: 'Nominee / Beneficiary Name',
            relationship: 'Relationship with Nominee',
            nomineeDob: 'Nominee Date of Birth',
            nomineeAddress: 'Nominee Address',
            percentageShare: 'Nomination Percentage / Share',
            guardianDetails: 'Guardian Details',
            eNominationStatus: 'e-Nomination Status'
          };
          
          return (
            <p key={key} className="flex justify-between gap-2 py-0.5 border-b border-dashed border-[var(--border-color)] last:border-0">
              <span className="font-semibold text-[var(--text-muted)] text-[12px]">{PF_FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1')}:</span> 
              <span className="font-semibold text-[var(--foreground)] text-[12px] text-right">{String(val) || 'N/A'}</span>
            </p>
          );
        })}
      </div>

      <form onSubmit={handleSign} className="space-y-4">
        {actionError && (
          <div className="p-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-[6px]">
            {actionError}
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-[var(--foreground)]">Draw your Signature below</label>
          <SignaturePad
            onSave={(dataUrl) => setSignatureBase64(dataUrl)}
            onClear={() => setSignatureBase64('')}
          />
        </div>

        <button
          type="submit"
          disabled={actionLoading}
          className="w-full h-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[8px] font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Signing...
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" /> Complete Signature
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
