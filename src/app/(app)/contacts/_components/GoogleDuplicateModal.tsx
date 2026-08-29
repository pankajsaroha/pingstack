'use client';

import { X, Users, AlertTriangle } from 'lucide-react';

interface GoogleDuplicateModalProps {
  duplicateData: {
    duplicates: Array<{
      phone_number: string;
      newName: string;
      existingName: string;
    }>;
    newCount: number;
    totalGoogleCount: number;
  };
  onSkipAll: () => void;
  onOverwriteAll: () => void;
  onCancel: () => void;
}

export default function GoogleDuplicateModal({
  duplicateData,
  onSkipAll,
  onOverwriteAll,
  onCancel,
}: GoogleDuplicateModalProps) {
  const { duplicates, newCount, totalGoogleCount } = duplicateData;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-amber-500/30 rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300 text-left">
        <button
          onClick={onCancel}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-2xl font-black text-fg mb-2 tracking-tight">Duplicate Contacts Found</h3>
        <p className="text-muted text-xs font-semibold leading-relaxed mb-6">
          Google Import found <span className="text-amber-400 font-bold">{duplicates.length} duplicate phone number{duplicates.length > 1 ? 's' : ''}</span> already saved in your directory.
        </p>

        {/* Duplicate Preview List */}
        <div className="max-h-48 overflow-y-auto bg-glass-input/50 border border-glass-border rounded-2xl p-4 mb-6 space-y-3 divide-y divide-white/5">
          {duplicates.map((dup, idx) => (
            <div key={idx} className="pt-2 first:pt-0 text-xs font-sans">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-indigo-400">{dup.phone_number}</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Duplicate
                </span>
              </div>
              <div className="flex items-center justify-between text-muted text-[11px] mt-1 font-semibold">
                <span>Existing: <strong className="text-fg">{dup.existingName}</strong></span>
                <span>Google: <strong className="text-fg">{dup.newName}</strong></span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted font-bold uppercase tracking-wider mb-4">
          Choose how to handle duplicates ({newCount} new contact{newCount !== 1 ? 's' : ''} will be added):
        </p>

        <div className="space-y-3">
          <button
            onClick={onSkipAll}
            className="w-full py-4 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer border-0 flex items-center justify-center"
          >
            <Users className="w-4 h-4 mr-2" />
            Skip All Duplicates & Add {newCount} New Contacts
          </button>

          <button
            onClick={onOverwriteAll}
            className="w-full py-3.5 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center"
          >
            Update / Overwrite Duplicates with Google Names
          </button>

          <button
            onClick={onCancel}
            className="w-full py-3 text-muted hover:text-fg font-black text-xs uppercase tracking-widest transition-colors cursor-pointer border-0 bg-transparent"
          >
            Cancel Import
          </button>
        </div>
      </div>
    </div>
  );
}
