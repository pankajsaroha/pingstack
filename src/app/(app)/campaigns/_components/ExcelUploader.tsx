'use client';

import { useRef } from 'react';
import { Upload, CheckCircle2, FileText } from 'lucide-react';

interface ExcelUploaderProps {
  needsVariables: boolean;
  excelData: any[] | null;
  onUploaded: (data: any[]) => void;
  onClear: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ExcelUploader({
  needsVariables,
  excelData,
  onUploaded,
  onClear,
  onToast,
}: ExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const formatted = data.map((row: any) => ({
            phone: String(row[0] || '').replace(/[^0-9+]/g, ''),
            variables: row.slice(1)
          })).filter(r => r.phone.length > 5);

          onUploaded(formatted);
        } catch (err) {
          onToast('Failed to parse file. Check format.', 'error');
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      onToast('Failed to load parser engine.', 'error');
    }
  };

  const handleDownloadSample = () => {
    const csvContent = "Name,Phone Number,Variable 1,Variable 2\nJohn Doe,919876543210,Sample Customer,Today\nJane Smith,919876543211,VIP Member,Discount20";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'pingstack_campaign_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('Sample CSV template downloaded!', 'success');
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 py-3.5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
            excelData
              ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
              : 'border-glass-border hover:border-white/20 hover:bg-glass-input text-fg/50'
          }`}
        >
          {excelData ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{excelData.length} Contacts Uploaded</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted">Upload CSV/Excel</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="px-4 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider cursor-pointer transition-all flex flex-col items-center justify-center shrink-0"
          title="Download Sample CSV Template"
        >
          <FileText className="w-4 h-4 mb-1" />
          <span>Sample File</span>
        </button>
      </div>

      {needsVariables && (
        <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10 text-left">
          <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1.5 flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> PERSONALIZATION METADATA
          </p>
          <p className="text-[10px] text-fg/50 font-bold leading-normal">
            Variables detected. Spreadsheet column format must be:
          </p>
          <div className="mt-2 flex items-center space-x-2 text-[8px] font-mono bg-black/60 border border-glass-border p-2 rounded-lg text-indigo-300">
            <span>Col A: Phone Number</span>
            <span className="text-fg/20">|</span>
            <span>Col B: Var 1</span>
            <span className="text-fg/20">|</span>
            <span>Col C: Var 2...</span>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
      />
    </div>
  );
}
