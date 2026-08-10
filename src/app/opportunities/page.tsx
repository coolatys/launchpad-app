'use client';

import React, { useEffect, useState } from 'react';
import {
  Compass,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  AlertCircle,
  Undo2,
  Briefcase,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { Opportunity } from '@/lib/types';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'new' | 'shortlisted' | 'dismissed'>('new');
  const [expandedOpps, setExpandedOpps] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileFilter, setProfileFilter] = useState<'all' | 'user' | 'friend'>('all');
  const [profileNames, setProfileNames] = useState({ user: 'You', friend: 'Friend' });

  // Phase 4 states
  const [tailoringId, setTailoringId] = useState<string | null>(null);

  // Phase 6: Manual Entry states
  const [showManualForm, setShowManualForm] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    kind: 'job' as 'job' | 'scholarship',
    title: '',
    org: '',
    location: '',
    url: '',
    description: '',
    deadline: '',
    profileType: 'user' as 'user' | 'friend',
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scanFinished, setScanFinished] = useState(false);

  const fetchOpportunities = async (filter: 'new' | 'shortlisted' | 'dismissed', profile: 'all' | 'user' | 'friend') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities?status=${filter}&profile=${profile}`);
      if (!res.ok) throw new Error('Failed to load opportunities');
      const data = await res.json();
      
      // Ensure sorted by fit_score DESC
      const sorted = (data.opportunities || []).sort((a: Opportunity, b: Opportunity) => {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        return scoreB - scoreA;
      });

      setOpportunities(sorted);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Progressive scan polling effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/opportunities/poll?profile=${profileFilter}`);
          if (res.ok) {
            const data = await res.json();
            const sorted = (data.opportunities || []).sort((a: Opportunity, b: Opportunity) => {
              const scoreA = a.fit_score ?? -1;
              const scoreB = b.fit_score ?? -1;
              return scoreB - scoreA;
            });
            setOpportunities(sorted);
            setScanCount(sorted.length);
          }
        } catch (e) {
          console.log('Polling error:', e);
        }
      }, 3000);

      // Automatically finish scan after 25 seconds of progressive polling
      const timeout = setTimeout(() => {
        setIsScanning(false);
        setScanFinished(true);
        setTimeout(() => setScanFinished(false), 6000);
      }, 25000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isScanning, profileFilter]);

  useEffect(() => {
    fetchOpportunities(statusFilter, profileFilter);
  }, [statusFilter, profileFilter]);

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

  const toggleExpand = (id: string) => {
    setExpandedOpps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const updateOppStatus = async (id: string, newStatus: 'new' | 'shortlisted' | 'dismissed') => {
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      setStatusMsg({ type: 'success', message: `Opportunity moved to ${newStatus}.` });
      setTimeout(() => setStatusMsg(null), 3000);
      
      fetchOpportunities(statusFilter, profileFilter);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    }
  };

  const draftApplication = async (oppId: string) => {
    setTailoringId(oppId);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: oppId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to draft application');
      }

      setStatusMsg({
        type: 'success',
        message: 'Application drafted! Check the Applications tab to view tailored summary, CV bullets, and motivation letter.',
      });
      setTimeout(() => setStatusMsg(null), 6000);
      
      fetchOpportunities(statusFilter, profileFilter);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setTailoringId(null);
    }
  };

  const runAgentCheck = async () => {
    setChecking(true);
    setIsScanning(true);
    setScanFinished(false);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/opportunities/check?profile=${profileFilter}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to run agent scan');
      
      setStatusMsg({
        type: 'success',
        message: `Progressive AI web scan initiated! Matches will populate live below as they are found.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
      setIsScanning(false);
    } finally {
      setChecking(false);
    }
  };

  // Phase 6: Submit Manual Entry
  const handleManualFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitManualOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingManual(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add manual opportunity');
      }

      setStatusMsg({
        type: 'success',
        message: 'Manual opportunity added and automatically scored by Gemini!',
      });
      setTimeout(() => setStatusMsg(null), 5000);

      // Reset form and collapse
      setManualForm({
        kind: 'job',
        title: '',
        org: '',
        location: '',
        url: '',
        description: '',
        deadline: '',
        profileType: 'user',
      });
      setShowManualForm(false);
      
      // Refresh listings
      fetchOpportunities(statusFilter, profileFilter);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setSubmittingManual(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (score >= 75) return 'bg-amber-50 text-gold-dark border-gold/30';
    if (score >= 60) return 'bg-navy/5 text-navy border-navy/20';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <Compass className="w-8 h-8 text-gold animate-pulse" />
            Discovered Opportunities
          </h1>
          <p className="text-slate-500 mt-1">
            Matches analyzed and scored by Gemini based on your profile alignment.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="px-5 py-2.5 bg-white border border-slate-350 hover:bg-slate-50 text-navy font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition duration-150 cursor-pointer shrink-0"
          >
            {showManualForm ? (
              <>
                <X className="w-5 h-5 text-rose-500" />
                Close Form
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-gold" />
                Add Manually
              </>
            )}
          </button>

          <button
            onClick={runAgentCheck}
            disabled={checking}
            className="px-5 py-2.5 bg-navy hover:bg-navy-light text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition duration-150 disabled:opacity-75 cursor-pointer shrink-0"
          >
            {checking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning & Scoring...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-gold" />
                Scan Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Entry Form */}
      {showManualForm && (
        <form
          onSubmit={submitManualOpportunity}
          className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-navy flex items-center gap-2">
              <Plus className="w-5 h-5 text-gold" />
              Add Opportunity Manually
            </h2>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="profileType" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Candidate <span className="text-rose-500">*</span>
              </label>
              <select
                id="profileType"
                name="profileType"
                value={manualForm.profileType}
                onChange={handleManualFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              >
                <option value="user">{profileNames.user.split(' ')[0]} (You)</option>
                <option value="friend">{profileNames.friend.split(' ')[0]}</option>
              </select>
            </div>

            <div>
              <label htmlFor="kind" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Opportunity Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="kind"
                name="kind"
                value={manualForm.kind}
                onChange={handleManualFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              >
                <option value="job">Job</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={manualForm.title}
                onChange={handleManualFormChange}
                placeholder="e.g. Chevening Scholarship, Junior Developer"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="org" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Organization / Employer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="org"
                name="org"
                required
                value={manualForm.org}
                onChange={handleManualFormChange}
                placeholder="e.g. UK Foreign Office, Acme Corp"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={manualForm.location}
                onChange={handleManualFormChange}
                placeholder="e.g. London, Remote, Worldwide"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Deadline (YYYY-MM-DD)
              </label>
              <input
                type="text"
                id="deadline"
                name="deadline"
                value={manualForm.deadline}
                onChange={handleManualFormChange}
                placeholder="e.g. 2026-11-01 or N/A"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="url" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Posting / Official URL <span className="text-rose-500">*</span>
            </label>
              <input
                type="url"
                id="url"
                name="url"
                required
                value={manualForm.url}
                onChange={handleManualFormChange}
                placeholder="e.g. https://www.chevening.org/apply"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs"
              />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Requirements
            </label>
            <p className="text-[10px] text-slate-450 mb-1.5">
              Paste the requirements or description. Gemini will read this to calculate your fit score.
            </p>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={manualForm.description}
              onChange={handleManualFormChange}
              placeholder="Paste requirements, eligibility criteria, or details..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-xs resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingManual}
              className="px-5 py-2 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition duration-150 disabled:opacity-70"
            >
              {submittingManual ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scoring & Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-gold" />
                  Save manually
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tabs / Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 gap-4 pb-2 sm:pb-0">
        <div className="flex">
          {(['new', 'shortlisted', 'dismissed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 capitalize transition-all duration-200 cursor-pointer ${
                statusFilter === tab
                  ? 'border-gold text-navy font-bold'
                  : 'border-transparent text-slate-500 hover:text-navy hover:border-slate-350'
              }`}
            >
              {tab} Matches
            </button>
          ))}
        </div>

        {/* Profile Filter Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
          <button
            onClick={() => setProfileFilter('all')}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition duration-150 cursor-pointer ${
              profileFilter === 'all' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Candidates
          </button>
          <button
            onClick={() => setProfileFilter('user')}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition duration-150 cursor-pointer ${
              profileFilter === 'user' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {profileNames.user.split(' ')[0]} (You)
          </button>
          <button
            onClick={() => setProfileFilter('friend')}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition duration-150 cursor-pointer ${
              profileFilter === 'friend' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {profileNames.friend.split(' ')[0]}
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-4 duration-300 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">{statusMsg.message}</p>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
          <span className="ml-3 text-slate-500 font-semibold">Loading matching opportunities...</span>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 space-y-3">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">No matches found in this category.</p>
          <p className="text-sm max-w-md mx-auto">
            Try clicking the &ldquo;Scan Now&rdquo; button above to trigger the discovery agent to query your sources and search for matching opportunities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {opportunities.map((opp) => {
            const isExpanded = expandedOpps.has(opp.id!);
            const score = opp.fit_score;
            
            return (
              <div
                key={opp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition duration-150 flex flex-col"
              >
                {/* Upper section */}
                <div className="p-6 flex flex-col md:flex-row md:items-start gap-5">
                  {/* Score badge */}
                  <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-sm ${getScoreColor(score)}`}>
                    <span className="text-2xl font-extrabold">{score !== null ? score : '--'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">FIT SCORE</span>
                  </div>

                  {/* Body text */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        opp.kind === 'job'
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {opp.kind}
                      </span>
                      {opp.dedupe_key && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          opp.dedupe_key.startsWith('friend:')
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          For: {opp.dedupe_key.startsWith('friend:') ? profileNames.friend.split(' ')[0] : profileNames.user.split(' ')[0]}
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded border border-slate-150 capitalize font-medium">
                        Provider: {opp.provider}
                      </span>
                      {opp.deadline && opp.deadline !== 'N/A' && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Deadline: {opp.deadline}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-navy">{opp.title}</h2>
                    <p className="text-sm font-semibold text-slate-700">{opp.org} &bull; <span className="text-slate-500 font-medium">{opp.location}</span></p>

                    {/* Fit reasons */}
                    {opp.fit_reasons && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 mt-3">
                        <p className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-gold" />
                          Gemini Fit Analysis
                        </p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {opp.fit_reasons.split('\n').filter(Boolean).map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/50">
                    <div>
                      <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">Role Description</h4>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-white p-4 rounded-xl border border-slate-200 max-h-80 overflow-y-auto">
                        {opp.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                  <button
                    onClick={() => toggleExpand(opp.id!)}
                    className="text-xs font-semibold text-navy hover:text-navy-light flex items-center gap-1.5 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        Hide Details
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Show Details
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {statusFilter === 'new' && (
                      <>
                        <button
                          onClick={() => updateOppStatus(opp.id!, 'dismissed')}
                          className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition duration-150"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          Dismiss
                        </button>
                        <button
                          onClick={() => updateOppStatus(opp.id!, 'shortlisted')}
                          className="px-3.5 py-1.5 bg-navy hover:bg-navy-light text-white font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition duration-150"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                          Shortlist
                        </button>
                      </>
                    )}

                    {statusFilter === 'shortlisted' && (
                      <>
                        <button
                          onClick={() => updateOppStatus(opp.id!, 'dismissed')}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition duration-150"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          Dismiss
                        </button>
                        <button
                          onClick={() => draftApplication(opp.id!)}
                          disabled={tailoringId !== null}
                          className="px-3.5 py-1.5 bg-gold hover:bg-gold-light text-navy-dark font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition duration-150 disabled:opacity-50"
                        >
                          {tailoringId === opp.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Drafting...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              Draft Application
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {statusFilter === 'dismissed' && (
                      <button
                        onClick={() => updateOppStatus(opp.id!, 'new')}
                        className="px-3 py-1.5 bg-navy hover:bg-navy-light text-white font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition duration-150"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-gold" />
                        Restore to New
                      </button>
                    )}

                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-white border border-slate-350 hover:bg-slate-50 text-navy font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition duration-150 shadow-sm"
                    >
                      Official Site
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
