'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircleQuestion,
  Bug,
  Sparkles,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function AdminFeedbackPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        status: statusFilter,
        priority: priorityFilter,
      });
      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [typeFilter, statusFilter, priorityFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchFeedback();
      }
    } catch (err) {
      console.error('Error updating feedback status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Loading customer feedback board...</span>
        </div>
      </div>
    );
  }

  const { feedback, counts, topRequestedFeatures } = data || {
    feedback: [],
    counts: { total: 0, bugs: 0, features: 0, suggestions: 0, unread: 0, critical: 0 },
    topRequestedFeatures: [],
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />;
      case 'feature':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />;
      case 'suggestion':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Critical
          </span>
        );
      case 'important':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Important
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Nice to Have
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>Customer Feedback & Feature Requests</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Review bug reports, feature suggestions, and guide product roadmap priorities.
          </p>
        </div>

        <button
          onClick={fetchFeedback}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : 'text-zinc-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Total</div>
          <div className="text-xl font-black font-mono text-zinc-900 dark:text-white mt-1">{counts.total}</div>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Unread / New</div>
          <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">{counts.unread}</div>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Bugs</div>
          <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">{counts.bugs}</div>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Feature Requests</div>
          <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">{counts.features}</div>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Suggestions</div>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">{counts.suggestions}</div>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Critical Priority</div>
          <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">{counts.critical}</div>
        </div>
      </div>

      {/* Top Requested Features Rollup */}
      {topRequestedFeatures.length > 0 && (
        <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Most Requested Product Features</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topRequestedFeatures.map((f: any, idx: number) => (
              <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate capitalize">{f.topic}...</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full">
                    {f.count} requests
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">{f.items[0]?.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none shadow-2xs"
        >
          <option value="all">All Types</option>
          <option value="bug">🐛 Bugs</option>
          <option value="feature">✨ Features</option>
          <option value="suggestion">💡 Suggestions</option>
          <option value="general">💬 General</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none shadow-2xs"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="important">Important</option>
          <option value="nice_to_have">Nice to Have</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none shadow-2xs"
        >
          <option value="all">All Statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {feedback.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 rounded-xl shadow-2xs">
            No feedback entries found matching current filter.
          </div>
        ) : (
          feedback.map((item: any) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">{getTypeIcon(item.type)}</div>
                  <span className="text-xs font-mono font-bold uppercase text-zinc-700 dark:text-zinc-300">
                    {item.type}
                  </span>
                  {getPriorityBadge(item.priority)}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>

                  {/* Status Dropdown */}
                  <select
                    value={item.status}
                    disabled={updatingId === item.id}
                    onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                    className="px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
                  >
                    <option value="NEW">NEW</option>
                    <option value="REVIEWED">REVIEWED</option>
                    <option value="PLANNED">PLANNED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>
              </div>

              {/* Message content */}
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {item.message}
              </p>

              {/* Metadata footer */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-zinc-500 pt-1">
                {item.businessId ? (
                  <span>
                    Business:{' '}
                    <Link
                      href={`/admin/businesses/${item.businessId}`}
                      className="text-zinc-700 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold"
                    >
                      {item.businessName}
                    </Link>
                  </span>
                ) : (
                  <span>Workspace: General</span>
                )}
                {item.email && (
                  <span>
                    Email: <a href={`mailto:${item.email}`} className="text-indigo-600 dark:text-indigo-400">{item.email}</a>
                  </span>
                )}
                {item.page && <span>Page: {item.page}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
