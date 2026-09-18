'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, Check, ChevronsUpDown, Loader2, Mail, Shield, Users } from 'lucide-react';
import { useTenant } from '@/context/tenant-context';
import Link from 'next/link';

interface WorkspaceItem {
  id: string;
  name: string;
  plan_type: string;
  is_current: boolean;
  workspace_role: 'admin' | 'member';
  created_at?: string;
}

export function WorkspaceSwitcher({
  variant = 'header',
  className = '',
}: {
  variant?: 'header' | 'sidebar' | 'mobile';
  className?: string;
}) {
  const { tenant } = useTenant();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchWorkspaces = async () => {
    try {
      const [wsRes, invRes] = await Promise.all([
        fetch('/api/workspaces'),
        fetch('/api/user/invitations')
      ]);

      if (wsRes.ok) {
        const data = await wsRes.json();
        setWorkspaces(data.workspaces || []);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setPendingCount(invData.invitations?.length || 0);
      }
    } catch (e) {
      console.warn('[WorkspaceSwitcher] Failed to fetch workspaces:', e);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [tenant?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitch = async (targetId: string) => {
    if (targetId === tenant?.id || switchingId) return;
    setSwitchingId(targetId);

    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: targetId })
      });

      if (res.ok) {
        setIsOpen(false);
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to switch workspace');
        setSwitchingId(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Error switching workspace');
      setSwitchingId(null);
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === tenant?.id) || {
    id: tenant?.id || 'current',
    name: tenant?.name || 'PingStack Workspace',
    workspace_role: tenant?.workspace_role || 'member'
  };

  const hasMultiple = workspaces.length > 1 || pendingCount > 0;

  // Single workspace rendering without unnecessary dropdown if only 1 workspace and no pending invites
  if (!hasMultiple && variant === 'header') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium ${className}`}>
        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
        <span className="truncate max-w-[160px] font-semibold">{currentWorkspace.name}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg transition-all cursor-pointer select-none ${
          variant === 'header'
            ? 'px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200'
            : variant === 'sidebar'
            ? 'w-full p-2 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 text-xs font-medium text-zinc-800 dark:text-zinc-200 justify-between'
            : 'w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 justify-between'
        }`}
        title="Switch Workspace"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Building2 className="w-3 h-3" />
          </div>
          <span className="truncate max-w-[140px] text-left">{currentWorkspace.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {pendingCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Workspaces ({workspaces.length})
            </span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                {pendingCount} invite{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {workspaces.map((ws) => {
              const isCurrent = ws.id === tenant?.id;
              const isSwitching = switchingId === ws.id;

              return (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  disabled={isCurrent || !!switchingId}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs truncate">{ws.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        ws.workspace_role === 'admin'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {ws.workspace_role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                      <span className="text-[10px] text-zinc-400 capitalize">{ws.plan_type}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSwitching ? (
                      <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                    ) : isCurrent ? (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 font-bold" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pending Invitations Quick Link */}
          {pendingCount > 0 && (
            <div className="p-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-amber-50/40 dark:bg-amber-950/20">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-amber-500/20 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pending Invitations</span>
                </span>
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {pendingCount}
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
