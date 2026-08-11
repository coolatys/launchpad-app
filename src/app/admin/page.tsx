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

  const [stats, setStats] = useState<StatsData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchAdminData = async () => {
    setDataLoading(true);
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
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

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
      fetchAdminData();
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
            <p className="text-xs text-slate-500 mt-1">Enter your admin password to access system analytics and tester feedback.</p>
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
                  Access Admin Dashboard
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Admin Dashboard View
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-gold" />
            Admin Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">Platform analytics, user profile counts, and tester feedback reports.</p>
        </div>

        <button
          onClick={handleAdminLogout}
          className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Admin Logout
        </button>
      </div>

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold" />
            Tester Feedback & Bug Reports
          </h2>
          <span className="text-xs font-semibold text-slate-400">Total: {feedback.length}</span>
        </div>

        {feedback.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No feedback submissions recorded yet.
          </div>
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
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
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
  );
}
