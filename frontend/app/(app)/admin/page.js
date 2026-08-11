'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { request } from '../../../lib/apiClient';
import { 
  Shield, UserPlus, Mail, Key, ShieldCheck, 
  Loader2, CheckCircle2, AlertCircle, Users, Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPanel() {
  const { data: session } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MANAGER');
  const [employeeId, setEmployeeId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await request('/auth/system-users', { method: 'GET' }, session);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch system users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      if (session.user.role !== 'HR') {
        router.replace('/dashboard');
        return;
      }
      fetchUsers();
    }
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage(null);

    try {
      await request('/auth/create-system-user', {
        method: 'POST',
        body: JSON.stringify({
          email,
          pass: password,
          role,
          employeeId: employeeId.trim() || undefined,
        }),
      }, session);

      setActionMessage({ text: `System user (${role}) created successfully!`, type: 'success' });
      // Reset form
      setEmail('');
      setPassword('');
      setEmployeeId('');
      // Refetch
      fetchUsers();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to create user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        <p className="text-[var(--text-muted)] text-[13px]">Loading system users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-[16px] border border-emerald-100/60 bg-white/90 p-6 shadow-sm shadow-emerald-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-[12px] bg-emerald-50 text-emerald-600 border border-emerald-100/40 flex items-center justify-center shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-neutral-800" style={{ fontFamily: 'var(--font-display)' }}>
              System Admin Control Panel
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Create and manage credentials for HR members and Hiring Managers.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-[12px] border text-xs flex justify-between items-center ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-600'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-semibold">{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="font-bold hover:opacity-80 text-[10px] ml-3 uppercase text-emerald-600"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Create Form */}
        <div className="lg:col-span-1 p-5.5 bg-white/90 backdrop-blur-sm border border-emerald-100/60 rounded-[16px] shadow-sm shadow-emerald-500/5 h-fit">
          <h2 className="text-[15px] font-bold mb-4 border-b border-emerald-100/60 pb-3 flex items-center gap-2 text-neutral-800" style={{ fontFamily: 'var(--font-display)' }}>
            <UserPlus className="w-4 h-4 text-emerald-600" />
            Add System User
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-emerald-100 bg-[var(--background)] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <Key className="w-3.5 h-3.5 text-neutral-400 absolute left-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-emerald-100 bg-[var(--background)] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs"
                  required
                />
              </div>
            </div>

            {/* Role dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Access Role</label>
              <div className="relative flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 absolute left-3" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-emerald-100 bg-[var(--background)] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs appearance-none cursor-pointer"
                >
                  <option value="MANAGER">MANAGER (Hiring Manager)</option>
                  <option value="HR">HR (System HR Administrator)</option>
                </select>
              </div>
            </div>

            {/* User/Employee ID input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex justify-between">
                <span>Unique User/Employee ID</span>
                <span className="text-[9px] font-normal lowercase text-neutral-400">(optional)</span>
              </label>
              <div className="relative flex items-center">
                <Hash className="w-3.5 h-3.5 text-neutral-400 absolute left-3" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={role === 'MANAGER' ? 'e.g. mgr_4' : 'e.g. hr_3'}
                  className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-emerald-100 bg-[var(--background)] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs"
                />
              </div>
              <p className="text-[10px] text-neutral-400">
                Managers must have distinct IDs (e.g. `mgr_1`, `mgr_2`). If left blank, a random unique UUID is assigned.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full h-10 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Access Credentials
                </>
              )}
            </button>

          </form>
        </div>

        {/* Right Column: Existing User List */}
        <div className="lg:col-span-2 p-5.5 bg-white/90 backdrop-blur-sm border border-emerald-100/60 rounded-[16px] shadow-sm shadow-emerald-500/5">
          <h2 className="text-[15px] font-bold mb-4 border-b border-emerald-100/60 pb-3 flex items-center gap-2 text-neutral-800" style={{ fontFamily: 'var(--font-display)' }}>
            <Users className="w-4 h-4 text-emerald-600" />
            System Authentication Directory
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-500/5 text-emerald-800 font-bold border-b border-emerald-100/60">
                  <th className="py-3 px-4 rounded-l-lg">User Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Employee/Manager ID</th>
                  <th className="py-3 px-4 rounded-r-lg">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/40 text-neutral-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-neutral-400 italic">No system users found.</td>
                  </tr>
                ) : (
                  users.map((usr) => (
                    <tr key={usr.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">{usr.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          usr.role === 'HR' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-violet-50 text-violet-700 border-violet-100'
                        }`}>
                          {usr.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500">
                        {usr.employeeId || <span className="italic text-neutral-400 text-[10px]">None</span>}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">
                        {new Date(usr.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
