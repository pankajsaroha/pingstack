'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [whatsappFilter, setWhatsappFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        q: query,
        plan: planFilter,
        whatsapp: whatsappFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/businesses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page, planFilter, whatsappFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchBusinesses();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspended
          </span>
        );
      case 'Onboarding':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Onboarding
          </span>
        );
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'growth':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Growth
          </span>
        );
      case 'pro':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Pro
          </span>
        );
      case 'starter':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
            Starter
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
            <Building2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>Businesses Directory</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor and inspect all {pagination.total} registered customer organizations on Pingstack.
          </p>
        </div>

        <button
          onClick={fetchBusinesses}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : 'text-zinc-400'}`} />
          <span>Refresh Table</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, email, ID, phone..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-700 shadow-2xs transition-colors"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none shadow-2xs"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>

          {/* WhatsApp Filter */}
          <select
            value={whatsappFilter}
            onChange={(e) => {
              setWhatsappFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none shadow-2xs"
          >
            <option value="all">WhatsApp Status: All</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected / Pending</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none shadow-2xs"
          >
            <option value="all">Account Status: All</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 font-mono text-[11px]">
                <th className="py-3 px-4 font-medium">Business</th>
                <th className="py-3 px-4 font-medium">Owner</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">WhatsApp</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Messages Today</th>
                <th className="py-3 px-4 font-medium text-right">Created</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {loading && businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 font-mono">
                    <div className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading businesses...</p>
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 text-xs">
                    No businesses found matching current filters.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors group">
                    {/* Business Name */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="font-semibold text-zinc-900 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block"
                      >
                        {b.name}
                      </Link>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {b.publicId || b.id}
                      </span>
                    </td>

                    {/* Owner Email */}
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      <div className="truncate max-w-[150px]">{b.ownerEmail}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-600">{b.ownerName}</div>
                    </td>

                    {/* Plan */}
                    <td className="py-3 px-4">{getPlanBadge(b.planType)}</td>

                    {/* WhatsApp */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] ${
                          b.whatsappStatus === 'Connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.whatsappStatus === 'Connected' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-zinc-400 dark:bg-zinc-600'
                          }`}
                        />
                        <span>{b.whatsappStatus}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(b.computedStatus)}</td>

                    {/* Messages Today */}
                    <td className="py-3 px-4 text-right font-mono text-zinc-800 dark:text-zinc-300">
                      {b.messagesToday.toLocaleString()}
                    </td>

                    {/* Created */}
                    <td className="py-3 px-4 text-right text-zinc-500 font-mono text-[11px]">
                      {new Date(b.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono bg-zinc-50/50 dark:bg-zinc-950/20">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + (businesses.length > 0 ? 1 : 0)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} businesses
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
