'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Source, SourceProvider, Opportunity } from '@/lib/types';

const PROVIDERS: { value: SourceProvider; label: string }[] = [
  { value: 'adzuna', label: 'Adzuna (Primary Global Jobs)' },
  { value: 'arbeitnow', label: 'Arbeitnow (EU + Remote)' },
  { value: 'remotive', label: 'Remotive (Global Remote)' },
  { value: 'reed', label: 'Reed (UK Jobs)' },
  { value: 'reliefweb', label: 'ReliefWeb (Humanitarian Aid)' },
  { value: 'euraxess', label: 'EURAXESS (EU Research RSS)' },
  { value: 'rss', label: 'Generic RSS Feed' },
  { value: 'manual', label: 'Manual Entries' },
];

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Opportunity[] | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    kind: 'job' as 'job' | 'scholarship',
    provider: 'adzuna' as SourceProvider,
    query: '',
    location: '',
  });

  // Fetch all saved sources
  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) throw new Error('Failed to load sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Add Source
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setStatus(null);

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add source');
      }

      await fetchSources();
      setForm({
        kind: 'job',
        provider: 'adzuna',
        query: '',
        location: '',
      });
      setStatus({ type: 'success', message: 'Discovery source added successfully!' });
      setTimeout(() => setStatus(null), 4000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setAdding(false);
    }
  };

  // Toggle Active State
  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive }),
      });

      if (!res.ok) throw new Error('Failed to update source');
      
      // Update local state
      setSources((prev) =>
        prev.map((src) => (src.id === id ? { ...src, active: !currentActive } : src))
      );
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  // Delete Source
  const deleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source config?')) return;

    try {
      const res = await fetch(`/api/sources?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete source');

      setSources((prev) => prev.filter((src) => src.id !== id));
      setStatus({ type: 'success', message: 'Source deleted.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  // Run Test Check
  const runTestCheck = async () => {
    setTesting(true);
    setTestResults(null);
    setStatus(null);

    try {
      const res = await fetch('/api/check-now');
      if (!res.ok) throw new Error('Failed to run test check');
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setTestResults(data.results || []);
      setStatus({
        type: 'success',
        message: data.message || `Test complete. Found ${data.results?.length || 0} listings.`,
      });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Error occurred while testing.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Loading search configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <Search className="w-8 h-8 text-gold" />
            Saved Search Sources
          </h1>
          <p className="text-slate-500 mt-1">
            Configure keywords and platforms to query. The agent crawls these sources on schedule.
          </p>
        </div>

        <button
          onClick={runTestCheck}
          disabled={testing || sources.filter(s => s.active).length === 0}
          className="px-5 py-2.5 bg-gold hover:bg-gold-light text-navy-dark font-bold rounded-xl shadow-md shadow-gold/10 flex items-center justify-center gap-2 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {testing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Testing Adapters...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Check Now (Test Fetch)
            </>
          )}
        </button>
      </div>

      {/* Alert Banner */}
      {status && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-4 duration-300 ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{status.type === 'success' ? 'Info' : 'Error'}</p>
            <p className="text-sm opacity-90">{status.message}</p>
          </div>
        </div>
      )}

      {/* Grid Layout: Add Form & Existing Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Source Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-2">Add New Search</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="kind" className="block text-sm font-semibold text-slate-700 mb-1">
                Opportunity Type
              </label>
              <select
                id="kind"
                name="kind"
                value={form.kind}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800"
              >
                <option value="job">Job</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>

            <div>
              <label htmlFor="provider" className="block text-sm font-semibold text-slate-700 mb-1">
                Discovery Provider
              </label>
              <select
                id="provider"
                name="provider"
                value={form.provider}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="query" className="block text-sm font-semibold text-slate-700 mb-1">
                Query Keywords <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="query"
                name="query"
                required
                value={form.query}
                onChange={handleInputChange}
                placeholder="e.g. software engineer, mechanical"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-1">
                Location (Adzuna Country Code / Query)
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={form.location}
                onChange={handleInputChange}
                placeholder="e.g. gb, us, de or remote"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy focus:border-navy outline-none text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Adzuna requires a 2-letter ISO code for country-specific queries (e.g. &apos;gb&apos; for UK, &apos;us&apos; for USA).
              </p>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 bg-navy hover:bg-navy-light text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition duration-150 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-5 h-5 text-gold" />
              Add Source Config
            </button>
          </form>
        </div>

        {/* Existing Sources List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-navy border-b border-slate-100 pb-2">Active Configs</h2>
          
          {sources.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400">
              No saved searches found. Use the form on the left to add your first search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sources.map((src) => {
                const matchedProvider = PROVIDERS.find((p) => p.value === src.provider);
                return (
                  <div
                    key={src.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 hover:border-slate-300 transition duration-150"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            src.kind === 'job'
                              ? 'bg-sky-50 text-sky-700 border border-sky-150'
                              : 'bg-amber-50 text-amber-700 border border-amber-150'
                          }`}
                        >
                          {src.kind}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          via {matchedProvider?.label || src.provider}
                        </span>
                      </div>
                      <h3 className="font-bold text-navy text-lg">&ldquo;{src.query}&rdquo;</h3>
                      {src.location && (
                        <p className="text-sm text-slate-500 font-medium">Location: {src.location}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleActive(src.id, src.active)}
                        title={src.active ? 'Disable Source' : 'Enable Source'}
                        className="text-slate-500 hover:text-navy transition duration-150 cursor-pointer"
                      >
                        {src.active ? (
                          <ToggleRight className="w-9 h-9 text-navy" />
                        ) : (
                          <ToggleLeft className="w-9 h-9 text-slate-400" />
                        )}
                      </button>

                      <button
                        onClick={() => deleteSource(src.id)}
                        title="Delete Source"
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition duration-150 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Raw test results output */}
      {testResults && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-navy">
              Raw Discovery Results <span className="text-slate-400 text-sm">({testResults.length} items found)</span>
            </h2>
            <button
              onClick={() => setTestResults(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
            >
              Clear Results
            </button>
          </div>

          {testResults.length === 0 ? (
            <p className="text-slate-500 text-sm">No items returned. Ensure your country codes are correct (e.g. &apos;gb&apos; or &apos;us&apos;) and your queries match listings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 font-semibold">Title</th>
                    <th className="py-2.5 font-semibold">Company / Org</th>
                    <th className="py-2.5 font-semibold">Location</th>
                    <th className="py-2.5 font-semibold">Dedupe Key</th>
                    <th className="py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {testResults.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-900">{item.title}</td>
                      <td className="py-3">{item.org}</td>
                      <td className="py-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
                          {item.location}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[10px] text-slate-400">{item.dedupe_key}</td>
                      <td className="py-3 text-right">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-navy hover:underline font-semibold"
                        >
                          View Site
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
