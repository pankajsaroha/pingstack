'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Initial theme check
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-glass-card border border-glass-border text-fg hover:bg-glass-card/85 hover:scale-[1.03] transition-all cursor-pointer shadow-sm relative overflow-hidden group"
      aria-label="Toggle theme mode"
    >
      <div className="relative w-4.5 h-4.5 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-4.5 h-4.5 text-amber-400 animate-in spin-in-45 duration-300" />
        ) : (
          <Moon className="w-4.5 h-4.5 text-indigo-500 animate-in spin-in-45 duration-300" />
        )}
      </div>
    </button>
  );
}
