'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface BillingModalProps {
  tenant: any;
  stats: {
    lastMetaPaymentAt: string | null;
    metaBudgetLimit: number;
  };
  onClose: () => void;
  onSaved: () => void;
}

export default function BillingModal({ tenant, stats, onClose, onSaved }: BillingModalProps) {
  const [inputLastPaid, setInputLastPaid] = useState(
    stats.lastMetaPaymentAt ? stats.lastMetaPaymentAt.split('T')[0] : ''
  );
  const [inputBudget, setInputBudget] = useState(stats.metaBudgetLimit || 1000);
  const [updatingBilling, setUpdatingBilling] = useState(false);

  const handleSaveBillingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingBilling(true);
    try {
      const res = await fetch('/api/tenant/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id
        },
        body: JSON.stringify({
          last_meta_payment_at: inputLastPaid ? new Date(inputLastPaid).toISOString() : null,
          meta_budget_limit: inputBudget
        })
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        // still close on error — parent handles toast
        onSaved();
        onClose();
      }
    } catch (err) {
      onClose();
    } finally {
      setUpdatingBilling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-fg uppercase tracking-wider">Meta Billing Config</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-glass-input rounded-full transition-colors text-muted hover:text-fg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveBillingConfig} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Last Payment Date</label>
            <input
              type="date"
              value={inputLastPaid}
              onChange={e => setInputLastPaid(e.target.value)}
              className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
            />
            <p className="text-[9px] text-fg/30 mt-2 px-1 font-semibold">We estimate Meta charges starting from this date.</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Alert Budget Limit (INR)</label>
            <input
              type="number"
              min={1}
              value={inputBudget}
              onChange={e => setInputBudget(Number(e.target.value) || 0)}
              className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all font-mono"
              required
            />
            <p className="text-[9px] text-fg/30 mt-2 px-1 font-semibold">Get notified on the dashboard when spending exceeds this limit.</p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-glass-border hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingBilling}
              className="flex-1 py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              {updatingBilling ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
