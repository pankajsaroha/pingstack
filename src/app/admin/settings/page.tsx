'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Shield,
  History,
  Lock,
  Server,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Key,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=30`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
        setPagination(json.pagination || { total: 0, page: 1, limit: 30, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  const getActionBadge = (action: string) => {
    if (action.includes('CHANGE_PLAN')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          PLAN CHANGED
        </span>
      );
    }
    if (action.includes('DELETE')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          DELETED
        </span>
      );
    }
    if (action.includes('SUSPEND')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          SUSPENDED
        </span>
      );
    }
    if (action.includes('REACTIVATE')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          REACTIVATED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase rounded bg-zinc-800 text-zinc-300">
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <span>Platform Settings & Audit Trail</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Complete chronological administrative audit log and platform security settings.
        </p>
      </div>

      {/* Security & Access Overview Card */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Admin Authorization Architecture</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-lg space-y-1">
            <div className="text-zinc-500 font-mono text-[10px] uppercase">Access Control Mode</div>
            <div className="font-bold text-zinc-800 dark:text-zinc-200">Database Role Guarded</div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Only accounts with role &lsquo;admin&rsquo; / &lsquo;superadmin&rsquo; or platform emails can authenticate.
            </p>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-lg space-y-1">
            <div className="text-zinc-500 font-mono text-[10px] uppercase">Zero Trust API Guard</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">Enabled (verifyAdminApi)</div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Every server route checks session against database to prevent token forgery.
            </p>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/60 rounded-lg space-y-1">
            <div className="text-zinc-500 font-mono text-[10px] uppercase">Audit Logging</div>
            <div className="font-bold text-indigo-600 dark:text-indigo-400">Active (admin_audit_logs)</div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              All plan changes, suspensions, deletions, and status updates are permanently recorded.
            </p>
          </div>
        </div>
      </div>

      {/* Chronological Audit Logs Table */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>Administrative Action Audit Log</span>
            </h3>
            <p className="text-xs text-zinc-500">Immutable record of all admin interventions</p>
          </div>

          <button
            onClick={fetchAuditLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500 dark:text-indigo-400' : 'text-zinc-400'}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-mono text-[11px]">
                <th className="py-2.5 font-medium">Action</th>
                <th className="py-2.5 font-medium">Target Business</th>
                <th className="py-2.5 font-medium">Admin Identity</th>
                <th className="py-2.5 font-medium">Details / Note</th>
                <th className="py-2.5 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No admin actions recorded in audit logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3">{getActionBadge(log.action)}</td>
                    <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">
                      {log.target_tenant_id ? (
                        <Link
                          href={`/admin/businesses/${log.target_tenant_id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {log.target_tenant_name || 'Business'}
                        </Link>
                      ) : (
                        <span className="text-zinc-500">{log.target_tenant_name || 'Platform'}</span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">{log.admin_email}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400 text-[11px] max-w-sm leading-relaxed">
                      {log.metadata?.note || log.metadata?.reason ? (
                        <span>&ldquo;{log.metadata?.note || log.metadata?.reason}&rdquo;</span>
                      ) : (
                        <span className="font-mono text-zinc-500">
                          {JSON.stringify(log.metadata || {})}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-zinc-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + (logs.length > 0 ? 1 : 0)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
