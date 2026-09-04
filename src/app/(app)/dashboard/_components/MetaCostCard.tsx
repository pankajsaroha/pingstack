'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Settings2 } from 'lucide-react';

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
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Meta API Charges
            </h3>
          </div>
          <button
            onClick={onConfigureClick}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3 h-3" />
            <span>Budget</span>
          </button>
        </div>

        {/* Mode Select Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700/60 mb-4">
          <button
            onClick={() => setCostMode('month')}
            className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              costMode === 'month' 
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setCostMode('last_payment')}
            className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              costMode === 'last_payment' 
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Since Last Paid
          </button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
            ₹{(costMode === 'month' ? stats.estimatedCostThisMonth : stats.estimatedCostSinceLastPayment).toFixed(2)}
          </span>
          <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase">INR</span>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
          {costMode === 'month' ? (
            <span>Estimated Meta conversation costs accrued this calendar month.</span>
          ) : (
            <span>
              Accrued since last payment: <strong>{stats.lastMetaPaymentAt ? new Date(stats.lastMetaPaymentAt).toLocaleDateString() : 'None Recorded'}</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Budget warnings / Pay link */}
      <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
        {stats.estimatedCostSinceLastPayment > stats.metaBudgetLimit ? (
          <div className="space-y-2">
            <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-[11px] font-medium leading-relaxed">
              ⚠️ Over limit: ₹{stats.estimatedCostSinceLastPayment.toFixed(2)} / ₹{stats.metaBudgetLimit}
            </div>
            <a
              href="https://business.facebook.com/billing_hub"
              target="_blank"
              rel="noreferrer"
              className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>Pay on Meta Hub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <a
            href="https://business.facebook.com/billing_hub"
            target="_blank"
            rel="noreferrer"
            className="w-full py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Meta Billing Hub</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        )}
      </div>
    </div>
  );
}
