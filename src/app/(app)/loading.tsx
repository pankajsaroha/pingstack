import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] py-16">
      <div className="p-8 rounded-3xl bg-glass-card/90 border border-glass-border shadow-2xl flex flex-col items-center max-w-sm text-center animate-in fade-in duration-300">
        <div className="relative mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-md -z-10 animate-pulse" />
        </div>
        <h3 className="text-sm font-black text-fg uppercase tracking-widest">Loading Workspace...</h3>
        <p className="text-[11px] text-muted font-medium mt-1">
          Fetching latest WhatsApp messaging data
        </p>
      </div>
    </div>
  );
}
