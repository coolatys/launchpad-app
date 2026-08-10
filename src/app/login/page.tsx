'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Mail, ArrowRight, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // If already logged in, redirect to home
  if (user) {
    router.push('/');
    return null;
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus(null);

    const { error } = await signInWithMagicLink(email);
    setLoading(false);

    if (error) {
      setStatus({ type: 'error', text: error });
    } else {
      setStatus({
        type: 'success',
        text: 'Magic login link sent! Check your email inbox to sign in.',
      });
      setEmail('');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy text-gold shadow-lg shadow-navy/20 mb-2">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-navy tracking-tight">
            Welcome to LAUNCH<span className="text-gold">PAD</span>
          </h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Sign in to access your private job & scholarship candidate dashboard.
          </p>
        </div>

        {/* Status Notification */}
        {status && (
          <div
            className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="font-medium leading-snug">{status.text}</p>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {/* Google Sign In */}
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border border-slate-300 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-sm cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 font-medium uppercase absolute">Or Email Link</span>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none text-slate-800 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-navy hover:bg-navy-light text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="w-4 h-4 text-gold" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Privacy Note */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Private Workspace — Data is encrypted & isolated per user</span>
        </div>
      </div>
    </div>
  );
}
