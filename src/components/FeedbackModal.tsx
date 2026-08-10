'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, X, Star, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [type, setType] = useState<'general' | 'bug' | 'feature'>('general');
  const [message, setMessage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, rating, type, message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');

      setStatus({ type: 'success', text: 'Thank you! Your feedback has been received.' });
      setMessage('');
      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-navy text-white flex items-center justify-between border-b border-navy-dark">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gold/20 text-gold rounded-lg">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Tester Feedback & Adjustments</h3>
              <p className="text-xs text-slate-300">Help us improve Launchpad!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {status && (
            <div
              className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fb_name" className="block text-xs font-semibold text-slate-700 mb-1">
                Your Name (Optional)
              </label>
              <input
                id="fb_name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>
            <div>
              <label htmlFor="fb_email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email / Contact (Optional)
              </label>
              <input
                id="fb_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none"
              />
            </div>
          </div>

          {/* Feedback Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Feedback Category</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('general')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                  type === 'general' ? 'bg-navy text-white border-navy' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ⭐ General
              </button>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                  type === 'bug' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🐛 Bug Report
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                  type === 'feature' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                💡 Feature Suggestion
              </button>
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Overall Rating</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none transition transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-slate-500 font-medium ml-2">{rating}/5 Stars</span>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label htmlFor="fb_msg" className="block text-xs font-semibold text-slate-700 mb-1">
              Your Feedback / Suggested Adjustments <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="fb_msg"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what worked well, what was confusing, or what features you'd like to see..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy outline-none resize-y"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="px-5 py-2.5 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-xl shadow-md shadow-navy/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-gold" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
