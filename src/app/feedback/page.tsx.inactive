'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Star, Loader2, RefreshCw, User, Mail, Calendar, Tag, ShieldCheck } from 'lucide-react';

interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  rating: number;
  type: 'general' | 'bug' | 'feature';
  message: string;
  created_at: string;
}

export default function FeedbackAdminPage() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data.feedback || []);
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const filteredFeedback = feedbackList.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'bug':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-700 border border-rose-200">🐛 Bug Report</span>;
      case 'feature':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">💡 Feature Request</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">⭐ General Review</span>;
    }
  };

  const averageRating = feedbackList.length
    ? (feedbackList.reduce((acc, curr) => acc + (curr.rating || 5), 0) / feedbackList.length).toFixed(1)
    : '5.0';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-gold" />
            Tester Feedback Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Review suggestions, bug reports, and ratings submitted by your 10 friends testing the app.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Responses
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-bold text-navy mt-1">{feedbackList.length}</p>
          </div>
          <div className="p-3 bg-navy/5 text-navy rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Satisfaction</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-navy">{averageRating}</span>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(averageRating)) ? 'fill-amber-400' : 'text-slate-200'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bug Reports</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {feedbackList.filter((f) => f.type === 'bug').length}
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            filterType === 'all' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({feedbackList.length})
        </button>
        <button
          onClick={() => setFilterType('general')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            filterType === 'general' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          General Reviews ({feedbackList.filter((f) => f.type === 'general').length})
        </button>
        <button
          onClick={() => setFilterType('bug')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            filterType === 'bug' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Bugs ({feedbackList.filter((f) => f.type === 'bug').length})
        </button>
        <button
          onClick={() => setFilterType('feature')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            filterType === 'feature' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Feature Ideas ({feedbackList.filter((f) => f.type === 'feature').length})
        </button>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
          <span className="ml-3 text-slate-600 font-medium">Loading tester feedback...</span>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-navy">No Feedback Submitted Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Share your app link with your 10 friends. When they click "Give Feedback" in the navigation, their responses will automatically show up here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFeedback.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-navy/10 border border-navy/20 flex items-center justify-center text-navy font-bold text-sm">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-navy text-sm flex items-center gap-2">
                      {item.name}
                      {item.email !== 'N/A' && <span className="text-xs font-normal text-slate-400">({item.email})</span>}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getTypeBadge(item.type)}
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < item.rating ? 'fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
