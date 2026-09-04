'use client';

import { formatSeparatorDate } from './utils';

interface DateSeparatorProps {
  dateString: string;
}

export default function DateSeparator({ dateString }: DateSeparatorProps) {
  return (
    <div className="flex justify-center py-3.5 pointer-events-none w-full">
      <span
        suppressHydrationWarning
        className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 px-3 py-1 rounded-full text-[10px] font-mono text-zinc-600 dark:text-zinc-300 shadow-2xs"
      >
        {formatSeparatorDate(dateString)}
      </span>
    </div>
  );
}
