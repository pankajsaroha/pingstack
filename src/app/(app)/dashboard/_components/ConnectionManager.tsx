'use client';

import { useState } from 'react';
import { Settings, Loader2, AlertCircle, RefreshCw, ExternalLink, ChevronDown, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ConnectionManagerProps {
  tenant: any;
  hasSentMessages?: boolean;
  isSwitching: boolean;
  discovery: any[] | null;
  selectedWaba: string;
  selectedPhone: string;
  connecting: boolean;
  refreshing: boolean;
  error: string | null;
  onSwitchAccount: () => void;
  onCancelSwitch: () => void;
  onFinishOnboarding: () => void;
  onSelectWaba: (wabaId: string, firstPhoneId?: string) => void;
  onSelectPhone: (phoneId: string) => void;
  onResetConnection: () => void;
  onRefreshAccount: () => void;
}

export default function ConnectionManager({
  tenant,
  hasSentMessages = false,
  isSwitching,
  discovery,
  selectedWaba,
  selectedPhone,
  connecting,
  refreshing,
  error,
  onSwitchAccount,
  onCancelSwitch,
  onFinishOnboarding,
  onSelectWaba,
  onSelectPhone,
  onResetConnection,
  onRefreshAccount,
}: ConnectionManagerProps) {
  const whatsappAccount = tenant?.whatsapp_account;
  const [showMore, setShowMore] = useState(false);
  const [showRecipientGuideModal, setShowRecipientGuideModal] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('meta_setup_notice_dismissed') === 'true';
    }
    return false;
  });

  const handleDismissNotice = () => {
    setDismissedNotice(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('meta_setup_notice_dismissed', 'true');
    }
  };

  const statusUpper = (whatsappAccount?.status || '').toUpperCase();
  const isApproved = statusUpper === 'APPROVED' || statusUpper === 'ACTIVE';
  const isTest = whatsappAccount?.is_test_number === true;

  // Show notice ONLY for newly added users (hasSentMessages = false) or pending/test accounts
  const isNewOrTestUser =
    !dismissedNotice &&
    (!hasSentMessages || !isApproved || isTest);

  // Build the Meta Business Manager link using stored business_id / portfolio_id
  const businessId = whatsappAccount?.business_id || whatsappAccount?.portfolio_id || '';
  const wabaId = whatsappAccount?.waba_id || whatsappAccount?.business_id || '';

  const metaManagerUrl = businessId
    ? `https://business.facebook.com/latest/settings/whatsapp_account?business_id=${businessId}`
    : 'https://business.facebook.com/settings/';

  const paymentSettingsUrl = businessId
    ? `https://business.facebook.com/billing_hub/payment_settings?business_id=${businessId}`
    : 'https://business.facebook.com/billing_hub/payment_settings';

  const phoneNumbersUrl = wabaId
    ? `https://business.facebook.com/wa/manage/phone-numbers/?waba_id=${wabaId}`
    : (businessId
      ? `https://business.facebook.com/latest/settings/whatsapp_account?business_id=${businessId}`
      : 'https://business.facebook.com/settings/');

  const [registering, setRegistering] = useState(false);

  const handleRegisterPhone = async () => {
    setRegistering(true);
    try {
      const res = await fetch('/api/whatsapp/meta/register', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('✅ Phone number registered successfully with Meta Cloud API!');
        window.location.reload();
      } else {
        alert(`❌ ${data.error || 'Registration failed'}`);
      }
    } catch (err: any) {
      alert(`❌ ${err.message || 'Error executing registration'}`);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div data-tour="tour-whatsapp" className="lg:col-span-2 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
      {isSwitching ? (
        <div className="w-full space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Switch Selected Account</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Select a different WhatsApp Business Account or Phone ID.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase">WABA Account</label>
              {discovery && discovery.length > 0 ? (
                <select
                  value={selectedWaba}
                  onChange={(e) => {
                    const waba = discovery.find((w: any) => w.id === e.target.value);
                    onSelectWaba(e.target.value, waba?.phones?.[0]?.id);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {discovery.map((waba: any) => (
                    <option key={waba.id} value={waba.id}>{waba.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-zinc-400 py-2">No WABAs found</div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase">Phone Asset</label>
              {selectedWaba && discovery?.find((w: any) => w.id === selectedWaba)?.phones?.length > 0 ? (
                <select
                  value={selectedPhone}
                  onChange={(e) => onSelectPhone(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {(discovery ?? []).find((w: any) => w.id === selectedWaba)?.phones?.map((phone: any) => (
                    <option key={phone.id} value={phone.id}>
                      {phone.verified_name} ({phone.display_phone_number})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-zinc-400 py-2">No phone assets available</div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2.5 justify-end pt-2">
            <button
              onClick={onCancelSwitch}
              className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onFinishOnboarding}
              disabled={connecting || !selectedWaba || !selectedPhone}
              className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Selection</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Active WhatsApp Connection</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Meta Cloud API infrastructure link verified.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {whatsappAccount?.status || 'Active'}
              </span>
            </div>
          </div>

          {/* Connection status details */}
          <div className="my-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">Status</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                  {whatsappAccount?.status || 'Active'}
                </span>
                {whatsappAccount?.is_test_number && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Sandbox
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">WABA ID</span>
              <p className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 truncate select-all">
                {whatsappAccount?.business_id || 'Not Associated'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">Phone Asset ID</span>
              <p className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 truncate select-all">
                {whatsappAccount?.phone_number_id || 'Not Associated'}
              </p>
            </div>
          </div>

          {/* Required Meta Setup Guidance Notice */}
          {isNewOrTestUser && (
            <div className="mb-4 p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-left animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Required Meta Setup Before First Broadcast
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleDismissNotice}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs cursor-pointer p-0.5"
                  title="Dismiss notice"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                Ensure a verified phone number and payment method are configured in Meta Business Manager before sending outbound messages.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={paymentSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-indigo-500 transition-colors shadow-2xs"
                >
                  <span>1. Payment Settings</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>

                <a
                  href={phoneNumbersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-indigo-500 transition-colors shadow-2xs"
                >
                  <span>2. WhatsApp Manager</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              </div>
            </div>
          )}

          {/* Primary actions row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={onRefreshAccount}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh Sync'}</span>
            </button>

            <button
              onClick={onSwitchAccount}
              disabled={refreshing}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer"
            >
              Switch Account
            </button>

            <button
              onClick={handleRegisterPhone}
              disabled={registering}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Register Number</span>
            </button>

            <a
              href={metaManagerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span>Meta Hub</span>
            </a>

            <button
              onClick={() => setShowMore(v => !v)}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded more options */}
          {showMore && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-150">
              <button
                onClick={() => setShowRecipientGuideModal(true)}
                className="px-3 py-1.5 border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Sandbox Help ❓
              </button>
              <button
                onClick={onResetConnection}
                className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-xs font-medium transition-colors cursor-pointer ml-auto"
              >
                Reset Connection
              </button>
            </div>
          )}
        </>
      )}

      {/* Test Sandbox Recipient Guide Modal */}
      {showRecipientGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <span className="text-base">🧪</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Sandbox Recipient Setup</h3>
                  <p className="text-[11px] text-zinc-500">Adding recipient numbers in Meta Developer Console.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecipientGuideModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
                <p className="font-semibold text-amber-700 dark:text-amber-400">Meta API Setup Console:</p>
                <a
                  href={`https://developers.facebook.com/apps/${process.env.NEXT_PUBLIC_FB_APP_ID || '1459794049184876'}/whatsapp-business/setup/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-semibold transition-colors text-xs"
                >
                  <span>Open API Setup Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-2 pt-1">
                <p>1. In Meta Developer Console, go to <strong>WhatsApp &rarr; API Setup</strong>.</p>
                <p>2. Under <strong>Step 1: Select phone numbers</strong>, find the <strong>"To"</strong> recipient field.</p>
                <p>3. Select <strong>"Manage phone number list"</strong> and verify your test destination WhatsApp number with OTP.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowRecipientGuideModal(false)}
                className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
