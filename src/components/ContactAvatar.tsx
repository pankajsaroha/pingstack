'use client';

import React, { useState } from 'react';

interface ContactAvatarProps {
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_PALETTES = [
  { bg: 'bg-indigo-500/15 dark:bg-indigo-500/25', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  { bg: 'bg-violet-500/15 dark:bg-violet-500/25', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' },
  { bg: 'bg-emerald-500/15 dark:bg-emerald-500/25', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-sky-500/15 dark:bg-sky-500/25', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30' },
  { bg: 'bg-amber-500/15 dark:bg-amber-500/25', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500/15 dark:bg-rose-500/25', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  { bg: 'bg-teal-500/15 dark:bg-teal-500/25', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30' },
  { bg: 'bg-fuchsia-500/15 dark:bg-fuchsia-500/25', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-500/30' },
];

function getInitialAndPalette(name?: string | null, phone?: string | null) {
  const cleanName = (name || '').trim();
  const cleanPhone = (phone || '').replace(/\D/g, '');

  let initial = '';
  const match = cleanName.match(/[a-zA-Z]/);
  if (match) {
    initial = match[0].toUpperCase();
  } else if (cleanPhone.length > 0 || cleanName.replace(/\D/g, '').length > 0) {
    initial = '#';
  } else if (cleanName.length > 0) {
    initial = cleanName[0].toUpperCase();
  } else {
    initial = '?';
  }

  // Generate deterministic index based on string hash
  const hashKey = cleanName || cleanPhone || 'pingstack';
  let hash = 0;
  for (let i = 0; i < hashKey.length; i++) {
    hash = (hash << 5) - hash + hashKey.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return { initial, palette: AVATAR_PALETTES[index] };
}

const SIZE_CLASSES = {
  xs: { box: 'w-6 h-6', text: 'text-[10px]' },
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-12 h-12', text: 'text-base' },
  xl: { box: 'w-16 h-16', text: 'text-xl' },
};

export default function ContactAvatar({
  name,
  phone,
  avatarUrl,
  size = 'md',
  className = '',
}: ContactAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const { initial, palette } = getInitialAndPalette(name, phone);
  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const showImage = !!avatarUrl && !imageError;

  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center font-bold select-none border transition-all duration-150 overflow-hidden ${
        sizeConfig.box
      } ${
        showImage
          ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800'
          : `${palette.bg} ${palette.text} ${palette.border}`
      } ${className}`}
      title={name || phone || 'Contact'}
    >
      {showImage ? (
        <img
          src={avatarUrl!}
          alt={name || phone || 'Avatar'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <span className={`font-semibold tracking-tight ${sizeConfig.text}`}>
          {initial}
        </span>
      )}
    </div>
  );
}
