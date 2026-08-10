'use client';

import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clipboard,
  CheckCircle,
  FileText,
  Clock,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Application } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'to_apply', label: 'To Apply' },
  { value: 'drafted', label: 'Drafted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview', label: 'Interviewing' },
  { value: 'offer', label: 'Offer Received' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileFilter, setProfileFilter] = useState<'all' | 'user' | 'friend'>('all');
  const [profileNames, setProfileNames] = useState({ user: 'You', friend: 'Friend' });

  // Local state for editing notes
  const [notesLocal, setNotesLocal] = useState<{ [key: string]: string }>({});

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setApplications(data.applications || []);
      
      // Initialize notes local state
      const notesMap: { [key: string]: string } = {};
      data.applications?.forEach((app: Application) => {
        notesMap[app.id!] = app.notes || '';
      });
      setNotesLocal(notesMap);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

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
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, elementId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(elementId);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const updateAppStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      // Update local state
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus as any } : app))
      );
      
      setStatusMsg({ type: 'success', message: 'Pipeline status updated.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    }
  };

  const handleNotesChange = (id: string, val: string) => {
    setNotesLocal((prev) => ({ ...prev, [id]: val }));
  };

  const saveNotes = async (id: string) => {
    setSavingNotesId(id);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: notesLocal[id] }),
      });

      if (!res.ok) throw new Error('Failed to save notes');
      
      setStatusMsg({ type: 'success', message: 'Notes saved.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setSavingNotesId(null);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to remove this application from your pipeline?')) return;

    try {
      const res = await fetch(`/api/applications?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete application');

      setApplications((prev) => prev.filter((app) => app.id !== id));
      setStatusMsg({ type: 'success', message: 'Application removed.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    }
  };

  const handleOfficialApply = (id: string, url: string) => {
    // Open posting
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Automatically transition to submitted or ask the user
    if (confirm('Did you complete the submission? Click OK to automatically transition this application to "Submitted" status.')) {
      updateAppStatus(id, 'submitted');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'to_apply': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'drafted': return 'bg-amber-50 text-gold-dark border-gold/30';
      case 'submitted': return 'bg-sky-50 text-sky-700 border-sky-250';
      case 'interview': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'offer': return 'bg-emerald-50 text-emerald-700 border-emerald-250 font-bold';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Loading applications tracker...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-gold" />
          Application Pipeline Tracker
        </h1>
        <p className="text-slate-500 mt-1">
          Review tailored cover letters, refine bullets, copy application material, and track recruitment progress.
        </p>
      </div>

      {/* Profile Filter Switcher */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start mt-6 text-xs">
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

      {/* Alert banner */}
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

      {/* Applications list */}
      {(() => {
        const filteredApps = applications.filter((app: any) => {
          if (profileFilter === 'all') return true;
          const dedupeKey = app.opportunities?.dedupe_key || '';
          const owner = dedupeKey.startsWith('friend:') ? 'friend' : 'user';
          return owner === profileFilter;
        });

        if (filteredApps.length === 0) {
          return (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 space-y-4">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <h2 className="text-lg font-bold text-slate-700">Pipeline is empty.</h2>
              <p className="text-sm max-w-md mx-auto">
                No active applications found for this filter. Go to the **Opportunities** tab, shortlist matching postings, and click &ldquo;Draft Application&rdquo; to prompt Gemini to build customized cover letters and tailored CV achievements.
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 gap-6">
            {filteredApps.map((app) => {
            const isExpanded = expandedApps.has(app.id!);
            const noteValue = notesLocal[app.id!] || '';
            const cvBullets = app.tailored_bullets || '';
            const motivationLetter = app.tailored_letter || '';
            
            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-350 transition duration-150 flex flex-col"
              >
                {/* Upper Details */}
                <div className="p-6 flex flex-col md:flex-row md:items-start gap-6">
                  {/* Status Picker & Icon */}
                  <div className="flex flex-col gap-3 sm:w-44 shrink-0">
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold text-center uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                      {app.status.replace('_', ' ')}
                    </div>
                    
                    <select
                      value={app.status}
                      onChange={(e) => updateAppStatus(app.id!, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy outline-none text-slate-800"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        app.kind === 'job'
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {app.kind}
                      </span>
                      {app.opportunities?.dedupe_key && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          app.opportunities.dedupe_key.startsWith('friend:')
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          For: {app.opportunities.dedupe_key.startsWith('friend:') ? profileNames.friend.split(' ')[0] : profileNames.user.split(' ')[0]}
                        </span>
                      )}
                      {app.deadline && app.deadline !== 'N/A' && (
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Deadline: {app.deadline}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-navy">{app.title}</h2>
                    <p className="text-sm font-semibold text-slate-700">{app.org}</p>

                    {/* Summary snippet */}
                    {app.tailored_summary && (
                      <p className="text-xs text-slate-500 leading-relaxed italic bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                        &ldquo;{app.tailored_summary}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Collapsible Application Materials */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-4 border-t border-slate-150 space-y-6 bg-slate-50/30">
                    {/* Tailored CV Bullets */}
                    {cvBullets && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1">
                            <Briefcase className="w-4 h-4 text-gold" />
                            Tailored CV Achievement Bullets
                          </h4>
                          <button
                            onClick={() => copyToClipboard(cvBullets, `${app.id}-bullets`)}
                            className="text-xs text-navy hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedTextId === `${app.id}-bullets` ? 'Copied!' : 'Copy Bullets'}
                          </button>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
                          {cvBullets.split('\n').filter(Boolean).map((bullet, idx) => (
                            <p key={idx} className="flex gap-2">
                              <span className="text-gold font-bold">&bull;</span>
                              <span>{bullet}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Motivation Letter */}
                    {motivationLetter && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1">
                            <FileText className="w-4 h-4 text-gold" />
                            Tailored Motivation Letter (Capped &lt; 180 Words)
                          </h4>
                          <button
                            onClick={() => copyToClipboard(motivationLetter, `${app.id}-letter`)}
                            className="text-xs text-navy hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedTextId === `${app.id}-letter` ? 'Copied!' : 'Copy Letter'}
                          </button>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                          {motivationLetter}
                        </div>
                      </div>
                    )}

                    {/* Personal Notes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-navy uppercase tracking-wider">
                          Recruitment Logs & Interview Notes
                        </h4>
                        <button
                          onClick={() => saveNotes(app.id!)}
                          disabled={savingNotesId === app.id}
                          className="text-xs text-navy hover:underline flex items-center gap-1 cursor-pointer font-semibold disabled:opacity-50"
                        >
                          {savingNotesId === app.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5 text-gold" />
                          )}
                          Save Notes
                        </button>
                      </div>
                      <textarea
                        value={noteValue}
                        onChange={(e) => handleNotesChange(app.id!, e.target.value)}
                        placeholder="Log interview dates, contacts, application follow-ups, or reference notes..."
                        rows={3}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-navy outline-none text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                  <button
                    onClick={() => toggleExpand(app.id!)}
                    className="text-xs font-semibold text-navy hover:text-navy-light flex items-center gap-1.5 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        Hide Materials
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        View Materials & Logs
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => deleteApplication(app.id!)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-150 transition duration-150 cursor-pointer"
                      title="Remove Application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOfficialApply(app.id!, app.url)}
                      className="px-4 py-2 bg-navy hover:bg-navy-light text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition duration-150"
                    >
                      Apply on Official Site
                      <ExternalLink className="w-3.5 h-3.5 text-gold" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
}
