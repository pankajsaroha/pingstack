'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, XCircle, ArrowRight, Sparkles, ChevronDown, ChevronUp, X 
} from 'lucide-react';

interface OnboardingChecklistProps {
  tenant: any;
  stats: any;
  isConnected: boolean;
}

export default function OnboardingChecklist({ tenant, stats, isConnected }: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const hasContacts = (stats?.totalContacts || 0) > 0;
  const hasTemplates = (stats?.templatesApproved || 0) > 0;
  const hasSentMessage = (stats?.sent || 0) > 0 || (stats?.inboundMessages || 0) > 0;
  const hasCampaign = (stats?.totalCampaigns || stats?.campaignsCount || 0) > 0;

  const steps = [
    {
      id: 'account',
      title: 'Create your PingStack account',
      completed: true,
      href: '#',
      actionText: 'Completed'
    },
    {
      id: 'whatsapp',
      title: 'Connect WhatsApp Business',
      completed: isConnected,
      href: '/dashboard?tab=whatsapp',
      actionText: isConnected ? 'Connected' : 'Connect now'
    },
    {
      id: 'contacts',
      title: 'Add your contacts',
      completed: hasContacts,
      href: '/contacts',
      actionText: hasContacts ? 'Done' : 'Add contacts'
    },
    {
      id: 'template',
      title: 'Create your first template',
      completed: hasTemplates,
      href: '/templates',
      actionText: hasTemplates ? 'Done' : 'Create template'
    },
    {
      id: 'message',
      title: 'Send your first message',
      completed: hasSentMessage,
      href: '/inbox',
      actionText: hasSentMessage ? 'Done' : 'Open Inbox'
    },
    {
      id: 'campaign',
      title: 'Create your first campaign',
      completed: hasCampaign,
      href: '/campaigns',
      actionText: hasCampaign ? 'Done' : 'New campaign'
    }
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const isAllCompleted = completedCount === totalCount;

  // Once all steps are completed (or dismissed by user), hide the guide completely
  if (isDismissed || isAllCompleted) return null;

  return (
    <div className="mb-8 bg-glass-card/40 border border-glass-border/40 rounded-2xl p-5 shadow-sm backdrop-blur-md antialiased transform-gpu relative overflow-hidden transition-all duration-300">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-fg tracking-tight flex items-center gap-2">
              Get started with PingStack
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                {completedCount} of {totalCount} completed
              </span>
            </h3>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Complete these setup steps to start messaging your customers effectively.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-3 py-1.5 bg-glass-input border border-glass-border/40 hover:bg-glass-card/60 text-fg rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title={isCollapsed ? "Expand checklist" : "Collapse checklist"}
          >
            <span className="text-[10px] uppercase tracking-wider font-black">{isCollapsed ? 'Show Steps' : 'Minimize'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-muted hover:text-fg hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            title="Dismiss onboarding checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-glass-input rounded-full overflow-hidden border border-glass-border/40 my-3.5">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Step Items - Green cards for completed steps, Red cards for incomplete steps */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-2 border-t border-glass-border/40">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                step.completed 
                  ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15' 
                  : 'bg-red-500/10 border-red-500/25 dark:bg-red-500/15'
              }`}
            >
              <div className="flex items-center space-x-2.5 pr-2 min-w-0">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <span className={`text-xs font-bold truncate ${
                  step.completed 
                    ? 'text-emerald-800 dark:text-emerald-300' 
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {step.title}
                </span>
              </div>

              {step.completed ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0">
                  {step.actionText}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-opacity shrink-0 cursor-pointer shadow-sm"
                >
                  <span>{step.actionText}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
