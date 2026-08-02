'use client';

// Shared date utility used by DateSeparator and ChatThread
export const formatSeparatorDate = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();

  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((nowDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};
