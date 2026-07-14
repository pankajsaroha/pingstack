'use client';

import { formatSeparatorDate } from './utils';

interface DateSeparatorProps {
  dateString: string;
}

export default function DateSeparator({ dateString }: DateSeparatorProps) {
  return (
    <div className="flex justify-center py-4 pointer-events-none w-full">
      <span className="bg-bg/95 backdrop-blur-md border border-glass-border px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-fg/50 shadow-md">
        {formatSeparatorDate(dateString)}
      </span>
    </div>
  );
}
