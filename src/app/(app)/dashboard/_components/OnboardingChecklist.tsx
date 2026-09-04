'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, AlertCircle, ArrowRight, Sparkles, ChevronDown, ChevronUp, X 
} from 'lucide-react';

interface OnboardingChecklistProps {
  tenant: any;
  stats: any;
  isConnected: boolean;
}

export default function OnboardingChecklist({ stats, isConnected }: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const hasContacts = (stats?.totalContacts || 0) > 0;
  const hasTemplates = (stats?.templatesApproved || 0) > 0;
  const hasSentMessage = (stats?.sent || 0) > 0 || (stats?.inboundMessages || 0) > 0;
  const hasCampaign = (stats?.totalCampaigns || stats?.campaignsCount || 0) > 0;

  const steps = [
    {
      id: 'account',
      title: 'Create PingStack account',
      completed: true,
      href: '#',
      actionText: 'Completed'
    },
    {
      id: 'whatsapp',
      title: 'Connect WhatsApp Business',
      completed: isConnected,
      href: '/dashboard',
      actionText: isConnected ? 'Connected' : 'Connect'
    },
    {
      id: 'contacts',
      title: 'Add outreach contacts',
      completed: hasContacts,
      href: '/contacts',
      actionText: hasContacts ? 'Done' : 'Add contacts'
    },
    {
      id: 'template',
      title: 'Sync/Create message template',
      completed: hasTemplates,
      href: '/templates',
      actionText: hasTemplates ? 'Done' : 'Create template'
    },
    {
      id: 'message',
      title: 'Send first customer chat',
      completed: hasSentMessage,
      href: '/inbox',
      actionText: hasSentMessage ? 'Done' : 'Open Inbox'
    },
    {
      id: 'campaign',
      title: 'Launch broadcast campaign',
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
    <div className="mb-8 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-2xs relative overflow-hidden transition-all duration-200">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Getting Started Checklist
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {completedCount}/{totalCount} Completed
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Complete these initial milestones to set up your WhatsApp messaging engine.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            title={isCollapsed ? "Expand checklist" : "Collapse checklist"}
          >
            <span>{isCollapsed ? 'Show' : 'Minimize'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden my-3">
        <div 
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Step Items */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                step.completed 
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40' 
                  : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2 pr-2 min-w-0">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
                <span className={`text-xs truncate font-medium ${
                  step.completed 
                    ? 'text-emerald-900 dark:text-emerald-300 font-semibold' 
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}>
                  {step.title}
                </span>
              </div>

              {step.completed ? (
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-mono font-medium shrink-0">
                  {step.actionText}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="px-2 py-0.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-2xs"
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
