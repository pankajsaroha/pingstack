'use client';

import { useState } from 'react';
import { Settings, Loader2, AlertCircle, RefreshCw, ExternalLink, ChevronDown } from 'lucide-react';

interface ConnectionManagerProps {
  tenant: any;
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

  // Build the Meta Business Manager link using stored business_id / portfolio_id
  const businessId = whatsappAccount?.business_id || whatsappAccount?.portfolio_id || '';
  const metaManagerUrl = businessId
    ? `https://business.facebook.com/latest/settings/whatsapp_account?business_id=${businessId}`
    : 'https://business.facebook.com/settings/';

  return (
    <div className="lg:col-span-2 bg-glass-card border border-glass-border rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between">
      {isSwitching ? (
        <div className="w-full space-y-6">
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">Switch Selected Account</h3>
            <p className="text-sm text-muted mt-1 font-semibold">Select a different WhatsApp Business Profile or Phone ID.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-fg/30 uppercase tracking-widest ml-1">WABA Account</label>
              {discovery && discovery.length > 0 ? (
                <select
                  value={selectedWaba}
                  onChange={(e) => {
                    const waba = discovery.find((w: any) => w.id === e.target.value);
                    onSelectWaba(e.target.value, waba?.phones?.[0]?.id);
                  }}
                  className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                >
                  {discovery.map((waba: any) => (
                    <option key={waba.id} value={waba.id} className="bg-bg text-fg">{waba.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-muted py-4 ml-1">No WABAs found</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-fg/30 uppercase tracking-widest ml-1">Phone Asset</label>
              {selectedWaba && discovery?.find((w: any) => w.id === selectedWaba)?.phones?.length > 0 ? (
                <select
                  value={selectedPhone}
                  onChange={(e) => onSelectPhone(e.target.value)}
                  className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                >
                  {(discovery ?? []).find((w: any) => w.id === selectedWaba)?.phones?.map((phone: any) => (
                    <option key={phone.id} value={phone.id} className="bg-bg text-fg">
                      {phone.verified_name} ({phone.display_phone_number})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-muted py-4 ml-1">No phone assets available</div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={onCancelSwitch}
              className="px-6 h-12 border border-glass-border text-muted hover:text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onFinishOnboarding}
              disabled={connecting || !selectedWaba || !selectedPhone}
              className="px-8 h-12 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Save Selection'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-fg/60" />
            </div>
            <div>
              <h3 className="text-xl font-black text-fg tracking-tight">Manage Connection</h3>
              <p className="text-sm text-muted mt-1 font-semibold">Configure your WhatsApp Business Account link.</p>
            </div>
          </div>

          {/* Connection status details */}
          <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-glass-border">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-fg/30 uppercase tracking-widest">Connection State</span>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="text-xs font-black text-fg">Active &amp; Synced</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-fg/30 uppercase tracking-widest">WhatsApp WABA ID</span>
              <p className="text-xs font-mono font-bold text-fg/75 truncate select-all">{whatsappAccount?.business_id || 'Not Associated'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-fg/30 uppercase tracking-widest">Phone Asset ID</span>
              <p className="text-xs font-mono font-bold text-fg/75 truncate select-all">{whatsappAccount?.phone_number_id || 'Not Associated'}</p>
            </div>
          </div>

          {/* Primary actions row */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {/* Refresh Account — primary CTA for users waiting on business approval / phone numbers */}
            <button
              onClick={onRefreshAccount}
              disabled={refreshing}
              title="Re-fetch your Meta account status, newly approved phone numbers, and billing"
              className="flex items-center gap-2 px-5 h-11 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh Account'}
            </button>

            {/* Open Meta Business Manager to add phone / billing */}
            <a
              href={metaManagerUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Meta Business Manager to add a phone number or payment method"
              className="flex items-center gap-2 px-5 h-11 bg-glass-input hover:bg-white/10 border border-glass-border text-fg/70 hover:text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Meta Manager
            </a>

            {/* More options toggle */}
            <button
              onClick={() => setShowMore(v => !v)}
              className="ml-auto flex items-center gap-1.5 px-4 h-11 border border-glass-border text-muted hover:text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              More
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded more options */}
          {showMore && (
            <div className="mt-3 flex flex-wrap gap-3 pt-4 border-t border-glass-border animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={onSwitchAccount}
                disabled={refreshing}
                className="px-5 h-10 bg-fg text-bg hover:opacity-90 disabled:opacity-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm"
              >
                Switch Account
              </button>
              <button
                onClick={onResetConnection}
                className="px-5 h-10 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Reset Connection
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
