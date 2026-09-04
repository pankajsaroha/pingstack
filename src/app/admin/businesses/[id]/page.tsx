'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ArrowLeft,
  MessageSquare,
  CreditCard,
  Trash2,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Loader2,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.id;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form states
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [planNote, setPlanNote] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBusinessDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`);
      if (!res.ok) throw new Error('Business not found');
      const json = await res.json();
      setData(json);
      setSelectedPlan(json.business.planType || 'starter');
    } catch (err: any) {
      setError(err.message || 'Failed to load business');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessId]);

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan, note: planNote }),
      });
      const result = await res.json();
      if (res.ok) {
        setIsPlanModalOpen(false);
        setPlanNote('');
        fetchBusinessDetails();
      } else {
        alert(result.error || 'Failed to update plan');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!data) return;
    const isSuspended = data.business.subscriptionStatus === 'suspended';
    const action = isSuspended ? 'reactivate' : 'suspend';

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: statusReason }),
      });
      const result = await res.json();
      if (res.ok) {
        setIsStatusModalOpen(false);
        setStatusReason('');
        fetchBusinessDetails();
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    if (deleteConfirmName.trim() !== data.business.name.trim()) {
      alert('Business name confirmation does not match.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: deleteConfirmName }),
      });
      const result = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        router.push('/admin/businesses');
      } else {
        alert(result.error || 'Failed to delete business');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting business');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Loading business inspector...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Business Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400/80">{error || 'Unable to locate business records.'}</p>
        <Link
          href="/admin/businesses"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Businesses</span>
        </Link>
      </div>
    );
  }

  const { business, owner, users, whatsapp, usage, planConfig, timeline } = data;
  const isSuspended = business.subscriptionStatus === 'suspended';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Back Navigation */}
      <div>
        <Link
          href="/admin/businesses"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Businesses Directory</span>
        </Link>
      </div>

      {/* Main Business Header Card */}
      <div className="p-6 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{business.name}</h1>
              {/* Plan Badge */}
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {business.planType}
              </span>
              {/* Account Status Badge */}
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded ${
                  isSuspended
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
              </span>
              {/* WhatsApp Status Badge */}
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded ${
                  whatsapp?.status === 'ACTIVE' || whatsapp?.status === 'CONNECTED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {whatsapp ? `WhatsApp ${whatsapp.status}` : 'WhatsApp Disconnected'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              <span>ID: {business.publicId || business.id}</span>
              <span>•</span>
              <span>Owner: {owner?.email || '—'}</span>
              <span>•</span>
              <span>Registered {new Date(business.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Change Plan</span>
            </button>

            <button
              onClick={() => setIsStatusModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                isSuspended
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'
              }`}
            >
              {isSuspended ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              <span>{isSuspended ? 'Reactivate Account' : 'Suspend Account'}</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Business</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Critical Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: WhatsApp Business Details */}
        <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">WhatsApp Cloud API Connection</h3>
            </div>
            {whatsapp?.status === 'ACTIVE' || whatsapp?.status === 'CONNECTED' ? (
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Pending
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500">Provider</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-300">{whatsapp?.provider || 'META'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500">Phone Number ID</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">{whatsapp?.phoneNumberId || 'Not registered'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500">WABA Business ID</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">{whatsapp?.businessId || 'Not connected'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
              <span className="text-zinc-500">Approved Templates</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-300">
                {usage.templatesApproved} / {usage.templates}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Last Webhook Sync</span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400">
                {whatsapp?.updatedAt ? new Date(whatsapp.updatedAt).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Platform Usage & Quotas */}
        <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Resource Usage vs Plan Limits</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
              {business.planType} Tier
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Contacts */}
            <div>
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                <span>Contacts</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {usage.contacts.toLocaleString()} / {usage.contactsLimit === Infinity ? 'Unlimited' : usage.contactsLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((usage.contacts / (usage.contactsLimit || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Daily Template Sends */}
            <div>
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                <span>Daily Template Sends</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {usage.messagesToday.toLocaleString()} / {usage.dailyTemplateLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((usage.messagesToday / (usage.dailyTemplateLimit || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Storage Usage */}
            <div>
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                <span>Media Storage</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {usage.storageMb} MB / {usage.storageLimitMb} MB
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((usage.storageMb / (usage.storageLimitMb || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Lifetime stats */}
            <div className="pt-2 grid grid-cols-4 gap-2 text-center text-[10px] font-mono bg-zinc-50 dark:bg-zinc-950/40 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/40">
              <div>
                <div className="text-zinc-500">Sent</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-200">{usage.messagesSent}</div>
              </div>
              <div>
                <div className="text-zinc-500">Delivered</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">{usage.messagesDelivered}</div>
              </div>
              <div>
                <div className="text-zinc-500">Read</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">{usage.messagesRead}</div>
              </div>
              <div>
                <div className="text-zinc-500">Failed</div>
                <div className="font-bold text-rose-600 dark:text-rose-400">{usage.messagesFailed}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline Section */}
      <div className="p-5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Activity & Audit Timeline</h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">Chronological business events</span>
        </div>

        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800/80 pl-8">
          {timeline.map((item: any, idx: number) => (
            <div key={item.id || idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-500" />
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">{item.title}</span>
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: CHANGE PLAN */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 text-zinc-900 dark:text-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span>Change Business Plan</span>
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePlan} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Select Target Plan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['starter', 'growth', 'pro'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlan(p)}
                      className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                        selectedPlan === p
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Admin Internal Note (Audited)
                </label>
                <textarea
                  value={planNote}
                  onChange={(e) => setPlanNote(e.target.value)}
                  placeholder="e.g. Upgraded per enterprise sales agreement or custom pilot contract..."
                  rows={3}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUSPEND / REACTIVATE */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 text-zinc-900 dark:text-zinc-100 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isSuspended ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {isSuspended ? 'Reactivate Business Account?' : 'Suspend Business Account?'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isSuspended
                    ? 'This will restore WhatsApp campaign and messaging capabilities.'
                    : 'Suspended businesses cannot dispatch campaigns or send WhatsApp messages.'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Reason / Internal Note
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Reason for suspension or reactivation..."
                rows={2}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-700 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-2xs ${
                  isSuspended ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSuspended ? 'Confirm Reactivate' : 'Confirm Suspend'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DESTRUCTIVE DELETE CONFIRMATION */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-rose-300 dark:border-rose-900/60 rounded-2xl p-6 space-y-5 text-zinc-900 dark:text-zinc-100 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Delete &ldquo;{business.name}&rdquo;?</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  This permanently removes the business, its WhatsApp accounts, templates, contacts, campaigns, and messaging history. <strong className="text-rose-600 dark:text-rose-400">This action cannot be undone.</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleDeleteBusiness} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 block">
                  Please type <span className="font-mono font-bold text-zinc-900 dark:text-white select-all bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">{business.name}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={business.name}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmName('');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || deleteConfirmName.trim() !== business.name.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
