'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { request } from '../../../lib/apiClient';
import {
  FileCheck, Eye, Clock, ArrowUpRight,
  UserPlus, ArrowRight, TrendingUp, Users, CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

/* ── helpers ── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildPipelineData(employees) {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = MONTHS[d.getMonth()];
    const mo = d.getMonth(); const yr = d.getFullYear();
    const invited  = employees.filter(e => { const j = e.job?.joiningDate ? new Date(e.job.joiningDate) : null; return j && j.getMonth()===mo && j.getFullYear()===yr; }).length;
    const active   = employees.filter(e => e.status === 'ACTIVE' || e.status === 'DAY1_READY').length;
    const pending  = employees.filter(e => ['DOCUMENTS_PENDING','UNDER_REVIEW','MANAGER_REVIEW'].includes(e.status)).length;
    result.push({ month: label, Invited: invited, Active: active, Pending: pending });
  }
  return result;
}

function buildStageData(employees) {
  const stages = [
    { name: 'Active',    statuses: ['ACTIVE','DAY1_READY'],           color: '#10B981' },
    { name: 'In Review', statuses: ['UNDER_REVIEW','MANAGER_REVIEW'], color: '#6366F1' },
    { name: 'Pending',   statuses: ['DOCUMENTS_PENDING','INVITED'],   color: '#F59E0B' },
    { name: 'Other',     statuses: ['REGISTERED','COMPLIANCE_PROCESSING','PENDING_SIGNATURE'], color: '#A1A1AA' },
  ];
  return stages.map(s => ({
    name: s.name,
    value: employees.filter(e => s.statuses.includes(e.status)).length,
    color: s.color
  })).filter(s => s.value > 0);
}

function buildHeatmap(employees) {
  // 7 days × 5 weeks — doc submissions bucketed by day-of-week + week-index
  const grid = Array.from({ length: 5 }, () => Array(7).fill(0));
  employees.forEach(emp => {
    (emp.documents || []).forEach(doc => {
      if (!doc.uploadedAt) return;
      const d = new Date(doc.uploadedAt);
      const now = new Date();
      const diffDays = Math.floor((now - d) / 86400000);
      if (diffDays < 35) {
        const week = Math.floor(diffDays / 7);
        const day  = d.getDay();
        grid[4 - week][day]++;
      }
    });
  });
  return grid;
}

function heatLevel(n) {
  if (n === 0) return 'heatmap-cell-0';
  if (n <= 1)  return 'heatmap-cell-1';
  if (n <= 3)  return 'heatmap-cell-2';
  if (n <= 6)  return 'heatmap-cell-3';
  return 'heatmap-cell-4';
}

/* ── Card ── */
const Card = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 28, delay }}
    className={`bg-[var(--card-bg)] rounded-[12px] border border-[var(--border-color)] ${className}`}
    style={{ boxShadow: 'var(--shadow-sm)' }}
  >
    {children}
  </motion.div>
);

/* ── Custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[8px] px-3 py-2 text-[12px]" style={{ boxShadow: 'var(--shadow-md)' }}>
      <p className="font-semibold text-[var(--foreground)] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

/* ── Stat card ── */
const StatCard = ({ icon: Icon, label, value, delta, deltaUp, delay }) => (
  <Card delay={delay} className="p-5 card-lift">
    <div className="flex items-center justify-between mb-4">
      <div className="w-8 h-8 rounded-[6px] bg-[var(--border-color)]/60 flex items-center justify-center text-[var(--text-muted)]">
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      {delta && (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${deltaUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {deltaUp ? '▲' : '▼'} {delta}
        </span>
      )}
    </div>
    <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
    <p className="text-[36px] font-semibold tracking-tight text-[var(--foreground)] mt-0.5 animate-countUp" style={{ fontFamily: 'var(--font-display)' }}>
      {value}
    </p>
  </Card>
);

/* ── STATUS BADGE ── */
const getStatusBadge = (status) => {
  const map = {
    ACTIVE:                 'bg-emerald-50 text-emerald-700 border-emerald-100',
    DAY1_READY:             'bg-emerald-50 text-emerald-700 border-emerald-100',
    UNDER_REVIEW:           'bg-indigo-50 text-indigo-600 border-indigo-100',
    MANAGER_REVIEW:         'bg-violet-50 text-violet-600 border-violet-100',
    DOCUMENTS_PENDING:      'bg-amber-50 text-amber-600 border-amber-100',
    DOCUMENTS_SUBMITTED:    'bg-sky-50 text-sky-600 border-sky-100',
    PENDING_SIGNATURE:      'bg-amber-50 text-amber-600 border-amber-100',
    COMPLIANCE_PROCESSING:  'bg-sky-50 text-sky-600 border-sky-100',
    REJECTED:               'bg-red-50 text-red-500 border-red-100',
  };
  return map[status] || 'bg-[var(--border-color)] text-[var(--text-muted)] border-[var(--border-color)]';
};

/* ── CONFIDENCE ── */
const getConfidence = (emp) => {
  if (!emp.documents?.length) return { label: 'N/A', cls: 'text-[var(--text-faint)]' };
  const scores = emp.documents.map(d => d.ocrConfidence).filter(c => c != null);
  if (!scores.length) return { label: 'N/A', cls: 'text-[var(--text-faint)]' };
  const min = Math.min(...scores);
  if (min >= 0.85) return { label: 'High', cls: 'text-emerald-600' };
  if (min >= 0.60) return { label: 'Med',  cls: 'text-amber-500' };
  return { label: 'Low', cls: 'text-red-500' };
};

/* ════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
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
        if (session.user.role === 'MANAGER') {
          const mid = session.user.employeeId || session.user.id;
          setEmployees(data.filter(e => e.job?.managerId === mid));
        } else {
          setEmployees(data);
        }
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetchEmployees, 500);
    return () => clearTimeout(t);
  }, [session]);

  const role = session?.user?.role || 'NEW_HIRE';
  const name = session?.user?.name || 'User';

  const pipelineData = useMemo(() => buildPipelineData(employees), [employees]);
  const stageData    = useMemo(() => buildStageData(employees),    [employees]);
  const heatmap      = useMemo(() => buildHeatmap(employees),      [employees]);

  const pendingCount  = employees.filter(e => e.status === 'UNDER_REVIEW').length;
  const activeCount   = employees.filter(e => e.status === 'ACTIVE' || e.status === 'DAY1_READY').length;
  const totalCount    = employees.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded-[8px]" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-32 skeleton rounded-[12px]" />)}
        </div>
        <div className="h-64 skeleton rounded-[12px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-[10px] bg-red-50 border border-red-100 text-red-600 text-[14px]">
        <p className="font-semibold">Error loading dashboard</p>
        <p className="mt-1 text-[13px]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
            {role === 'HR' ? `Hi, ${name}` : `Manager View`}
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {role === 'HR' ? 'Verification queue and pipeline overview.' : 'Review and approve direct reports.'}
          </p>
        </div>
        {role === 'HR' && (
          <div className="flex gap-2">
            <Link href="/settings/invitations"
              className="h-9 px-4 rounded-[8px] border border-[var(--border-color)] text-[var(--foreground)] text-[13px] font-medium flex items-center hover:bg-[var(--border-color)]/40 transition-all">
              Invitations
            </Link>
            <Link href="/employees/new"
              className="h-9 px-4 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-all"
              id="new-employee-btn">
              <UserPlus className="w-3.5 h-3.5" /> Add Hire
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FileCheck} label="Pending Review"      value={pendingCount} delta="action needed" deltaUp={false} delay={0.04} />
        <StatCard icon={Users}     label="Total Candidates"    value={totalCount}   delta={`${activeCount} active`} deltaUp={true}  delay={0.08} />
        <StatCard icon={CheckCircle2} label="OCR Success Rate" value="94.2%"        delta="1.4%"         deltaUp={true}  delay={0.12} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline line chart */}
        <Card delay={0.16} className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Hire Pipeline</h2>
              <p className="text-[12px] text-[var(--text-muted)]">Last 6 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[var(--text-faint)]" />
          </div>
          {employees.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[13px] text-[var(--text-faint)]">No data yet — hire pipeline will appear here.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pipelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="Invited" stroke="#6366F1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Active"  stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Pending" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-3">
            {[['Invited','#6366F1'],['Active','#10B981'],['Pending','#F59E0B']].map(([l,c]) => (
              <span key={l} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </Card>

        {/* Donut chart */}
        <Card delay={0.20} className="p-5">
          <div className="mb-4">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Onboarding Stages</h2>
            <p className="text-[12px] text-[var(--text-muted)]">Current breakdown</p>
          </div>
          {stageData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[13px] text-[var(--text-faint)]">No stage data yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stageData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                    {stageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {stageData.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Activity Heatmap ── */}
      <Card delay={0.24} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Document Activity</h2>
            <p className="text-[12px] text-[var(--text-muted)]">Submissions over last 5 weeks</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span>Less</span>
            {['heatmap-cell-0','heatmap-cell-1','heatmap-cell-2','heatmap-cell-3','heatmap-cell-4'].map(c => (
              <span key={c} className={`w-3 h-3 rounded-[3px] ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {/* Day labels */}
          <div className="flex flex-col gap-1.5 pt-0.5 shrink-0">
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <span key={i} className="w-3 h-3 text-[9px] text-[var(--text-faint)] flex items-center justify-center">{d}</span>
            ))}
          </div>
          {/* Grid — columns = weeks, rows = days */}
          <div className="flex gap-1.5">
            {heatmap.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {week.map((val, di) => (
                  <div
                    key={di}
                    title={`${val} submission${val !== 1 ? 's' : ''}`}
                    className={`w-3 h-3 rounded-[3px] transition-all cursor-default ${heatLevel(val)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Verification Queue Table ── */}
      <Card delay={0.28} className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
            Verification Queue
          </h2>
          <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--background)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
            {employees.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[var(--text-faint)]">No candidates yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">
                  <th className="py-3 px-5">Candidate</th>
                  <th className="py-3 px-5 hidden sm:table-cell">Role</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 hidden md:table-cell">OCR</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {employees.map((emp, idx) => {
                  const conf = getConfidence(emp);
                  const initial = emp.personal?.name?.charAt(0).toUpperCase() || '?';
                  return (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + idx * 0.04 }}
                      className="hover:bg-[var(--background)] transition-colors text-[13px]"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--border-color)]/60 flex items-center justify-center text-[var(--foreground)] font-semibold text-[12px] shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)] leading-tight">{emp.personal?.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{emp.personal?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 hidden sm:table-cell">
                        <p className="text-[var(--foreground)]">{emp.job?.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{emp.job?.department}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-semibold border ${getStatusBadge(emp.status)}`}>
                          {emp.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`py-3.5 px-5 hidden md:table-cell text-[12px] font-semibold ${conf.cls}`}>
                        {conf.label}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="h-8 px-3.5 rounded-[6px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[12px] font-semibold inline-flex items-center gap-1 transition-all"
                          id={`review-btn-${emp.id}`}
                        >
                          Review <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
