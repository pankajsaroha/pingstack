'use client';

import { useState } from 'react';
import { X, FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';

interface ExportFormatModalProps {
  group: any;
  onClose: () => void;
  onExport: (format: 'xlsx' | 'csv') => Promise<void>;
}

export default function ExportFormatModal({
  group,
  onClose,
  onExport,
}: ExportFormatModalProps) {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onExport(format);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative text-left animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">Export Group Contacts</h3>
            <p className="text-[11px] text-muted font-medium truncate max-w-[240px]">Group: {group?.name}</p>
          </div>
        </div>

        <p className="text-xs text-muted font-medium mb-6 leading-relaxed">
          Choose your preferred download file format. The file will contain <strong className="text-fg">Name</strong> and <strong className="text-fg">Phone Number</strong> columns.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Excel .xlsx Option */}
          <button
            type="button"
            onClick={() => setFormat('xlsx')}
            className={`p-5 rounded-2xl border flex flex-col items-start transition-all cursor-pointer text-left ${
              format === 'xlsx'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg ring-1 ring-emerald-500/20'
                : 'bg-glass-input border-glass-border text-fg/60 hover:bg-white/5'
            }`}
          >
            <div className="p-2.5 bg-emerald-500/20 rounded-xl mb-3 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-fg block mb-0.5">Excel (.xlsx)</span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Recommended</span>
          </button>

          {/* CSV .csv Option */}
          <button
            type="button"
            onClick={() => setFormat('csv')}
            className={`p-5 rounded-2xl border flex flex-col items-start transition-all cursor-pointer text-left ${
              format === 'csv'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-lg ring-1 ring-indigo-500/20'
                : 'bg-glass-input border-glass-border text-fg/60 hover:bg-white/5'
            }`}
          >
            <div className="p-2.5 bg-indigo-500/20 rounded-xl mb-3 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-fg block mb-0.5">CSV (.csv)</span>
            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Raw Text</span>
          </button>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="px-8 py-3.5 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center border-0 outline-none"
          >
            {downloading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {downloading ? 'Downloading...' : `Download .${format}`}
          </button>
        </div>
      </div>
    </div>
  );
}
