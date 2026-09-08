'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  User, 
  Mail, 
  Shield, 
  Smartphone, 
  Bell, 
  CreditCard, 
  MessageSquare, 
  Clock, 
  Globe, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Save, 
  LogOut,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useTenant } from '@/context/tenant-context';
import { getPlatformInfo, PlatformInfo } from '@/lib/push-client';
import { PLANS, getActivePlanType, PLAN_CONFIGS } from '@/lib/plans';

export default function WorkspaceSettingsPage() {
  const { tenant, refreshTenant } = useTenant();
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);

  // Form state for workspace name & timezone
  const [workspaceName, setWorkspaceName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setPlatform(getPlatformInfo());
    if (tenant) {
      setWorkspaceName(tenant.name || '');
      setTimezone(tenant.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
  }, [tenant]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/tenant/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName.trim(),
          timezone,
        }),
      });

      if (res.ok) {
        await refreshTenant();
        setSaveStatus({ text: 'Workspace details saved successfully.', type: 'success' });
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        const err = await res.json();
        setSaveStatus({ text: err.error || 'Failed to save settings.', type: 'error' });
      }
    } catch (err: any) {
      setSaveStatus({ text: err.message || 'Connection error.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.replace('/login');
  };

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE' || whatsappAccount?.status === 'CONNECTED';
  const planType = getActivePlanType(tenant?.plan_type);
  const planLimits = PLANS[planType];
  const planConfig = PLAN_CONFIGS[planType];
  const isStandalone = platform?.isStandalone || false;
  const permission = platform?.permission || 'default';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          Workspace Settings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Manage your account identity, workspace profile, WhatsApp connection, and system preferences.
        </p>
      </div>

      {/* Save Status Notification */}
      {saveStatus && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
          saveStatus.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span className="text-xs font-medium">{saveStatus.text}</span>
        </div>
      )}

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Section 1: User & Profile Card */}
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">User Profile</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Your personal credentials and access role</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {tenant?.user_role || 'Member'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Full Name</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{tenant?.user_name || 'PingStack User'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Work Email</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{tenant?.user_email || '—'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Workspace Details & Preferences */}
        <form onSubmit={handleSaveWorkspace} className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Workspace Configuration</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Organization name, identifier, and regional timezone</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (+0:00)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] font-mono text-zinc-400">
              Workspace ID: {tenant?.id ? `${tenant.id.slice(0, 8)}...${tenant.id.slice(-4)}` : '—'}
            </span>

            <button
              type="submit"
              disabled={saving || !workspaceName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Section 3: WhatsApp Connection Status */}
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Meta WhatsApp Integration</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Official Cloud API business connection</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
              isConnected 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {isConnected ? 'Connected' : (whatsappAccount?.status || 'Unlinked')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Phone Asset</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {whatsappAccount?.display_phone_number || whatsappAccount?.phone_number_id || 'Not linked'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">WABA Account ID</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {whatsappAccount?.waba_id || whatsappAccount?.business_id || '—'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Manage Connection on Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Section 4: Notifications & PWA App */}
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Notifications &amp; App Mode</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Lock-screen alert status and PWA installation</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
              permission === 'granted'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : permission === 'denied'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {permission === 'granted' ? 'Alerts Enabled' : permission === 'denied' ? 'Alerts Blocked' : 'Not Configured'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Display Mode</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {isStandalone ? 'Standalone App' : 'Web Browser Tab'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Web Push Protocol</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {platform?.isPushSupported ? 'Supported' : 'Not Supported'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Link
              href="/install"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <span>Open Install &amp; Notifications Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Section 5: Plan & Usage Limits */}
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Commercial Plan &amp; Quotas</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Current tier limits and message retention</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {planConfig.name} Plan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Max Contacts</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {planLimits.maxContacts ? planLimits.maxContacts.toLocaleString() : 'Unlimited'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Daily Send Quota</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {planLimits.templateSendsPerDay ? `${planLimits.templateSendsPerDay.toLocaleString()} / day` : 'Unlimited'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">History Retention</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {planLimits.mediaRetentionDays} days
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>View Plans &amp; Upgrade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Section 6: Security & Active Session */}
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Security &amp; Session</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Authentication state and workspace sign-out</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Authenticated via secure HttpOnly session cookies with JWT token encryption.
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out of Workspace</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
