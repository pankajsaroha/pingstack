'use client';

import { useState } from 'react';

interface MetaCostCardProps {
  stats: {
    estimatedCostThisMonth: number;
    estimatedCostSinceLastPayment: number;
    lastMetaPaymentAt: string | null;
    metaBudgetLimit: number;
  };
  onConfigureClick: () => void;
}

export default function MetaCostCard({ stats, onConfigureClick }: MetaCostCardProps) {
  const [costMode, setCostMode] = useState<'month' | 'last_payment'>('month');

  return (
    <div className="bg-glass-card border border-glass-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-fg uppercase tracking-widest">Meta API Costs</h3>
          <button
            onClick={onConfigureClick}
            className="text-[9px] font-black text-indigo-400 hover:text-fg uppercase tracking-widest transition-colors cursor-pointer"
          >
            Configure
          </button>
        </div>

        {/* Mode Select Tabs */}
        <div className="flex gap-2 p-1 bg-glass-input rounded-xl border border-glass-border mb-6">
          <button
            onClick={() => setCostMode('month')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              costMode === 'month' ? 'bg-fg text-bg' : 'text-fg/40 hover:text-fg'
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setCostMode('last_payment')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              costMode === 'last_payment' ? 'bg-fg text-bg' : 'text-fg/40 hover:text-fg'
            }`}
          >
            Since Last Paid
          </button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-fg">
            ₹{(costMode === 'month' ? stats.estimatedCostThisMonth : stats.estimatedCostSinceLastPayment).toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">INR</span>
        </div>
        <p className="text-[10px] text-muted font-semibold mt-2 leading-relaxed">
          {costMode === 'month' ? (
            <span>Estimated charges for template conversations sent this calendar month.</span>
          ) : (
            <span>
              Estimated charges since last payment: <strong>{stats.lastMetaPaymentAt ? new Date(stats.lastMetaPaymentAt).toLocaleDateString() : 'None Set'}</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Budget warnings / Pay link */}
      <div className="mt-6 border-t border-glass-border pt-4">
        {stats.estimatedCostSinceLastPayment > stats.metaBudgetLimit ? (
          <div className="space-y-3">
            <div className="px-3.5 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold leading-relaxed">
              ⚠️ Budget Exceeded! Estimated cost (₹{stats.estimatedCostSinceLastPayment.toFixed(2)}) is over limit (₹{stats.metaBudgetLimit}).
            </div>
            <a
              href="https://business.facebook.com/billing_hub"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center block transition-all shadow-lg shadow-red-500/10"
            >
              Pay on Meta Business Hub &rarr;
            </a>
          </div>
        ) : (
          <a
            href="https://business.facebook.com/billing_hub"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-glass-input hover:bg-white/5 text-fg/60 hover:text-fg border border-glass-border rounded-xl text-[9px] font-black uppercase tracking-widest text-center block transition-all"
          >
            Meta Billing Hub &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
