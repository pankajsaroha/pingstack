'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/context/tenant-context';
import { 
  X, 
  MessageSquarePlus, 
  CheckCircle2, 
  Loader2, 
  Lightbulb, 
  AlertCircle, 
  Sparkles, 
  MessageSquare,
  Send,
  LucideIcon
} from 'lucide-react';

export type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'general';
export type FeedbackPriority = 'nice_to_have' | 'important' | 'critical';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: LucideIcon }[] = [
  { id: 'bug', label: "Something isn't working", icon: AlertCircle },
  { id: 'feature', label: 'Feature request', icon: Sparkles },
  { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
  { id: 'general', label: 'General feedback', icon: MessageSquare }
];

const PRIORITIES: { id: FeedbackPriority; label: string }[] = [
  { id: 'nice_to_have', label: 'Nice to have' },
  { id: 'important', label: 'Important' },
  { id: 'critical', label: 'Critical' }
];

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const { tenant } = useTenant();

  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('important');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant?.email) {
      setEmail(tenant.email);
    }
  }, [tenant]);

  // Reset form when reopened
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFeatureRequest = type === 'feature';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          priority,
          email: email.trim() || null,
          page: pathname,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        setMessage('');
        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Dialog Box */}
      <div 
        className="relative w-full max-w-lg bg-glass-card/95 backdrop-blur-2xl border border-glass-border rounded-[2rem] shadow-2xl overflow-hidden p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-muted hover:text-fg hover:bg-glass-card border border-transparent hover:border-glass-border transition-all cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          /* Elegant Success Confirmation */
          <div className="py-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-fg tracking-tight">
                Thank you.
              </h3>
              <p className="text-xs text-muted font-medium max-w-xs mx-auto leading-relaxed">
                Your feedback helps shape Pingstack into a better product.
              </p>
            </div>
          </div>
        ) : (
          /* Feedback Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-wider mb-2 border border-indigo-500/20">
                <MessageSquarePlus className="w-3 h-3" />
                <span>Product Feedback</span>
              </div>
              <h3 id="feedback-dialog-title" className="text-xl font-black text-fg tracking-tight">
                Help us improve Pingstack
              </h3>
              <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                Pingstack is evolving. Tell us what would make it better for you.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Feedback Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                Feedback Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setType(item.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all text-left border cursor-pointer ${
                        isSelected
                          ? 'bg-fg text-bg border-fg shadow-sm'
                          : 'bg-glass-input hover:bg-glass-card text-muted hover:text-fg border-glass-border'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textarea Message */}
            <div className="space-y-2">
              <label htmlFor="feedback-message" className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {isFeatureRequest ? 'What would you like Pingstack to do?' : 'What would you like us to know?'}
              </label>
              <textarea
                id="feedback-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  isFeatureRequest
                    ? 'Describe the feature, integration, or workflow you would like to see...'
                    : "Tell us what happened, what you expected, or what you'd like Pingstack to do..."
                }
                className="w-full p-3 bg-glass-input/80 hover:bg-glass-input focus:bg-glass-input border border-glass-border focus:border-fg/30 rounded-2xl text-xs text-fg placeholder:text-muted/60 focus:outline-none transition-all resize-none shadow-inner"
              />
            </div>

            {/* Importance / Priority */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                How important is this to you?
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setPriority(p.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-glass-input hover:bg-glass-card text-muted hover:text-fg border-glass-border'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Email Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="feedback-email" className="text-[11px] font-bold text-fg/80 uppercase tracking-wider block">
                  Your Email
                </label>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                  We&apos;ll notify you once this is built or resolved
                </span>
              </div>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 bg-glass-input/80 hover:bg-glass-input focus:bg-glass-input border border-glass-border focus:border-fg/30 rounded-xl text-xs text-fg placeholder:text-muted/60 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-glass-border">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-bold text-muted hover:text-fg hover:bg-glass-card rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-fg hover:opacity-90 disabled:opacity-50 text-bg rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send feedback</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
