'use client';

import { useState } from 'react';
import { X, LayoutTemplate, Plus, ExternalLink } from 'lucide-react';

interface TroubleshootModalProps {
  portfolioId: string;
  onClose: () => void;
  onCreateLocal: () => void;
}

export default function TroubleshootModal({
  portfolioId,
  onClose,
  onCreateLocal,
}: TroubleshootModalProps) {
  const [troubleshootTab, setTroubleshootTab] = useState<'new_account' | 'permissions'>('new_account');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-xl w-full p-8 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer bg-transparent border-0 outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center mb-6 text-left">
          <div className="w-14 h-14 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center mr-6">
            <LayoutTemplate className="w-6 h-6 text-fg" />
          </div>
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight leading-none">Sync Finished Empty</h3>
            <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Meta API returned 0 matching templates</p>
          </div>
        </div>

        {/* Selector Tabs */}
        <div className="flex bg-glass-input p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setTroubleshootTab('new_account')}
            className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0 outline-none ${
              troubleshootTab === 'new_account'
                ? 'bg-fg text-bg shadow-md'
                : 'text-muted hover:text-fg bg-transparent'
            }`}
          >
            Brand New Account
          </button>
          <button
            type="button"
            onClick={() => setTroubleshootTab('permissions')}
            className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0 outline-none ${
              troubleshootTab === 'permissions'
                ? 'bg-fg text-bg shadow-md'
                : 'text-muted hover:text-fg bg-transparent'
            }`}
          >
            Permissions Check
          </button>
        </div>

        {troubleshootTab === 'new_account' ? (
          <div className="space-y-6 text-left">
            <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/10">
              <p className="text-xs text-fg/60 font-semibold leading-relaxed">
                If this is a new WhatsApp Business Account, it is completely normal to have no templates. Submit and approve at least one layout on Meta to run sync successfully.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest px-1">Actions</p>

              <div
                onClick={onCreateLocal}
                className="flex items-center p-4 bg-glass-input hover:bg-white/10 rounded-2xl border border-glass-border cursor-pointer transition-all active:scale-[0.99] group"
              >
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mr-4">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-fg uppercase tracking-wider">Create Template Here</h4>
                  <p className="text-[10px] text-muted mt-1 font-semibold">Submit a utility layout directly to Meta from PingStack.</p>
                </div>
              </div>

              <a
                href="https://business.facebook.com/wa/manage/templates"
                target="_blank"
                rel="noreferrer"
                className="flex items-center p-4 bg-glass-input hover:bg-white/10 rounded-2xl border border-glass-border cursor-pointer transition-all active:scale-[0.99] group block"
              >
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mr-4">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-fg uppercase tracking-wider flex items-center">
                    <span>Meta WhatsApp Manager</span>
                    <ExternalLink className="w-3 h-3 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-[10px] text-muted mt-1 font-semibold">Create and configure templates inside WhatsApp Manager Console.</p>
                </div>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
              <p className="text-xs text-fg/60 font-semibold leading-relaxed">
                Verify that your <b>System User</b> credentials have permission assigned to link and discover templates on this specific asset.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest px-1">How to fix permissions:</p>
              <ul className="space-y-3">
                {[
                  { step: 1, text: 'Open Meta Business Suite settings and look under WhatsApp Accounts.' },
                  { step: 2, text: 'Click "People" and select your linked System User profile.' },
                  { step: 3, text: 'Ensure the "Manage WhatsApp Account" slider is set to Active.' }
                ].map((item) => (
                  <li key={item.step} className="flex gap-4 items-start bg-glass-input p-4 rounded-2xl border border-glass-border">
                    <span className="w-6 h-6 rounded-full bg-fg text-bg flex items-center justify-center text-[10px] font-black shrink-0">{item.step}</span>
                    <span className="text-xs text-fg/50 font-bold leading-normal">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={`https://business.facebook.com/latest/settings/whatsapp_account?business_id=${portfolioId}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 bg-fg text-bg rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-neutral-100 transition-all text-center flex items-center justify-center space-x-2 border-0 outline-none"
            >
              <span>Verify Meta Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
