'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  FileText,
  Compass,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  Briefcase,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasCompletedProfile, setHasCompletedProfile } = useAuth();

  // Guard: if user is not logged in or already completed onboarding, redirect them
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (hasCompletedProfile) {
        // Prevent completed users from re-running onboarding and overwriting their profile
        router.push('/opportunities');
      }
    }
  }, [user, authLoading, hasCompletedProfile, router]);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 2 CV Mode: 'file' or 'text'
  const [cvMode, setCvMode] = useState<'file' | 'text'>('file');
  const [fileName, setFileName] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: user?.user_metadata?.full_name || '',
    contact: user?.email || '',
    headline: '',
    education: '',
    
    // Step 2: CV Text
    cv_master: '',

    // Step 3: Interests
    kindPreference: 'both' as 'job' | 'scholarship' | 'both',
    industry: '',
    location: '',
    job_queries: 'Graduate software engineer\nEntry level developer remote',
    scholarship_queries: 'MSc computer science scholarships',

    // Step 4: Personal Prompt
    aboutYourself: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle CV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setFormData((prev) => ({ ...prev, cv_master: text }));
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  // Step Validation Functions
  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return false;
    }
    if (!formData.contact.trim()) {
      setErrorMsg('Please enter your contact details.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (!formData.cv_master.trim()) {
      setErrorMsg(
        cvMode === 'file'
          ? 'Please select a resume file to upload.'
          : 'Please paste or type your CV text to proceed.'
      );
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep3 = () => {
    if (!formData.location.trim()) {
      setErrorMsg('Please specify your location preference (e.g. Lagos, London, Remote).');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep4 = () => {
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;

    if (step < 5) {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      headline: formData.headline.trim(),
      education: formData.education.trim(),
      cv_master: formData.cv_master.trim(),
      interests: `Industry: ${formData.industry}`,
      location: formData.location.trim(),
      search_preference: formData.kindPreference,
      experience: formData.aboutYourself.trim(),
      job_queries: formData.job_queries.split('\n').map((q) => q.trim()).filter(Boolean),
      scholarship_queries: formData.scholarship_queries.split('\n').map((q) => q.trim()).filter(Boolean),
      user_id: user?.id,
      onboarding_completed: true,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to save candidate profile. Database rejected the payload.');
      }

      // Kick off fresh opportunity search scan for user
      await fetch('/api/opportunities/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });

      // Crucial Fix: Tell AuthContext the profile is complete BEFORE navigating!
      // This prevents the route guard on /opportunities from bouncing us back to Step 1.
      setHasCompletedProfile(true);

      // Redirect to fresh opportunities page
      router.push('/opportunities?scanning=true');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      {/* Step Progress Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-extrabold text-navy">Candidate Onboarding</h1>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-navy/5 text-navy rounded-full border border-navy/10">
            Step {step} of 5
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-gold' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Validation Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Wizard Step Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="w-5 h-5 text-gold" />
                Step 1: Basic Information
              </h2>
              <p className="text-xs text-slate-500 mt-1">Let's start with your identity and contact details.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Obaloluwa Akerele"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Details *</label>
                <input
                  type="text"
                  required
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="email@example.com | +234..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Headline</label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  placeholder="e.g. Mechanical Engineering Graduate | Web Developer"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Education Background</label>
                <textarea
                  rows={3}
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="e.g. B.Eng Mechanical Engineering, ABUAD (CGPA: 4.45 / 5.00), Graduating Oct 2026"
                  className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CV INPUT (TOGGLE: FILE OR TEXT) */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-5 h-5 text-gold" />
                Step 2: Resume / CV Context
              </h2>
              <p className="text-xs text-slate-500 mt-1">Choose how you want to provide your CV details.</p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCvMode('file')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  cvMode === 'file' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📁 Upload a File
              </button>
              <button
                type="button"
                onClick={() => setCvMode('text')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  cvMode === 'text' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📝 Paste Text Instead
              </button>
            </div>

            {/* File Upload Mode */}
            {cvMode === 'file' ? (
              <div className="border-2 border-dashed border-slate-300 hover:border-navy rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 transition">
                <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Upload CV File (.txt / .doc / plain text)</p>
                  {fileName && (
                    <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Selected: {fileName}
                    </p>
                  )}
                </div>
                <input
                  type="file"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white hover:file:bg-navy-light cursor-pointer"
                />
              </div>
            ) : (
              /* Text Paste Mode */
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paste Resume Content</label>
                <textarea
                  rows={8}
                  name="cv_master"
                  value={formData.cv_master}
                  onChange={handleChange}
                  placeholder="Paste your full resume text here..."
                  className="w-full px-4 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: INTERESTS & PREFERENCES */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                <Compass className="w-5 h-5 text-gold" />
                Step 3: Target Role & Location Preferences
              </h2>
              <p className="text-xs text-slate-500 mt-1">Specify what kinds of opportunities you want our AI agent to search.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opportunity Type Preference</label>
                <select
                  name="kindPreference"
                  value={formData.kindPreference}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                >
                  <option value="both">Both Jobs & Scholarships</option>
                  <option value="job">Jobs & Internships Only</option>
                  <option value="scholarship">Scholarships & Fellowships Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Industry / Field of Focus</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g. Mechanical Engineering, Software Development, Renewable Energy"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location Preferences *</label>
                <input
                  type="text"
                  required
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Lagos Nigeria, London UK, Remote, Worldwide"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Search Keywords (One per line)</label>
                <textarea
                  rows={4}
                  name="job_queries"
                  value={formData.job_queries}
                  onChange={handleChange}
                  className="w-full px-4 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PERSONAL PROMPT ("Tell me about yourself") */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                <MessageSquare className="w-5 h-5 text-gold" />
                Step 4: Tell Us About Yourself
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Share your personal passions, career aspirations, or unique projects beyond your CV. Gemini will use this to enrich your compatibility matching score.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Free-Text Personal Prompt</label>
              <textarea
                rows={7}
                name="aboutYourself"
                value={formData.aboutYourself}
                onChange={handleChange}
                placeholder="e.g. I am passionate about mechatronics, embedded systems, and robotics. I built an ESP32 automated system and worked on C-130 aircraft maintenance. I am looking for hands-on engineering opportunities..."
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & FINAL SUBMIT */}
        {step === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Step 5: Review & Kick Off Search
              </h2>
              <p className="text-xs text-slate-500 mt-1">Review your onboarding profile before launching the automated AI scan.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-700">
              <p><strong>Candidate:</strong> {formData.name} ({formData.contact})</p>
              <p><strong>Headline:</strong> {formData.headline || 'N/A'}</p>
              <p><strong>Preference:</strong> {formData.kindPreference} in {formData.location}</p>
              <p><strong>CV Loaded:</strong> {formData.cv_master ? `${formData.cv_master.substring(0, 100)}...` : 'None'}</p>
              <p><strong>Personal Bio:</strong> {formData.aboutYourself || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              Next Step
              <ArrowRight className="w-4 h-4 text-gold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitProfile}
              disabled={loading}
              className="px-8 py-3 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-xl shadow-lg shadow-navy/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving & Launching Search...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold" />
                  Complete Onboarding & Start Scan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
