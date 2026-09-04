'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, Check, Compass } from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  badge?: string;
  position?: 'bottom' | 'top' | 'right' | 'left';
}

interface SiteTourProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected?: boolean;
}

export function SiteTour({ isOpen, onClose, isConnected }: SiteTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      id: 'overview',
      targetSelector: '[data-tour="tour-overview"]',
      title: 'Workspace Overview',
      description: 'Your central command deck to monitor real-time messaging activity, Cloud API infrastructure, and account limits.',
      badge: 'Step 1 of 6',
      position: 'bottom',
    },
    {
      id: 'whatsapp',
      targetSelector: '[data-tour="tour-whatsapp"]',
      title: isConnected ? 'Active WhatsApp Connection' : 'Connect WhatsApp Business',
      description: isConnected
        ? 'Your Meta Cloud API is verified and active. You can manage phone assets, switch WABAs, and configure direct routing here.'
        : 'Link your Meta Business Account with Embedded Signup to begin broadcasting official WhatsApp templates to your audience.',
      badge: 'Step 2 of 6',
      position: 'bottom',
    },
    {
      id: 'inbox',
      targetSelector: '[data-tour="tour-inbox"]',
      title: 'Real-time Live Inbox',
      description: 'Engage in two-way customer conversations with live status receipts, media attachments, and instant template replies.',
      badge: 'Step 3 of 6',
      position: 'right',
    },
    {
      id: 'contacts',
      targetSelector: '[data-tour="tour-contacts"]',
      title: 'Audience & Contacts',
      description: 'Store, import CSV phone lists, sync with Google Contacts, and manage customer directories with instant search.',
      badge: 'Step 4 of 6',
      position: 'right',
    },
    {
      id: 'campaigns',
      targetSelector: '[data-tour="tour-campaigns"]',
      title: 'Broadcast Campaigns',
      description: 'Dispatch high-speed bulk WhatsApp campaigns to segmented audience groups with real-time delivery logs and analytics.',
      badge: 'Step 5 of 6',
      position: 'right',
    },
    {
      id: 'templates',
      targetSelector: '[data-tour="tour-templates"]',
      title: 'Meta Message Templates',
      description: 'Sync your pre-approved WhatsApp templates directly from Meta Business Manager or submit new template drafts for review.',
      badge: 'Step 6 of 6',
      position: 'right',
    },
  ];

  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentStep, updatePosition]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pingstack_workspace_tour_completed', 'true');
    }
    onClose();
  };

  // Compute popover style
  let popoverStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (targetRect && typeof window !== 'undefined') {
    const isMobile = window.innerWidth < 768;
    const padding = 12;

    if (isMobile) {
      popoverStyle = {
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        maxWidth: 'calc(100vw - 32px)',
        margin: '0 auto',
      };
    } else {
      const pos = step.position || 'bottom';

      if (pos === 'right') {
        const top = Math.max(padding, Math.min(window.innerHeight - 280, targetRect.top - 20));
        popoverStyle = {
          position: 'fixed',
          top: `${top}px`,
          left: `${targetRect.right + 16}px`,
          maxWidth: '360px',
        };
      } else if (pos === 'bottom') {
        const left = Math.max(padding, Math.min(window.innerWidth - 380, targetRect.left));
        popoverStyle = {
          position: 'fixed',
          top: `${targetRect.bottom + 16}px`,
          left: `${left}px`,
          maxWidth: '380px',
        };
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none transition-all duration-300">
      {/* Target Highlight Ring & Cutout Backdrop */}
      {targetRect && (
        <div
          className="fixed transition-all duration-300 pointer-events-none rounded-xl border-2 border-indigo-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] z-[101]"
          style={{
            top: `${targetRect.top - 4}px`,
            left: `${targetRect.left - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* Popover Card */}
      <div
        style={popoverStyle}
        className="pointer-events-auto z-[102] w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-5 text-zinc-900 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {step.badge}
            </span>
          </div>

          <button
            onClick={handleFinish}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Skip tour"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <h3 id="tour-step-title" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
          {step.title}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
          {step.description}
        </p>

        {/* Footer & Navigation Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-4 bg-indigo-600 dark:bg-indigo-400'
                    : 'w-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-400'
                }`}
                title={`Go to step ${idx + 1}`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              {isLast ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
