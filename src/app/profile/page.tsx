'use client';

import React, { useEffect, useState } from 'react';
import { User, Save, Loader2, CheckCircle2, AlertCircle, Briefcase, GraduationCap } from 'lucide-react';

export default function ProfilePage() {
  const [profileType, setProfileType] = useState<'user' | 'friend'>('user');
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load profile when profileType changes
  const fetchProfile = async (type: 'user' | 'friend') => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/profile?type=${type}`);
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      if (data.profile) {
        setProfile({
          name: data.profile.name || '',
          contact: data.profile.contact || '',
          headline: data.profile.headline || '',
          education: data.profile.education || '',
          certifications: data.profile.certifications || '',
          skills: data.profile.skills || '',
          experience: data.profile.experience || '',
          project: data.profile.project || '',
          interests: data.profile.interests || '',
          cv_master: data.profile.cv_master || '',
          job_queries: Array.isArray(data.profile.job_queries) ? data.profile.job_queries.join('\n') : (data.profile.job_queries || ''),
          scholarship_queries: Array.isArray(data.profile.scholarship_queries) ? data.profile.scholarship_queries.join('\n') : (data.profile.scholarship_queries || ''),
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(profileType);
  }, [profileType]);

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
      job_queries: profile.job_queries.split('\n').map(q => q.trim()).filter(Boolean),
      scholarship_queries: profile.scholarship_queries.split('\n').map(q => q.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(`/api/profile?type=${profileType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save profile');
      const data = await res.json();
      setStatus({ type: 'success', message: data.message || 'Profile saved successfully!' });
      
      // Auto clear success message after 4 seconds
      setTimeout(() => setStatus(null), 4000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <User className="w-8 h-8 text-gold" />
            Candidate Search Profiles
          </h1>
          <p className="text-slate-500 mt-1">
            Configure the resume context and search queries. The Gemini browser agent uses these profiles to find, score, and customize listings.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setProfileType('user')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              profileType === 'user' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Profile (You)
          </button>
          <button
            onClick={() => setProfileType('friend')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              profileType === 'friend' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Friend's Profile
          </button>
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

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
          <span className="ml-3 text-slate-600 font-medium">Loading profile from profiles.json...</span>
        </div>
      ) : (
        /* Form */
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150"
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
                  placeholder="e.g. Aspiring Software Engineer | Civil Engineering Graduate"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150"
                />
              </div>
            </div>

            <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-3 pt-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gold" />
              Autonomous Search Queries
            </h2>
            <p className="text-xs text-slate-400 -mt-3">
              Enter one query per line. The browser agent will navigate Google, Indeed, and LinkedIn to search these.
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
                  placeholder="e.g. Graduate mechanical engineering jobs Nigeria&#10;Entry level mechanical designer remote"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y font-mono text-sm"
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
                  placeholder="e.g. MSc mechanical engineering scholarships Europe&#10;Graduate engineering scholarships Japan"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y font-mono text-sm"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="skills" className="block text-sm font-semibold text-slate-700 mb-1">
                  Key Skills
                </label>
                <textarea
                  id="skills"
                  name="skills"
                  rows={4}
                  value={profile.skills}
                  onChange={handleChange}
                  placeholder="List technical and soft skills, e.g. Python, Project Management, Data Analysis..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y"
                />
              </div>

              <div>
                <label htmlFor="interests" className="block text-sm font-semibold text-slate-700 mb-1">
                  Interests & Focus Areas
                </label>
                <textarea
                  id="interests"
                  name="interests"
                  rows={4}
                  value={profile.interests}
                  onChange={handleChange}
                  placeholder="List topics you are passionate about, e.g. Humanitarian Aid, Climate Action, Renewable Energy..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="experience" className="block text-sm font-semibold text-slate-700 mb-1">
                  Professional Experience
                </label>
                <textarea
                  id="experience"
                  name="experience"
                  rows={6}
                  value={profile.experience}
                  onChange={handleChange}
                  placeholder="Detail past jobs, internships, or volunteer roles. Include achievements..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y"
                />
              </div>

              <div>
                <label htmlFor="project" className="block text-sm font-semibold text-slate-700 mb-1">
                  Featured Projects
                </label>
                <textarea
                  id="project"
                  name="project"
                  rows={6}
                  value={profile.project}
                  onChange={handleChange}
                  placeholder="Highlight personal or professional projects (tools built, problems solved)..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 resize-y"
                />
              </div>
            </div>

            <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-3 pt-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gold" />
              AI Search Context
            </h2>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="cv_master" className="block text-sm font-semibold text-slate-700 mb-1">
                  Full Master CV / Resume Text
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Paste your entire plain-text resume here. It will be sent to Gemini to generate custom-tailored bullet points and motivation letters matching specific postings.
                </p>
                <textarea
                  id="cv_master"
                  name="cv_master"
                  rows={10}
                  value={profile.cv_master}
                  onChange={handleChange}
                  placeholder="Paste your full text CV here..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800 transition duration-150 font-mono text-sm resize-y"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white font-semibold rounded-xl shadow-md shadow-navy/10 flex items-center gap-2 transition duration-150 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 text-gold" />
                  Save Profile (As {profileType === 'user' ? 'My Profile' : "Friend's Profile"})
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

