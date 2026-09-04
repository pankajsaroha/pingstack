'use client';

import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface FeedbackButtonProps {
  onClick: () => void;
  collapsed?: boolean;
  className?: string;
}

export function FeedbackButton({
  onClick,
  collapsed = false,
  className = ''
}: FeedbackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? 'Give Feedback' : undefined}
      className={`flex items-center text-xs font-bold text-muted hover:text-fg hover:bg-glass-card rounded-xl transition-all cursor-pointer group ${
        collapsed ? 'justify-center p-2.5 w-full' : 'px-3 py-2 w-full gap-2.5'
      } ${className}`}
    >
      <MessageSquarePlus className="w-4 h-4 text-muted group-hover:text-indigo-400 transition-colors flex-shrink-0" />
      {!collapsed && <span className="tracking-wide">Feedback</span>}
    </button>
  );
}
