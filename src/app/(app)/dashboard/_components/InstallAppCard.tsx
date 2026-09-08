'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Smartphone, ArrowRight, CheckCircle2, BellRing, BellOff } from 'lucide-react';
import { getPlatformInfo, PlatformInfo } from '@/lib/push-client';

export default function InstallAppCard() {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);

  useEffect(() => {
    setPlatform(getPlatformInfo());
  }, []);

  const isStandalone = platform?.isStandalone || false;
  const permission = platform?.permission || 'default';
  const isFullyConfigured = isStandalone && permission === 'granted';

  // Dynamic context-aware CTA text
  const getCtaText = () => {
    if (isFullyConfigured) return 'Manage notifications';
    if (isStandalone && permission !== 'granted') return 'Enable notifications';
    if (!isStandalone && permission === 'granted') return 'Install PingStack';
    return 'Install & configure';
  };

  // Dynamic context-aware description
  const getDescription = () => {
    if (isFullyConfigured) {
      return 'PingStack is installed and background notifications are active on this device.';
    }
    if (isStandalone && permission === 'denied') {
      return 'PingStack is installed. Notifications are blocked in browser settings — tap to fix.';
    }
    if (isStandalone && permission === 'default') {
      return 'PingStack is installed. Enable notifications to receive lock-screen alerts for incoming chats.';
    }
    if (!isStandalone && permission === 'granted') {
      return 'Notifications are active. Install PingStack on your phone or desktop for an app-like experience.';
    }
    return 'Install PingStack and enable notifications so you never miss an incoming customer WhatsApp message.';
  };

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-2xs transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
            isFullyConfigured
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : permission === 'denied'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100'
          }`}>
            {isFullyConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : permission === 'denied' ? (
              <BellOff className="w-4 h-4 text-amber-500" />
            ) : permission === 'granted' ? (
              <BellRing className="w-4 h-4 text-indigo-500" />
            ) : (
              <Smartphone className="w-4 h-4 text-indigo-500" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                Stay connected to customer messages
              </h3>
              {isFullyConfigured ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              ) : permission === 'denied' ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Action Required
                </span>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {getDescription()}
            </p>
          </div>
        </div>

        <div className="flex items-center self-end sm:self-center shrink-0">
          <Link
            href="/install"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-all duration-150 shadow-2xs group cursor-pointer"
            aria-label={`${getCtaText()} - Open Install PingStack & Notifications guide`}
          >
            <span>{getCtaText()}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
