'use client';

import { Settings, Loader2, AlertCircle } from 'lucide-react';

interface ConnectionManagerProps {
  tenant: any;
  isSwitching: boolean;
  discovery: any[] | null;
  selectedWaba: string;
  selectedPhone: string;
  connecting: boolean;
  error: string | null;
  onSwitchAccount: () => void;
  onCancelSwitch: () => void;
  onFinishOnboarding: () => void;
  onSelectWaba: (wabaId: string, firstPhoneId?: string) => void;
  onSelectPhone: (phoneId: string) => void;
  onResetConnection: () => void;
}

export default function ConnectionManager({
  tenant,
  isSwitching,
  discovery,
  selectedWaba,
  selectedPhone,
  connecting,
  error,
  onSwitchAccount,
  onCancelSwitch,
  onFinishOnboarding,
  onSelectWaba,
  onSelectPhone,
  onResetConnection,
}: ConnectionManagerProps) {
  const whatsappAccount = tenant?.whatsapp_account;

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
              <p className="text-sm text-muted mt-1 font-semibold">Configure or reset your WhatsApp Cloud API link.</p>
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

          <div className="flex items-center gap-3 mt-6 sm:mt-0 sm:self-end">
            <button
              onClick={onSwitchAccount}
              className="px-6 h-12 bg-fg text-bg hover:opacity-90 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-white/5"
            >
              Switch Account
            </button>
            <button
              onClick={onResetConnection}
              className="px-6 h-12 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Reset Connection
            </button>
          </div>
        </>
      )}
    </div>
  );
}
