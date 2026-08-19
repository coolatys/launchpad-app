"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  CheckCircle2, Sparkles, User, ShieldCheck, Loader2, AlertCircle
} from "lucide-react";
import { useAuth } from '@/components/AuthContext';

/**
 * BRAND THEME
 * Launchpad actual palette.
 */
const THEME = {
  surfaceDark: "#12213a",   // navy-dark
  cardDark: "#1F3864",      // navy
  borderDark: "#2c4f8c",    // navy-light
  primary: "#1F3864",       // navy
  primaryHover: "#12213a",  // navy-dark
  accent: "#E0A02E",        // gold
  accentTint: "rgba(224, 160, 46, 0.15)", // gold tint
};

const JOBS = [
  { title: "Product Designer", company: "Nomad Health", tag: "Remote", score: 94 },
  { title: "Frontend Engineer", company: "Ledger Labs", tag: "Lagos", score: 87 },
  { title: "Data Analyst", company: "Paystack", tag: "Hybrid", score: 76 },
  { title: "UX Researcher", company: "Flutterwave", tag: "Remote", score: 91 },
];

function GoogleMark({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35.1 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.9 39.8 16.4 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.6 5.6C40.9 36.5 44 30.9 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function Field({ icon: Icon, label, type = "text", value, onChange, placeholder, autoComplete, rightAction, required = false }: any) {
  return (
    <label className="block">
      <span className="font-sans text-xs font-medium text-slate-500 tracking-wide">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors focus-within:border-[#1F3864] focus-within:ring-2 focus-within:ring-[#1F3864]/20">
        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="font-sans w-full text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
        />
        {rightAction}
      </div>
    </label>
  );
}

function PrimaryButton({ children, loading, ...props }: any) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full font-sans inline-flex items-center justify-center gap-2 rounded-lg text-white text-sm font-semibold py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: THEME.primary }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

function GoogleButton({ children = "Continue with Google", onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full font-sans inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
    >
      <GoogleMark />
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="font-sans text-xs text-slate-400">or</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2 bg-rose-50 text-rose-800 border border-rose-200">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <p className="font-medium leading-snug">{error}</p>
    </div>
  );
}

/* ---------- Left panel: signature "live ranking" visual ---------- */
function RankingPanel() {
  const [displayScores, setDisplayScores] = useState(JOBS.map(() => 0));
  const [activeIdx, setActiveIdx] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    JOBS.forEach((job, i) => {
      const delay = i * 300;
      const start = delay + 250;
      const duration = 700;
      const startTime = performance.now() + start;
      let raf: any;
      const step = (now: any) => {
        const t = Math.min(Math.max((now - startTime) / duration, 0), 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayScores((prev) => {
          const next = [...prev];
          next[i] = Math.round(eased * job.score);
          return next;
        });
        if (t < 1) raf = requestAnimationFrame(step);
      };
      const kickoff = setTimeout(() => (raf = requestAnimationFrame(step)), Math.max(start, 0));
      return () => {
        clearTimeout(kickoff);
        cancelAnimationFrame(raf);
      };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((i) => (i + 1) % JOBS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-10 lg:p-14 overflow-hidden">
      <div className="relative z-10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: THEME.accent }}>
          <Sparkles className="w-4 h-4" style={{ color: THEME.surfaceDark }} />
        </div>
        <span className="font-sans text-lg font-semibold text-white tracking-tight">Launchpad</span>
      </div>

      <div className="relative z-10 max-w-sm">
        <h1 className="font-sans text-3xl lg:text-[2.15rem] leading-[1.15] font-semibold text-white">
          Ranked for you, not everyone else.
        </h1>
        <p className="font-sans text-sm text-slate-400 mt-3 leading-relaxed">
          Tell Launchpad what you're looking for once. It reads every new listing and scores how well it fits you before you ever see it.
        </p>
      </div>

      <div className="relative z-10 space-y-2.5">
        {JOBS.map((job, i) => {
          const isActive = i === activeIdx;
          return (
            <div
              key={job.title}
              className="rounded-xl border px-4 py-3 flex items-center justify-between transition-all duration-500"
              style={{
                borderColor: isActive ? THEME.accent + "99" : THEME.borderDark,
                backgroundColor: isActive ? THEME.cardDark : THEME.surfaceDark,
                boxShadow: isActive ? `0 0 0 1px ${THEME.accentTint}` : "none",
              }}
            >
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-slate-100 truncate">{job.title}</p>
                <p className="font-sans text-xs text-slate-500 truncate">{job.company} · {job.tag}</p>
              </div>
              <div
                className="font-mono text-sm font-semibold shrink-0 ml-3 tabular-nums"
                style={{ color: isActive ? THEME.accent : "#64748B" }}
              >
                {displayScores[i]}%
              </div>
            </div>
          );
        })}
      </div>

      <p className="relative z-10 font-sans text-xs text-slate-600">
        Scored using your saved profile · updated continuously
      </p>
    </div>
  );
}

/* ---------- Right panel: auth forms ---------- */
function SignIn({ onForgot, onSwitch, auth }: any) {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error: signInError } = await auth.signInWithEmail(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
    // Router redirect is handled in AuthScreen effect
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-sans text-2xl font-semibold text-slate-900">Welcome back</h2>
      <p className="font-sans text-sm text-slate-500 mt-1 mb-6">Sign in to see today's matches.</p>

      <ErrorMessage error={error} />

      <div className="space-y-4">
        <Field icon={Mail} label="Email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
        <Field
          icon={Lock}
          label="Password"
          type={showPw ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="current-password"
          value={password} 
          onChange={(e: any) => setPassword(e.target.value)}
          required
          rightAction={
            <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <div className="flex items-center justify-between -mt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded border-slate-300" style={{ accentColor: THEME.primary }} />
            <span className="font-sans text-xs text-slate-500">Remember me</span>
          </label>
          <button onClick={onForgot} type="button" className="font-sans text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Forgot password?
          </button>
        </div>
        <PrimaryButton type="submit" loading={loading}>
          Sign in <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>

      <Divider />
      <GoogleButton onClick={() => auth.signInWithGoogle()} />

      <p className="font-sans text-sm text-slate-500 text-center mt-6">
        New to Launchpad?{" "}
        <button type="button" onClick={onSwitch} className="font-medium hover:underline" style={{ color: THEME.primary }}>
          Create an account
        </button>
      </p>
    </form>
  );
}

function SignUp({ onSwitch, auth }: any) {
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) return;
    setLoading(true);
    setError(null);
    const { error: signUpError } = await auth.signUpWithEmail(email, password, name);
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
    } else {
      // Supabase email signup requires verification
      onSwitch("sent");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-sans text-2xl font-semibold text-slate-900">Create your account</h2>
      <p className="font-sans text-sm text-slate-500 mt-1 mb-6">Takes about a minute. No resume required yet.</p>

      <ErrorMessage error={error} />

      <div className="space-y-4">
        <Field icon={User} label="Full name" placeholder="Ayomikun Akerele" autoComplete="name" value={name} onChange={(e: any) => setName(e.target.value)} required />
        <Field icon={Mail} label="Email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
        <Field
          icon={Lock}
          label="Password"
          type={showPw ? "text" : "password"}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password} onChange={(e: any) => setPassword(e.target.value)} required
          rightAction={
            <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <label className="flex items-start gap-2.5 pt-1">
          <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded border-slate-300" style={{ accentColor: THEME.primary }} />
          <span className="font-sans text-xs text-slate-500 leading-relaxed">
            I agree to Launchpad's Terms of Service and Privacy Policy.
          </span>
        </label>
        <PrimaryButton type="submit" loading={loading}>
          Create account <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>

      <Divider />
      <GoogleButton content="Sign up with Google" onClick={() => auth.signInWithGoogle()} />

      <p className="font-sans text-sm text-slate-500 text-center mt-6">
        Already have an account?{" "}
        <button type="button" onClick={() => onSwitch("signin")} className="font-medium hover:underline" style={{ color: THEME.primary }}>
          Sign in
        </button>
      </p>
    </form>
  );
}

function ForgotPassword({ onBack, onSent, auth }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: resetError } = await auth.resetPassword(email);
    setLoading(false);
    if (resetError) {
      setError(resetError);
    } else {
      onSent();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </button>
      <h2 className="font-sans text-2xl font-semibold text-slate-900">Reset your password</h2>
      <p className="font-sans text-sm text-slate-500 mt-1 mb-6">
        Enter the email on your account and we'll send a reset link.
      </p>

      <ErrorMessage error={error} />

      <div className="space-y-4">
        <Field icon={Mail} label="Email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
        <PrimaryButton type="submit" loading={loading}>
          Send reset link <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </form>
  );
}

function ResetSent({ onBack }: any) {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
      </div>
      <h2 className="font-sans text-xl font-semibold text-slate-900 mt-4">Check your email</h2>
      <p className="font-sans text-sm text-slate-500 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
        If an account exists for that address, a link is on its way.
      </p>
      <button onClick={onBack} className="font-sans text-sm font-medium hover:underline mt-6" style={{ color: THEME.primary }}>
        Back to sign in
      </button>
    </div>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [view, setView] = useState("signin"); // signin | signup | forgot | sent

  // Redirect if already logged in
  useEffect(() => {
    if (auth.user) {
      router.push('/');
    }
  }, [auth.user, router]);

  if (auth.user) return null; // Avoid flashing login UI while redirecting

  return (
    <div className="min-h-screen w-full bg-neutral-50 flex items-stretch">
      {/* Left: signature visual, hidden on small screens */}
      <div className="hidden lg:block lg:w-[46%] relative" style={{ backgroundColor: THEME.surfaceDark }}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <RankingPanel />
      </div>

      {/* Right: auth card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: THEME.accent }}>
              <Sparkles className="w-4 h-4" style={{ color: THEME.surfaceDark }} />
            </div>
            <span className="font-sans text-lg font-semibold text-slate-900 tracking-tight">Launchpad</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 p-7 sm:p-8">
            {view === "signin" && (
              <SignIn onForgot={() => setView("forgot")} onSwitch={() => setView("signup")} auth={auth} />
            )}
            {view === "signup" && <SignUp onSwitch={(v: string) => setView(v)} auth={auth} />}
            {view === "forgot" && (
              <ForgotPassword onBack={() => setView("signin")} onSent={() => setView("sent")} auth={auth} />
            )}
            {view === "sent" && <ResetSent onBack={() => setView("signin")} />}
          </div>

          <p className="font-sans text-xs text-slate-400 text-center mt-6 inline-flex items-center gap-1.5 justify-center w-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Your data is only used to match and rank jobs for you.
          </p>
        </div>
      </div>
    </div>
  );
}
