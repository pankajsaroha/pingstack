'use client';

export function Logo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export function LogoIcon({ bgClass = "bg-black", iconClass = "text-white" }: { bgClass?: string; iconClass?: string }) {
  return (
    <div className={`${bgClass} p-1.5 rounded-lg shadow-sm shrink-0 flex items-center justify-center transition-transform`}>
      <Logo className={`w-4 h-4 ${iconClass}`} />
    </div>
  );
}
