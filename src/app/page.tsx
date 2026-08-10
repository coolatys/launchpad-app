'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  User,
  Search,
  Briefcase,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  ExternalLink,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface DashboardStats {
  scholarshipsAppliedCount: number;
  jobsAppliedCount: number;
  newMatchesCount: number;
  statusBreakdown: {
    to_apply: number;
    drafted: number;
    submitted: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  upcomingDeadlines: {
    id: string;
    title: string;
    org: string;
    kind: 'job' | 'scholarship';
    url: string;
    deadline: string;
    daysLeft: number;
    source: 'opportunity' | 'application';
  }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileNames, setProfileNames] = useState({ user: 'You', friend: 'Friend' });
  const [activeProfile, setActiveProfile] = useState<'all' | 'user' | 'friend'>('all');

  const fetchDashboardStats = async (profile: string) => {
    try {
      const res = await fetch(`/api/dashboard?profile=${profile}`);
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadNames() {
      try {
        const resUser = await fetch('/api/profile?type=user');
        const resFriend = await fetch('/api/profile?type=friend');
        const userJson = await resUser.json();
        const friendJson = await resFriend.json();
        setProfileNames({
          user: userJson.profile?.name || 'You',
          friend: friendJson.profile?.name || 'Friend',
        });
      } catch (err) {
        console.error('Error fetching names:', err);
      }
    }
    loadNames();
  }, []);

  useEffect(() => {
    fetchDashboardStats(activeProfile);
  }, [activeProfile]);

  const triggerScan = async () => {
    setScanning(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/opportunities/check?profile=${activeProfile}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to run scanning agent');
      const data = await res.json();
      
      setStatusMsg({
        type: 'success',
        message: `Scan started in the background! Watch your terminal console for live progress. Refresh the page in a few minutes to see new matches.`,
      });
      setTimeout(() => setStatusMsg(null), 8000);
      
      // Reload stats
      fetchDashboardStats(activeProfile);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Error running discovery agent.' });
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Assembling dashboard metrics...</span>
      </div>
    );
  }

  const breakdown = stats?.statusBreakdown || {
    to_apply: 0,
    drafted: 0,
    submitted: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };

  // Find max value in breakdown to scale graph bars
  const maxBreakdownCount = Math.max(...Object.values(breakdown), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Launchpad Control Center</h1>
          <p className="text-slate-500 mt-1">
            Track your job application pipeline, scholarship updates, and matches.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-5 py-2.5 bg-gold hover:bg-gold-light text-navy-dark font-bold rounded-xl shadow-md shadow-gold/10 flex items-center justify-center gap-2 transition duration-150 disabled:opacity-75 cursor-pointer"
          >
            {scanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Crawling Sources...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Scan Opportunities Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile Filter Selector */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start">
        <button
          onClick={() => setActiveProfile('all')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
            activeProfile === 'all' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Candidates
        </button>
        <button
          onClick={() => setActiveProfile('user')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
            activeProfile === 'user' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {profileNames.user.split(' ')[0]} (You)
        </button>
        <button
          onClick={() => setActiveProfile('friend')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
            activeProfile === 'friend' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {profileNames.friend.split(' ')[0]}
        </button>
      </div>

      {/* Notifications banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-4 duration-300 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${statusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
          <p className="text-sm font-medium">{statusMsg.message}</p>
        </div>
      )}

      {/* Top statistics tiles grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scholarships Applied */}
        <div className="bg-gradient-to-tr from-navy to-navy-light text-white p-6 rounded-2xl border border-navy-dark shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Scholarships Applied</p>
            <p className="text-4xl font-extrabold text-gold">{stats?.scholarshipsAppliedCount || 0}</p>
            <p className="text-[10px] text-slate-400">Stages: Submitted, Interview, Offer</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/15 text-gold">
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>

        {/* Jobs Applied */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jobs Applied</p>
            <p className="text-4xl font-extrabold text-navy">{stats?.jobsAppliedCount || 0}</p>
            <p className="text-[10px] text-slate-500">Stages: Submitted, Interview, Offer</p>
          </div>
          <div className="bg-navy/5 p-3 rounded-xl border border-navy/10 text-navy">
            <Briefcase className="w-8 h-8 text-gold" />
          </div>
        </div>

        {/* New Matches Review */}
        <Link
          href="/opportunities"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-gold transition duration-150 group cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Matches for Review</p>
            <p className="text-4xl font-extrabold text-navy group-hover:text-gold transition duration-150">
              {stats?.newMatchesCount || 0}
            </p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              Check new openings
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition duration-150 text-gold" />
            </p>
          </div>
          <div className="bg-navy/5 p-3 rounded-xl border border-navy/10 text-navy group-hover:bg-gold/10 group-hover:border-gold/25 transition duration-150">
            <Compass className="w-8 h-8 text-navy group-hover:text-gold" />
          </div>
        </Link>
      </div>

      {/* Middle row: Pipeline status graph and upcoming deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline stage breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy">Pipeline Stage Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of all applications currently in progress.</p>
          </div>

          <div className="space-y-4">
            {[
              { key: 'to_apply', label: 'To Apply', color: 'bg-slate-500' },
              { key: 'drafted', label: 'Materials Drafted', color: 'bg-amber-500' },
              { key: 'submitted', label: 'Submitted', color: 'bg-sky-500' },
              { key: 'interview', label: 'Interviewing', color: 'bg-indigo-500' },
              { key: 'offer', label: 'Offer Received', color: 'bg-emerald-500' },
              { key: 'rejected', label: 'Rejected', color: 'bg-rose-500' },
            ].map((stage) => {
              const count = breakdown[stage.key as keyof typeof breakdown] || 0;
              const pct = (count / maxBreakdownCount) * 100;
              return (
                <div key={stage.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{stage.label}</span>
                    <span className="text-slate-900">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${stage.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-bold text-navy">Upcoming Deadlines (Next 30 Days)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Opportunities and applications ordered soonest first.</p>
          </div>

          {(!stats?.upcomingDeadlines || stats.upcomingDeadlines.length === 0) ? (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-1">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-500 text-sm">No upcoming deadlines.</p>
              <p className="text-xs">Deadlines within 30 days will list here once detected.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-150 max-h-[300px] overflow-y-auto pr-1">
              {stats.upcomingDeadlines.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.kind === 'job'
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {item.kind}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {item.source}
                      </span>
                    </div>
                    <h3 className="font-bold text-navy text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 truncate">{item.org}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold ${
                      item.daysLeft <= 7
                        ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse'
                        : 'bg-slate-150 text-slate-700'
                    }`}>
                      {item.daysLeft}d left
                    </span>
                    <p className="text-[10px] text-slate-450 mt-1 font-medium">{item.deadline}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
