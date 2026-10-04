'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../../../lib/apiClient';
import { 
  Edit3, 
  Loader2, 
  Upload, 
  PenTool, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  ShieldCheck, 
  User, 
  Calendar, 
  Building2,
  AlertCircle
} from 'lucide-react';
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
    if (!canvas) return;
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
          width={450}
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
      <p className="text-[11px] text-[var(--text-muted)] text-center italic">
        Draw your signature inside the box using your mouse or finger
      </p>
    </div>
  );
}

// Signature Image Upload component
function SignatureUpload({ onUpload, currentSignature, onClear }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const processFile = (file) => {
    setUploadError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, or JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onUpload(reader.result);
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  if (currentSignature) {
    return (
      <div className="space-y-2">
        <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[160px]">
          <div className="max-h-[130px] flex items-center justify-center p-2 bg-white rounded-lg border border-neutral-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSignature}
              alt="Uploaded signature preview"
              className="max-h-[110px] max-w-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white hover:bg-red-50 text-neutral-500 hover:text-red-500 border border-neutral-200 shadow-sm transition-colors"
            title="Remove uploaded signature"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-emerald-600 text-center font-medium flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Signature image uploaded and ready
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50/40'
            : 'border-neutral-300 hover:border-emerald-500 bg-neutral-50/60 hover:bg-neutral-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-2">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-neutral-800">
          Click to upload or drag & drop signature image
        </p>
        <p className="text-[11px] text-neutral-500 mt-1">
          Supported formats: PNG, JPG, JPEG (Max 5MB)
        </p>
      </div>
      {uploadError && (
        <p className="text-[11px] text-red-500 text-center font-medium">{uploadError}</p>
      )}
    </div>
  );
}

// Helpers for Date & Value formatting
function formatDisplayDate(val) {
  if (!val) return 'Not Specified';
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return str;
}

function formatValue(key, val) {
  if (val === null || val === undefined || val === '') {
    return (
      <span className="text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200">
        Not Applicable
      </span>
    );
  }
  if (typeof val === 'boolean') {
    return val ? (
      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
        Yes
      </span>
    ) : (
      <span className="text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200">
        No
      </span>
    );
  }
  if (
    key.toLowerCase().includes('date') ||
    key === 'dob' ||
    key === 'joiningdate' ||
    key === 'nomineedob'
  ) {
    return (
      <span className="font-semibold text-neutral-800 flex items-center gap-1 text-[12px]">
        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
        {formatDisplayDate(val)}
      </span>
    );
  }
  if (String(val).toLowerCase().includes('verified')) {
    return (
      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-600" />
        {String(val)}
      </span>
    );
  }
  return <span className="font-semibold text-neutral-800 text-right text-[12px]">{String(val)}</span>;
}

export default function ComplianceFormSigning({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { data: session } = useSession();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' or 'upload'
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
      setActionError('Please provide your signature by drawing or uploading an image');
      return;
    }
    setActionLoading(true);
    try {
      await request(
        `/employees/${employee.id}/sign-form/${params.formId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            signedBy: employee?.personal?.name || employee?.id,
            signature: signatureBase64,
          }),
        },
        session,
      );
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
        <p className="text-[var(--text-muted)] text-[14px]">Loading compliance form...</p>
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

  const formData = targetForm.data || {};

  // Clear labels dictionary
  const FIELD_LABELS = {
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
    fatherName: 'Father Name',
    fatherOrSpouseName: 'Father / Spouse Name',
    gender: 'Gender',
    presentAddress: 'Present Address',
    permanentAddress: 'Permanent Address',
    dispensary: 'ESI Dispensary Facility',
    branchOffice: 'Regional ESI Office',
    nomineeName: 'Nominee / Beneficiary Name',
    relationship: 'Relationship with Nominee',
    nomineeDob: 'Nominee Date of Birth',
    nomineeAddress: 'Nominee Address',
    percentageShare: 'Nomination Share',
    guardianDetails: 'Guardian Details',
    eNominationStatus: 'e-Nomination Status',
  };

  // Organize form fields into logical groups
  const personalFields = ['employeeName', 'dob', 'gender', 'maritalStatus', 'fatherOrSpouseName', 'fatherName', 'joiningDate', 'kycStatus'];
  const epfFields = ['uan', 'prevEpfMember', 'prevEpsMember', 'prevPfMemberId', 'prevEmployerName', 'schemeCertificateDetails', 'internationalWorker'];
  const nomineeFields = ['nomineeName', 'relationship', 'nomineeDob', 'percentageShare', 'nomineeAddress', 'guardianDetails', 'eNominationStatus'];
  const addressFields = ['presentAddress', 'permanentAddress', 'dispensary', 'branchOffice'];

  const filterAndOrder = (keys) => {
    return keys
      .filter((k) => formData[k] !== undefined && k !== 'signedBy' && k !== 'signedAt' && k !== 'signature' && k !== 'declarationText')
      .map((k) => ({
        key: k,
        label: FIELD_LABELS[k] || k.replace(/([A-Z])/g, ' $1'),
        val: formData[k],
      }));
  };

  const personalGroup = filterAndOrder(personalFields);
  const epfGroup = filterAndOrder(epfFields);
  const nomineeGroup = filterAndOrder(nomineeFields);
  const addressGroup = filterAndOrder(addressFields);

  // Any remaining custom fields
  const handledKeys = new Set([...personalFields, ...epfFields, ...nomineeFields, ...addressFields, 'signedBy', 'signedAt', 'signature', 'declarationText']);
  const otherGroup = Object.entries(formData)
    .filter(([k]) => !handledKeys.has(k))
    .map(([k, val]) => ({
      key: k,
      label: FIELD_LABELS[k] || k.replace(/([A-Z])/g, ' $1'),
      val,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="max-w-2xl mx-auto bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[16px] p-6 md:p-8 space-y-6 shadow-sm"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              Statutory Form
            </span>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              ID: {targetForm.id.slice(0, 8)}...
            </span>
          </div>
          <h2
            className="text-[20px] font-bold tracking-tight text-[var(--foreground)] mt-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {targetForm.type === 'PF_FORM11'
              ? 'EPF Declaration (Form 11)'
              : targetForm.type === 'PF_FORM2'
              ? 'EPF Nomination & Beneficiary (Form 2)'
              : 'ESI Registration (Form 1)'}
          </h2>
        </div>
        <button
          onClick={() => router.back()}
          className="h-8 px-3 rounded-[8px] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Form Explanation Box */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
        <h4
          className="font-bold text-[13.5px] text-emerald-800 flex items-center gap-1.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {targetForm.type === 'PF_FORM11'
            ? 'Employees Provident Fund Declaration'
            : targetForm.type === 'PF_FORM2'
            ? 'Statutory Provident Fund Nomination'
            : 'Employee State Insurance Coverage'}
        </h4>
        <p className="text-xs text-neutral-600 leading-relaxed">
          {targetForm.type === 'PF_FORM11' &&
            'Form 11 is mandatory under the EPF Act to register your employment, link your Universal Account Number (UAN), and declare previous EPF membership history for seamless retirement benefits.'}
          {targetForm.type === 'PF_FORM2' &&
            'Form 2 records your family nomination for the Employees Provident Fund and Pension Scheme, ensuring nominated beneficiaries receive your accumulated benefits.'}
          {targetForm.type === 'ESI_FORM1' &&
            'Form 1 registers eligible employees under the ESI Corporation, providing healthcare, medical treatment at designated dispensaries, and cash sickness benefits.'}
        </p>
      </div>

      {/* Structured Form Details Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <h3
            className="text-[14px] font-bold text-[var(--foreground)] flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <FileText className="w-4 h-4 text-[var(--color-accent)]" />
            Verified Statutory Details
          </h3>
          <span className="text-[11px] text-[var(--text-muted)] italic">
            Review information before signing
          </span>
        </div>

        {/* Personal Details Section */}
        {personalGroup.length > 0 && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 space-y-2.5">
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-400" /> Employee Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
              {personalGroup.map(({ key, label, val }) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1.5 px-3 rounded-[8px] bg-white border border-neutral-200/70 shadow-xs"
                >
                  <span className="text-neutral-500 font-medium">{label}:</span>
                  {formatValue(key, val)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EPF & Employment History Section */}
        {epfGroup.length > 0 && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 space-y-2.5">
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" /> EPF & Previous Employment History
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
              {epfGroup.map(({ key, label, val }) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1.5 px-3 rounded-[8px] bg-white border border-neutral-200/70 shadow-xs"
                >
                  <span className="text-neutral-500 font-medium">{label}:</span>
                  {formatValue(key, val)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nominee Details Section */}
        {nomineeGroup.length > 0 && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 space-y-2.5">
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" /> Beneficiary & Nomination Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
              {nomineeGroup.map(({ key, label, val }) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1.5 px-3 rounded-[8px] bg-white border border-neutral-200/70 shadow-xs"
                >
                  <span className="text-neutral-500 font-medium">{label}:</span>
                  {formatValue(key, val)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Healthcare & Address Section */}
        {addressGroup.length > 0 && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 space-y-2.5">
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" /> Address & Healthcare Allocation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
              {addressGroup.map(({ key, label, val }) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1.5 px-3 rounded-[8px] bg-white border border-neutral-200/70 shadow-xs"
                >
                  <span className="text-neutral-500 font-medium">{label}:</span>
                  {formatValue(key, val)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other fields */}
        {otherGroup.length > 0 && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 space-y-2.5">
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Additional Form Data
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
              {otherGroup.map(({ key, label, val }) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1.5 px-3 rounded-[8px] bg-white border border-neutral-200/70 shadow-xs"
                >
                  <span className="text-neutral-500 font-medium">{label}:</span>
                  {formatValue(key, val)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Section */}
      <form onSubmit={handleSign} className="space-y-4 pt-2 border-t border-[var(--border-color)]">
        {actionError && (
          <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-[8px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[13.5px] font-bold text-neutral-800">
              E-Signature Authorization
            </label>
            {/* Mode Switcher Tabs */}
            <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs">
              <button
                type="button"
                onClick={() => setSignatureMode('draw')}
                className={`px-3 py-1 rounded-[6px] font-semibold transition-all flex items-center gap-1.5 ${
                  signatureMode === 'draw'
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Draw Signature
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('upload')}
                className={`px-3 py-1 rounded-[6px] font-semibold transition-all flex items-center gap-1.5 ${
                  signatureMode === 'upload'
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Signature Image
              </button>
            </div>
          </div>

          {signatureMode === 'draw' ? (
            <SignaturePad
              onSave={(dataUrl) => setSignatureBase64(dataUrl)}
              onClear={() => setSignatureBase64('')}
            />
          ) : (
            <SignatureUpload
              currentSignature={signatureBase64}
              onUpload={(dataUrl) => setSignatureBase64(dataUrl)}
              onClear={() => setSignatureBase64('')}
            />
          )}
        </div>

        {/* Declaration and Submit Button */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-[10px] text-[11.5px] text-neutral-600 leading-relaxed">
          By clicking <strong className="text-neutral-800 font-semibold">Complete Signature</strong>, you certify that the information provided in this compliance form is true and complete to the best of your knowledge.
        </div>

        <button
          type="submit"
          disabled={actionLoading || !signatureBase64}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[10px] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Authorizing & Signing Form...
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
