'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Lock, 
  User, 
  Building2,
  LogOut,
  Mail
} from 'lucide-react';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Form fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/team-members/invite/validate?token=${token}`);
        const data = await res.json();
        if (data.valid) {
          setInvitationData(data.invitation);
          if (data.invitation.existingUserName) {
            setName(data.invitation.existingUserName);
          }
        } else {
          setError(data.error || 'This invitation is invalid, expired, or has already been used.');
        }
      } catch (err: any) {
        setError('Network error while validating invitation.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/team-members/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation.');
      } else {
        setAccepted(true);
        setTimeout(() => {
          router.push(data.redirect || '/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      setError('Network error while accepting invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOutAndReload = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-zinc-400 font-mono">Validating invitation link...</p>
      </div>
    );
  }

  const isMatchingAuthenticatedUser = Boolean(invitationData?.isMatchingUser);
  const isMismatchedAuthenticatedUser = Boolean(invitationData?.isAuthenticated && !invitationData?.isMatchingUser);
  const isExistingUserLoggedOut = Boolean(invitationData?.isExistingUser && !invitationData?.isAuthenticated);
  const isBrandNewUser = Boolean(!invitationData?.isExistingUser);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Workspace Invitation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Join {invitationData?.workspaceName || 'PingStack'}
          </h1>
          <p className="text-xs text-zinc-400">
            You have been invited to join as a{' '}
            <span className="text-zinc-200 font-semibold capitalize">
              {invitationData?.role === 'admin' ? 'Workspace Admin' : 'Team Member'}
            </span>.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {accepted && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold">Welcome to {invitationData?.workspaceName}!</p>
              <p className="text-[11px] text-emerald-400/80">Opening your workspace dashboard...</p>
            </div>
          </div>
        )}

        {/* Session Status Badges */}
        {!accepted && isMatchingAuthenticatedUser && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-medium">Signed in as </span>
              <strong className="font-mono text-white">{invitationData.email}</strong>
            </div>
          </div>
        )}

        {!accepted && isMismatchedAuthenticatedUser && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                You are currently signed in as <strong className="text-white font-mono">{invitationData.currentUserEmail}</strong>, but this invitation was sent to <strong className="text-white font-mono">{invitationData.email}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px]">
              <span className="text-amber-400/80">Switch account to accept</span>
              <button
                type="button"
                onClick={handleSignOutAndReload}
                className="text-amber-300 hover:text-white font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {!accepted && isExistingUserLoggedOut && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            Welcome back{invitationData.existingUserName ? `, ${invitationData.existingUserName}` : ''}! Sign in with your existing PingStack password to accept this invitation.
          </div>
        )}

        {/* Invitation Context Summary */}
        {!accepted && invitationData && (
          <div className="p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Invited Email:</span>
              <span className="font-mono text-zinc-200">{invitationData.email}</span>
            </div>
            {invitationData.teams && invitationData.teams.length > 0 ? (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                <span className="text-zinc-400">Assigned Teams:</span>
                <div className="flex flex-wrap gap-1">
                  {invitationData.teams.map((t: any) => (
                    <span
                      key={t.id}
                      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${t.color || '#4F46E5'}20`,
                        color: t.color || '#4F46E5',
                        border: `1px solid ${t.color || '#4F46E5'}40`
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px] text-zinc-500 italic">
                <span>Team Assignment:</span>
                <span>No team assigned yet</span>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {!accepted && invitationData && (
          <form onSubmit={handleAccept} className="space-y-4">
            {/* New User: Full Name Input */}
            {isBrandNewUser && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">Your Full Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amit Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Password input — only needed when NOT already authenticated with matching email */}
            {!isMatchingAuthenticatedUser && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-300">
                    {invitationData.isExistingUser ? 'Enter Account Password *' : 'Create Password *'}
                  </label>
                  {invitationData.isExistingUser && (
                    <a
                      href="/forgot-password"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder={invitationData.isExistingUser ? 'Your PingStack password' : 'At least 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {isMatchingAuthenticatedUser 
                      ? 'Accept Invitation & Open Workspace' 
                      : (invitationData.isExistingUser ? 'Sign In & Accept Invitation' : 'Create Account & Join Workspace')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login if invalid */}
        {error && !invitationData && (
          <div className="text-center pt-2">
            <a
              href="/login"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
            >
              Return to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
