'use client';

import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ImportLimitModalProps {
  limitInfo: {
    importCount: number;
    remainingQuota: number;
    maxContacts: number;
    currentCount: number;
    planType: string;
  };
  onConfirmTruncated: () => void;
  onCancel: () => void;
}

export default function ImportLimitModal({ limitInfo, onConfirmTruncated, onCancel }: ImportLimitModalProps) {
  const { importCount, remainingQuota, maxContacts, currentCount, planType } = limitInfo;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-amber-500/30 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative text-left animate-in zoom-in-95 duration-300">
        <button
          onClick={onCancel}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-black text-fg mb-2 tracking-tight">Plan Contact Limit Reached</h3>
        <p className="text-xs text-muted font-medium leading-relaxed mb-6">
          Your <strong className="text-fg uppercase">{planType}</strong> plan allows up to <strong className="text-fg">{maxContacts}</strong> total contacts. You currently have <strong className="text-fg">{currentCount}</strong> contacts and can add up to <strong className="text-amber-400 font-bold">{remainingQuota}</strong> more contacts.
        </p>

        <div className="p-4 bg-glass-input border border-glass-border rounded-2xl mb-8 space-y-2 text-xs font-semibold">
          <div className="flex justify-between text-muted">
            <span>New Contacts in Import:</span>
            <span className="font-mono text-fg font-bold">{importCount}</span>
          </div>
          <div className="flex justify-between text-amber-400">
            <span>Quota Available to Add:</span>
            <span className="font-mono font-bold">{remainingQuota}</span>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={onConfirmTruncated}
            disabled={remainingQuota <= 0}
            className="w-full py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer flex items-center justify-center border-0 outline-none"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Import First {remainingQuota} Contacts
          </button>

          <button
            onClick={onCancel}
            className="w-full py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors border-0 outline-none"
          >
            Cancel Import
          </button>
        </div>
      </div>
    </div>
  );
}
