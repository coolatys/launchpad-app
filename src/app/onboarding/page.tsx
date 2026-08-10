'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  FileText,
  Search,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  Briefcase,
  GraduationCap,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Form State
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.full_name || '',
    contact: user?.email || '',
    headline: '',
    education: '',
    skills: '',
    experience: '',
    interests: '',
    cv_master: '',
    job_queries: 'Graduate software engineer Nigeria\nEntry level frontend developer remote',
    scholarship_queries: 'MSc computer science scholarships Europe',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle plain-text CV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setProfile((prev) => ({
          ...prev,
          cv_master: text,
        }));
        setStatus('CV text successfully extracted from file!');
        setTimeout(() => setStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const payload = {
      ...profile,
      job_queries: profile.job_queries.split('\n').map((q) => q.trim()).filter(Boolean),
      scholarship_queries: profile.scholarship_queries.split('\n').map((q) => q.trim()).filter(Boolean),
    };

    try {
      const res = await fetch('/api/profile?type=user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save candidate onboarding profile.');

      // Trigger progressive background scan for user
      await fetch('/api/opportunities/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileType: 'user' }),
      });

      // Redirect to opportunities page with progressive scan
      router.push('/opportunities?scanning=true');
    } catch (err: any) {
      setStatus(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Step Indicator Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-navy flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-gold" />
              Welcome Onboard!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Set up your candidate profile to start automated job matching.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-navy/5 text-navy rounded-full border border-navy/10">
            Step {step} of 3
          </span>
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`h-2 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-gold' : 'bg-slate-200'}`} />
          <div className={`h-2 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-gold' : 'bg-slate-200'}`} />
          <div className={`h-2 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-gold' : 'bg-slate-200'}`} />
        </div>
      </div>

      {status && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{status}</span>
        </div>
      )}

      {/* Form Wizard Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-gold" />
              1. Basic Profile & Headline
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="e.g. Obaloluwa Akerele"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email / Phone *</label>
                <input
                  type="text"
                  required
                  name="contact"
                  value={profile.contact}
                  onChange={handleChange}
                  placeholder="email@example.com | +234..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Headline</label>
              <input
                type="text"
                name="headline"
                value={profile.headline}
                onChange={handleChange}
                placeholder="e.g. Mechanical Engineer | Embedded Systems Developer"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Education Background</label>
              <textarea
                rows={3}
                name="education"
                value={profile.education}
                onChange={handleChange}
                placeholder="Degrees, universities, graduating GPA or expected year..."
                className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                Next: CV & Resume
                <ArrowRight className="w-4 h-4 text-gold" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-gold" />
              2. Upload / Paste Resume Context
            </h2>
            <p className="text-xs text-slate-500">
              The Gemini AI agent will compare your resume text against every discovered job posting to compute your compatibility score.
            </p>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-300 hover:border-navy rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 transition">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Upload CV File (.txt / .doc / plain text)</p>
                <p className="text-xs text-slate-400">Click below to load text from your resume</p>
              </div>
              <input
                type="file"
                accept=".txt,.doc,.docx"
                onChange={handleFileUpload}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white hover:file:bg-navy-light cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Master CV Plain Text</label>
              <textarea
                rows={8}
                name="cv_master"
                value={profile.cv_master}
                onChange={handleChange}
                placeholder="Paste full plain text resume here..."
                className="w-full px-4 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-slate-50 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                Next: Search Target Queries
                <ArrowRight className="w-4 h-4 text-gold" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleFinishOnboarding} className="space-y-6">
            <h2 className="text-xl font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
              <Search className="w-5 h-5 text-gold" />
              3. Target Job & Scholarship Queries
            </h2>
            <p className="text-xs text-slate-500">
              Enter search keywords (one per line). The background crawler will search these across job portals and web sources.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Queries (One per line)</label>
                <textarea
                  rows={5}
                  name="job_queries"
                  value={profile.job_queries}
                  onChange={handleChange}
                  className="w-full px-4 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scholarship Queries (One per line)</label>
                <textarea
                  rows={5}
                  name="scholarship_queries"
                  value={profile.scholarship_queries}
                  onChange={handleChange}
                  className="w-full px-4 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-slate-50 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-navy hover:bg-navy-light text-white font-bold text-sm rounded-xl shadow-lg shadow-navy/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Launching AI Matching Scan...
                  </>
                ) : (
                  <>
                    Complete Onboarding & Start Scan
                    <CheckCircle2 className="w-5 h-5 text-gold" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
