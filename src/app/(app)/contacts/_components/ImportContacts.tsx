'use client';

import { Globe, Upload, Loader2 } from 'lucide-react';
import Script from 'next/script';

interface ImportContactsProps {
  isImporting: boolean;
  uploading: boolean;
  onGoogleImport: () => void;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ImportContacts({
  isImporting,
  uploading,
  onGoogleImport,
  onCsvUpload,
}: ImportContactsProps) {
  return (
    <>
      <button
        onClick={onGoogleImport}
        disabled={isImporting}
        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-glass-input border border-glass-border rounded-2xl font-black text-xs text-fg hover:bg-white/10 transition-all cursor-pointer uppercase tracking-wider"
      >
        {isImporting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Globe className="w-4 h-4 mr-2 text-indigo-400" />}
        Google Contacts
      </button>

      <button
        onClick={() => document.getElementById('file-upload')?.click()}
        disabled={uploading}
        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 bg-glass-input border border-glass-border rounded-2xl font-black text-xs text-fg hover:bg-white/10 transition-all cursor-pointer uppercase tracking-wider"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Upload className="w-4 h-4 mr-2 text-emerald-400" />}
        Upload CSV
      </button>

      <input
        id="file-upload"
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={onCsvUpload}
      />
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
    </>
  );
}
