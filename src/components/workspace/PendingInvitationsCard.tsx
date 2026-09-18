'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Check, X, Building2, Shield, Users, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Team } from '@/types';

interface UserPendingInvitation {
  id: string;
  token: string;
  tenant_id: string;
  workspace_name: string;
  email: string;
  role: 'admin' | 'member';
  teams: Team[];
  expires_at: string;
  created_at: string;
  inviter_name?: string;
}

export function PendingInvitationsCard() {
  const [invitations, setInvitations] = useState<UserPendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<{ id: string; action: 'accept' | 'decline' } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.warn('[PendingInvitationsCard] Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (inv: UserPendingInvitation) => {
    setActionInProgress({ id: inv.id, action: 'accept' });
    setMessage(null);

    try {
      const res = await fetch(`/api/user/invitations/${inv.id}/accept`, {
        method: 'POST'
      });

      if (res.ok) {
        setMessage({ text: `Successfully joined ${inv.workspace_name}! Switching workspace...`, type: 'success' });
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to accept invitation.', type: 'error' });
        setActionInProgress(null);
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error accepting invitation.', type: 'error' });
      setActionInProgress(null);
    }
  };

  const handleDecline = async (inv: UserPendingInvitation) => {
    if (!confirm(`Are you sure you want to decline the invitation to join ${inv.workspace_name}?`)) {
      return;
    }

    setActionInProgress({ id: inv.id, action: 'decline' });
    setMessage(null);

    try {
      const res = await fetch(`/api/user/invitations/${inv.id}/decline`, {
        method: 'POST'
      });

      if (res.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
        setMessage({ text: `Declined invitation to ${inv.workspace_name}.`, type: 'success' });
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to decline invitation.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error declining invitation.', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Pending Workspace Invitations ({invitations.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              You have been invited to join the following workspaces.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {invitations.map((inv) => {
          const isAccepting = actionInProgress?.id === inv.id && actionInProgress.action === 'accept';
          const isDeclining = actionInProgress?.id === inv.id && actionInProgress.action === 'decline';
          const isBusy = !!actionInProgress;

          const formattedExpiry = new Date(inv.expires_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={inv.id}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    {inv.workspace_name}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border inline-flex items-center gap-1 ${
                      inv.role === 'admin'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {inv.role === 'admin' ? (
                      <>
                        <Shield className="w-2.5 h-2.5" /> Workspace Admin
                      </>
                    ) : (
                      'Team Member'
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    {inv.teams && inv.teams.length > 0 ? (
                      <span>
                        Teams: <span className="font-medium text-zinc-700 dark:text-zinc-300">{inv.teams.map((t) => t.name).join(', ')}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-400">No team assigned</span>
                    )}
                  </span>

                  <span>•</span>

                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Expires {formattedExpiry}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleDecline(inv)}
                  disabled={isBusy}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isDeclining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>Decline</span>
                </button>

                <button
                  onClick={() => handleAccept(inv)}
                  disabled={isBusy}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isAccepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Accept &amp; Join</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
