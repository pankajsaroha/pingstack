'use client';

import { useRef, useState } from 'react';
import { Upload, CheckCircle2, FileText, AlertTriangle, RefreshCw, Eye } from 'lucide-react';

export interface ParsedExcelFile {
  fileName: string;
  headers: string[];
  rows: Record<string, any>[];
  validPhoneCount: number;
  invalidPhoneCount: number;
  phoneHeader: string;
}

interface ExcelUploaderProps {
  parsedFile: ParsedExcelFile | null;
  varsDetected?: string[];
  onParsed: (data: ParsedExcelFile) => void;
  onClear: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ExcelUploader({
  parsedFile,
  varsDetected = [],
  onParsed,
  onClear,
  onToast,
}: ExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(true);

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
          const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          if (!rawMatrix || rawMatrix.length === 0) {
            onToast('Uploaded file is empty.', 'error');
            return;
          }

          // 1. Determine headers
          const firstRow = rawMatrix[0] || [];
          const hasStringHeaders = firstRow.some((cell: any) => typeof cell === 'string' && isNaN(Number(cell)));

          let headers: string[] = [];
          let dataMatrix: any[][] = [];

          if (hasStringHeaders) {
            headers = firstRow.map((h: any, idx: number) => String(h || `Column_${idx + 1}`).trim());
            dataMatrix = rawMatrix.slice(1);
          } else {
            headers = firstRow.map((_, idx: number) => `Column_${idx + 1}`);
            dataMatrix = rawMatrix;
          }

          // 2. Identify phone column
          let phoneColIdx = -1;
          headers.forEach((h, idx) => {
            if (phoneColIdx === -1 && /^(phone|mobile|number|tel|whatsapp|contact_number|cell_number|phone_number)/i.test(h)) {
              phoneColIdx = idx;
            }
          });

          // Fallback: search columns for phone-like values (7-15 digits)
          if (phoneColIdx === -1 && dataMatrix.length > 0) {
            for (let c = 0; c < headers.length; c++) {
              const sampleDigits = String(dataMatrix[0]?.[c] || '').replace(/\D/g, '');
              if (sampleDigits.length >= 7 && sampleDigits.length <= 15) {
                phoneColIdx = c;
                break;
              }
            }
          }

          if (phoneColIdx === -1) {
            phoneColIdx = 0;
          }

          const phoneHeader = headers[phoneColIdx] || 'Phone';

          // 3. Process data rows
          let validPhoneCount = 0;
          let invalidPhoneCount = 0;
          const parsedRows: Record<string, any>[] = [];

          dataMatrix.forEach((row) => {
            const rawPhone = String(row[phoneColIdx] || '').trim();
            const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
            const digits = cleanPhone.replace(/\D/g, '');

            const rowObj: Record<string, any> = {
              _phone: cleanPhone,
            };

            headers.forEach((header, hIdx) => {
              rowObj[header] = row[hIdx] !== undefined ? String(row[hIdx]).trim() : '';
            });

            if (digits.length >= 7) {
              validPhoneCount++;
              parsedRows.push(rowObj);
            } else if (rawPhone.length > 0) {
              invalidPhoneCount++;
            }
          });

          if (validPhoneCount === 0) {
            onToast('No valid phone numbers found in file. Please ensure a phone column exists.', 'error');
            return;
          }

          onParsed({
            fileName: file.name,
            headers,
            rows: parsedRows,
            validPhoneCount,
            invalidPhoneCount,
            phoneHeader,
          });

          onToast(`Loaded ${validPhoneCount} valid recipients from ${file.name}`, 'success');
        } catch (err: any) {
          console.error('[ExcelUploader] parse error:', err);
          onToast('Failed to parse spreadsheet file. Please check format.', 'error');
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      onToast('Failed to load spreadsheet parser engine.', 'error');
    }
  };

  const handleDownloadSample = () => {
    let headers = ['phone_number'];
    let sampleRow1 = ['919876543210'];
    let sampleRow2 = ['919876543211'];
    let sampleRow3 = ['919876543212'];

    if (varsDetected.length > 0) {
      varsDetected.forEach((varNum, idx) => {
        headers.push(`{{${varNum}}}`);
        if (idx === 0) {
          sampleRow1.push('Rahul');
          sampleRow2.push('Amit');
          sampleRow3.push('Neha');
        } else if (idx === 1) {
          sampleRow1.push('Monday');
          sampleRow2.push('Tuesday');
          sampleRow3.push('Friday');
        } else if (idx === 2) {
          sampleRow1.push('10:00 AM');
          sampleRow2.push('11:00 AM');
          sampleRow3.push('03:00 PM');
        } else {
          sampleRow1.push(`Value_${varNum}_A`);
          sampleRow2.push(`Value_${varNum}_B`);
          sampleRow3.push(`Value_${varNum}_C`);
        }
      });
    } else {
      headers.push('name');
      sampleRow1.push('Rahul');
      sampleRow2.push('Amit');
      sampleRow3.push('Neha');
    }

    const csvContent = [
      headers.join(','),
      sampleRow1.join(','),
      sampleRow2.join(','),
      sampleRow3.join(','),
    ].join('\n');

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
      {!parsedFile ? (
        /* Empty / Upload State */
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-4 px-4 rounded-2xl border-2 border-dashed border-glass-border hover:border-indigo-500/50 hover:bg-glass-input text-fg/60 transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer bg-transparent outline-none"
          >
            <Upload className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-fg">Upload CSV or Excel</span>
            <span className="text-[9px] text-muted">.csv, .xlsx, .xls with phone number column</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-4 py-4 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl text-[9px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider cursor-pointer transition-all flex flex-col items-center justify-center shrink-0 bg-transparent outline-none"
            title="Download Sample CSV Template"
          >
            <FileText className="w-4 h-4 mb-1" />
            <span>Sample File</span>
          </button>
        </div>
      ) : (
        /* Selected State */
        <div className="p-4 bg-glass-input border border-glass-border rounded-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-fg truncate">{parsedFile.fileName}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-2.5 py-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer outline-none"
              >
                <Eye className="w-3 h-3" />
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-[10px] font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer outline-none"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change File</span>
              </button>
            </div>
          </div>

          {/* Validation & Column Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-0.5">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Recipients Detected</p>
              <p className="text-xs font-black text-emerald-400">
                ✓ {parsedFile.validPhoneCount} valid recipients ({parsedFile.headers.length} columns)
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-0.5">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Phone Column</p>
              <p className="text-xs font-mono font-bold text-indigo-300 truncate">
                &ldquo;{parsedFile.phoneHeader}&rdquo;
              </p>
            </div>
          </div>

          {parsedFile.invalidPhoneCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{parsedFile.invalidPhoneCount} row(s) skipped due to missing or invalid phone numbers.</span>
            </div>
          )}

          {/* Data Preview Table (First 5 Rows) */}
          {showPreview && parsedFile.rows.length > 0 && (
            <div className="pt-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted mb-1.5">
                Data Preview (First {Math.min(5, parsedFile.rows.length)} of {parsedFile.rows.length} rows)
              </p>
              <div className="overflow-x-auto rounded-xl border border-glass-border bg-black/30">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-white/5 text-fg/70 font-mono border-b border-glass-border">
                    <tr>
                      {parsedFile.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-bold whitespace-nowrap">
                          {h}
                          {h === parsedFile.phoneHeader && (
                            <span className="ml-1 text-[8px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-normal">
                              Phone
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-fg/90">
                    {parsedFile.rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02]">
                        {parsedFile.headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 font-mono whitespace-nowrap text-muted hover:text-fg">
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

