'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Loader2,
  Users,
  Compass,
  Briefcase,
  MessageSquare,
  Star,
  LogOut,
  AlertCircle,
  Sparkles,
  Search,
  Code,
  FileText,
  Clock,
  Play,
  CheckCircle2,
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  user_email: string;
  rating: number;
  type: string;
  comments: string;
  created_at: string;
}

interface StatsData {
  totalProfiles: number;
  totalOpportunities: number;
  totalApplications: number;
  totalFeedback: number;
}

export default function StandaloneAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'debug'>('overview');

  // Overview stats
  const [stats, setStats] = useState<StatsData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  // Per-User Debug Panel States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [rawProfile, setRawProfile] = useState<any>(null);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [matchedPostings, setMatchedPostings] = useState<any[]>([]);
  const [debugLoading, setDebugLoading] = useState(false);
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);

  const fetchOverviewStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setFeedback(data.feedback || []);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchUserDebugData = async (userId: string) => {
    setDebugLoading(true);
    try {
      const res = await fetch(`/api/admin/user-debug?user_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.usersList || []);
        setSelectedUser(data.selectedUserId || userId);
        setRawProfile(data.rawProfileData);
        setLastPayload(data.lastScanPayload);
        setLastResponse(data.lastScanResponse);
        setScanHistory(data.scanHistory || []);
        setMatchedPostings(data.matchedPostings || []);
      }
    } catch (e) {
      console.error('User debug fetch error:', e);
    } finally {
      setDebugLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'debug') {
      fetchUserDebugData(selectedUser);
    }
  }, [isAuthenticated, activeTab]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid admin password.');
      }

      setIsAuthenticated(true);
      fetchOverviewStats();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setIsAuthenticated(false);
    setPassword('');
  };

  const triggerUserScan = async () => {
    if (!selectedUser) return;
    setTriggeringScan(true);
    setScanStatusMsg(null);
    try {
      const res = await fetch('/api/opportunities/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser }),
      });

      if (!res.ok) throw new Error('Failed to trigger scan for user.');

      const data = await res.json();
      setScanStatusMsg(`Scan completed! ${data.newMatchesCount || 0} matches found.`);
      fetchUserDebugData(selectedUser);
    } catch (err: any) {
      setScanStatusMsg(`Error: ${err.message}`);
    } finally {
      setTriggeringScan(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Verifying admin credentials...</span>
      </div>
    );
  }

  // 1. Password Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6 text-center">
          <div className="bg-navy text-gold w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-navy">Launchpad Admin Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Enter password to access platform statistics and per-user debugging.</p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-navy hover:bg-navy-light text-white text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  Access Admin Control Center
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Admin Control Center
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-gold" />
            Admin Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">Platform analytics, user profile debugging, scan payloads, and raw responses.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-lg transition ${
                activeTab === 'overview' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Overview & Feedback
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-4 py-1.5 rounded-lg transition ${
                activeTab === 'debug' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Per-User Debug Panel
            </button>
          </div>

          <button
            onClick={handleAdminLogout}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Usage Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-navy/5 text-navy rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Registered Users</p>
                <p className="text-2xl font-bold text-navy">{stats?.totalProfiles || 0}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-gold/10 text-gold-dark rounded-xl">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Matches Found</p>
                <p className="text-2xl font-bold text-navy">{stats?.totalOpportunities || 0}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Drafted Applications</p>
                <p className="text-2xl font-bold text-navy">{stats?.totalApplications || 0}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Feedback Reports</p>
                <p className="text-2xl font-bold text-navy">{stats?.totalFeedback || 0}</p>
              </div>
            </div>
          </div>

          {/* Tester Feedback Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gold" />
                Tester Feedback & Bug Reports
              </h2>
              <span className="text-xs font-semibold text-slate-400">Total: {feedback.length}</span>
            </div>

            {feedback.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No feedback submissions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Comments</th>
                      <th className="py-3 px-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feedback.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.user_email}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <span>{item.rating}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{item.comments}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PER-USER DEBUG PANEL TAB */}
      {activeTab === 'debug' && (
        <div className="space-y-6 animate-in fade-in">
          {/* User Selector Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1">
                Select Candidate User for Deep Debugging
              </label>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  fetchUserDebugData(e.target.value);
                }}
                className="w-full md:w-80 px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none font-semibold text-slate-800"
              >
                {usersList.map((u) => (
                  <option key={u.id || u.user_id} value={u.user_id || u.contact}>
                    {u.full_name || 'Candidate'} ({u.contact || u.user_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {scanStatusMsg && <span className="text-xs font-bold text-emerald-700">{scanStatusMsg}</span>}
              <button
                onClick={triggerUserScan}
                disabled={triggeringScan}
                className="px-5 py-2.5 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {triggeringScan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Scan...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-gold fill-gold" />
                    Trigger Scan for Selected User
                  </>
                )}
              </button>
            </div>
          </div>

          {debugLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-navy animate-spin" />
              <span className="ml-3 text-slate-600 font-medium">Loading user raw debug data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Raw Profile Data */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText className="w-4 h-4 text-gold" />
                  Raw Profile Data (Exact Database Output)
                </h3>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(rawProfile, null, 2) || 'No profile row found for this user.'}
                </pre>
              </div>

              {/* 2. Last Scan Payload */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Code className="w-4 h-4 text-gold" />
                  Last Scan Payload (Sent to Search Engine)
                </h3>
                <pre className="bg-slate-900 text-sky-300 p-4 rounded-xl font-mono text-[11px] max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(lastPayload, null, 2) || 'No scan payload recorded yet.'}
                </pre>
              </div>

              {/* 3. Last Scan Response */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  Last Scan Raw Response (Before Ranking/Filtering)
                </h3>
                <pre className="bg-slate-900 text-amber-300 p-4 rounded-xl font-mono text-[11px] max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(lastResponse, null, 2) || 'No raw scan response recorded yet.'}
                </pre>
              </div>

              {/* 4. Scan History (scan_runs Table) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Clock className="w-4 h-4 text-gold" />
                  Scan History Timeline (scan_runs Audit Log)
                </h3>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {scanHistory.length === 0 ? (
                    <p className="text-xs text-slate-400">No scan runs recorded for this user.</p>
                  ) : (
                    scanHistory.map((run) => (
                      <div key={run.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className={`capitalize ${run.status === 'completed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {run.status} — {run.new_matches_count || 0} matches
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(run.started_at).toLocaleString()}</span>
                        </div>
                        {run.error_message && <p className="text-rose-600 text-[11px]">{run.error_message}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
