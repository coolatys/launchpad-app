'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Save, Loader2, CheckCircle2, AlertCircle, Briefcase, GraduationCap } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { enablePushSubscription, disablePushSubscription } from '@/lib/pushSubscription';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, hasCompletedProfile } = useAuth();

  const [profile, setProfile] = useState({
    name: '',
    contact: '',
    headline: '',
    education: '',
    certifications: '',
    skills: '',
    experience: '',
    project: '',
    interests: '',
    cv_master: '',
    job_queries: '',
    scholarship_queries: '',
    location: '',
    search_preference: 'both',
    scheduled_scan_enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auth & Onboarding Redirect Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!hasCompletedProfile) {
        router.push('/onboarding');
      }
    }
  }, [user, authLoading, hasCompletedProfile, router]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/profile?user_id=${user.id}`);
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      if (data.profile) {
        setProfile({
          name: data.profile.full_name || data.profile.name || user?.user_metadata?.full_name || '',
          contact: data.profile.contact || user?.email || '',
          headline: data.profile.headline || '',
          education: data.profile.education || '',
          certifications: data.profile.certifications || '',
          skills: data.profile.skills || '',
          experience: data.profile.about_me || data.profile.experience || '',
          project: data.profile.project || '',
          interests: typeof data.profile.interests === 'object' ? JSON.stringify(data.profile.interests, null, 2) : (data.profile.interests || ''),
          cv_master: data.profile.cv_text || data.profile.cv_master || '',
          job_queries: Array.isArray(data.profile.job_queries) ? data.profile.job_queries.join('\n') : (data.profile.job_queries || ''),
          scholarship_queries: Array.isArray(data.profile.scholarship_queries) ? data.profile.scholarship_queries.join('\n') : (data.profile.scholarship_queries || ''),
          location: data.profile.location || '',
          search_preference: data.profile.search_preference || 'both',
          scheduled_scan_enabled: data.profile.scheduled_scan_enabled || false,
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const payload = {
      ...profile,
      user_id: user?.id,
      job_queries: profile.job_queries.split('\n').map(q => q.trim()).filter(Boolean),
      scholarship_queries: profile.scholarship_queries.split('\n').map(q => q.trim()).filter(Boolean),
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save profile');
      const data = await res.json();
      setStatus({ type: 'success', message: data.message || 'Profile saved successfully!' });
      
      setTimeout(() => setStatus(null), 4000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Loading candidate profile...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <User className="w-8 h-8 text-gold" />
            My Candidate Profile
          </h1>
          <p className="text-slate-500 mt-1">
            Configure your resume context and target search queries. The Gemini AI agent uses this profile to find and score matching postings for you.
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {status && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-4 duration-300 ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{status.type === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-sm opacity-90">{status.message}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-3">Basic Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={profile.name}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 text-sm"
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-semibold text-slate-700 mb-1">
                Contact Details <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="contact"
                name="contact"
                required
                value={profile.contact}
                onChange={handleChange}
                placeholder="e.g. email@example.com | +1 234 567 89"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="headline" className="block text-sm font-semibold text-slate-700 mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                id="headline"
                name="headline"
                value={profile.headline}
                onChange={handleChange}
                placeholder="e.g. Mechanical Engineer | Embedded Systems Developer"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 text-sm"
              />
            </div>
          </div>



          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-1">
                Target Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={profile.location}
                onChange={handleChange}
                placeholder="e.g. Lagos, Nigeria"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 text-sm"
              />
            </div>
            <div>
              <label htmlFor="search_preference" className="block text-sm font-semibold text-slate-700 mb-1">
                Search Preference
              </label>
              <select
                id="search_preference"
                name="search_preference"
                value={profile.search_preference}
                onChange={(e) => setProfile(prev => ({ ...prev, search_preference: e.target.value as any }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 text-sm bg-white"
              >
                <option value="both">Both (Jobs & Scholarships)</option>
                <option value="jobs">Jobs Only</option>
                <option value="scholarships">Scholarships Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="scheduled_scan_enabled"
                name="scheduled_scan_enabled"
                checked={profile.scheduled_scan_enabled}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  if (!user) return;
                  
                  try {
                    if (checked) {
                      await enablePushSubscription(user.id);
                      setStatus({ type: 'success', message: 'Auto Scan and Notifications enabled!' });
                    } else {
                      await disablePushSubscription(user.id);
                      setStatus({ type: 'success', message: 'Auto Scan disabled.' });
                    }
                    setProfile(prev => ({ ...prev, scheduled_scan_enabled: checked }));
                    setTimeout(() => setStatus(null), 4000);
                  } catch (err: any) {
                    // Revert and show error if permission denied
                    e.target.checked = !checked;
                    setStatus({ type: 'error', message: `Enable notifications to turn on Auto Scan (${err.message})` });
                  }
                }}
                className="w-5 h-5 text-navy rounded border-slate-300 focus:ring-navy"
              />
              <div>
                <label htmlFor="scheduled_scan_enabled" className="block text-sm font-semibold text-slate-700">
                  Enable Scheduled Scans
                </label>
                <p className="text-xs text-slate-500">Allow the AI to automatically run background scans for new matches.</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-3 pt-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gold" />
            Autonomous Search Queries
          </h2>
          <p className="text-xs text-slate-400 -mt-3">
            Enter one query per line. The browser agent will search Google, Indeed, and Reed for these.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="job_queries" className="block text-sm font-semibold text-slate-700 mb-1">
                Job Search Queries (One per line)
              </label>
              <textarea
                id="job_queries"
                name="job_queries"
                rows={4}
                value={profile.job_queries}
                onChange={handleChange}
                placeholder="e.g. Graduate mechanical engineering jobs Nigeria&#10;Entry level developer remote"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 resize-y font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="scholarship_queries" className="block text-sm font-semibold text-slate-700 mb-1">
                Scholarship Search Queries (One per line)
              </label>
              <textarea
                id="scholarship_queries"
                name="scholarship_queries"
                rows={4}
                value={profile.scholarship_queries}
                onChange={handleChange}
                placeholder="e.g. MSc mechanical engineering scholarships Europe&#10;Graduate scholarships UK"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 resize-y font-mono text-xs"
              />
            </div>
          </div>

          <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-3 pt-4">Core CV Sections</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="education" className="block text-sm font-semibold text-slate-700 mb-1">
                Education
              </label>
              <textarea
                id="education"
                name="education"
                rows={4}
                value={profile.education}
                onChange={handleChange}
                placeholder="List your degrees, universities, and graduation dates..."
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 resize-y text-sm"
              />
            </div>

            <div>
              <label htmlFor="certifications" className="block text-sm font-semibold text-slate-700 mb-1">
                Certifications
              </label>
              <textarea
                id="certifications"
                name="certifications"
                rows={4}
                value={profile.certifications}
                onChange={handleChange}
                placeholder="List professional courses, licenses, or credentials..."
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 resize-y text-sm"
              />
            </div>
          </div>

          <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-3 pt-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gold" />
            AI Match Context
          </h2>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="cv_master" className="block text-sm font-semibold text-slate-700 mb-1">
                Full Master CV / Resume Text
              </label>
              <textarea
                id="cv_master"
                name="cv_master"
                rows={8}
                value={profile.cv_master}
                onChange={handleChange}
                placeholder="Paste your full text CV here..."
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 transition duration-150 font-mono text-xs resize-y"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white font-semibold text-sm rounded-xl shadow-md flex items-center gap-2 transition duration-150 disabled:opacity-70 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-gold" />
                Save My Candidate Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
