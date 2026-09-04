'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ShieldCheck,
  Radio,
  Server,
  Database,
  Cpu,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Layers,
  MessageSquare,
  Loader2,
} from 'lucide-react';

export default function AdminSystemPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSystemHealth = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error loading system health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Benchmarking system latency & health...</span>
        </div>
      </div>
    );
  }

  const { database, redis, worker, runtime, whatsappHealth, lastChecked } = data || {
    database: { status: 'HEALTHY', latencyMs: 0, provider: 'PostgreSQL' },
    redis: { status: 'DISCONNECTED', queueDepth: 0, activeJobs: 0 },
    worker: { status: 'STANDBY', type: 'BullMQ' },
    runtime: { uptimeSeconds: 0, memoryRssMb: 0, nodeVersion: '', environment: '' },
    whatsappHealth: { connectedAccounts: 0, disconnectedAccounts: 0, totalAccounts: 0, errorBreakdown: [] },
    lastChecked: new Date().toISOString(),
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>System Health & WhatsApp Error Intelligence</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time infrastructure performance benchmarks, Redis queue depths, and WhatsApp Cloud API error groupings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Last benchmark {new Date(lastChecked).toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchSystemHealth(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : 'text-zinc-400'}`} />
            <span>Benchmark Now</span>
          </button>
        </div>
      </div>

      {/* ── 1. INFRASTRUCTURE HEALTH GAUGES ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Database (Postgres)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              {database.status}
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {database.latencyMs} <span className="text-xs text-zinc-500 font-normal">ms latency</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">{database.provider}</div>
        </div>

        {/* Redis Cache */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span>Redis Cache / PubSub</span>
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold ${
              redis.status === 'HEALTHY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${redis.status === 'HEALTHY' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500 dark:bg-amber-400'}`} />
              {redis.status}
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {redis.queueDepth} <span className="text-xs text-zinc-500 font-normal">queued jobs</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">{redis.activeJobs} active processing</div>
        </div>

        {/* Worker Dispatcher */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Background Dispatcher</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              {worker.status}
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {worker.status === 'RUNNING' ? 'Active' : 'Standby'}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">{worker.type}</div>
        </div>

        {/* Runtime Memory */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Process Memory (RSS)</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">{runtime.environment}</span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
            {runtime.memoryRssMb} <span className="text-xs text-zinc-500 font-normal">MB</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Uptime: {Math.round(runtime.uptimeSeconds / 60)} mins</div>
        </div>
      </div>

      {/* ── 2. WHATSAPP ERROR CODE GROUPING & INTELLIGENCE ──────────────── */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>WhatsApp Cloud API Error Groupings</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Aggregated Meta error codes across failed customer campaigns and messages
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
            {whatsappHealth.connectedAccounts} / {whatsappHealth.totalAccounts} WhatsApp Accounts Connected
          </span>
        </div>

        {whatsappHealth.errorBreakdown.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-500 space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto" />
            <p className="font-semibold text-zinc-800 dark:text-zinc-300">Zero Meta API Errors Recorded</p>
            <p className="text-[11px]">All outbound messages have delivered without platform-level error codes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {whatsappHealth.errorBreakdown.map((group: any) => (
              <div
                key={group.code}
                className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded">
                      Code {group.code}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{group.title}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">{group.count} occurrences</span>
                    <span className="text-zinc-500">
                      {group.affectedBusinessesCount} affected {group.affectedBusinessesCount === 1 ? 'business' : 'businesses'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{group.description}</p>

                {/* Affected Businesses List */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/40 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Affected:</span>
                  {group.affectedBusinesses.map((b: any) => (
                    <Link
                      key={b.id}
                      href={`/admin/businesses/${b.id}`}
                      className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-xs"
                    >
                      {b.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
