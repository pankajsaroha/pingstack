'use client';

import { useRef, useState, useMemo } from 'react';
import { Upload, CheckCircle2, FileText, AlertTriangle, RefreshCw, Eye, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { isValidPhoneNumber, normalizePhoneNumber, detectPhoneColumn } from '@/lib/phone';

export interface DuplicateGroup {
  phone: string;
  rows: Array<{
    rowIndex: number;
    data: Record<string, any>;
  }>;
}

export interface ParsedExcelFile {
  fileName: string;
  headers: string[];
  dataMatrix: any[][];
  rows: Record<string, any>[];
  validPhoneCount: number;
  invalidPhoneCount: number;
  uniquePhoneCount: number;
  duplicatePhoneCount: number;
  duplicateRowCount: number;
  duplicateGroups: DuplicateGroup[];
  phoneHeader: string;
  detectedPhoneHeader: string;
}

/**
 * Resolves effective recipient rows from parsed Excel data and duplicate handling policy.
 */
export function getEffectiveExcelRows(
  rows: Record<string, any>[],
  duplicateHandling: 'KEEP_ALL' | 'REMOVE_DUPLICATES' | null | undefined
): Record<string, any>[] {
  const validRows = rows.filter((r) => r._isPhoneValid && r._phone);
  if (duplicateHandling === 'REMOVE_DUPLICATES') {
    const seen = new Set<string>();
    const deduped: Record<string, any>[] = [];
    validRows.forEach((r) => {
      if (!seen.has(r._phone)) {
        seen.add(r._phone);
        deduped.push(r);
      }
    });
    return deduped;
  }
  return validRows;
}

/**
 * Re-evaluates spreadsheet rows and counts against a selected phone header.
 */
export function evaluateExcelRecipients(
  headers: string[],
  dataMatrix: any[][],
  phoneHeader: string
): {
  rows: Record<string, any>[];
  validPhoneCount: number;
  invalidPhoneCount: number;
  uniquePhoneCount: number;
  duplicatePhoneCount: number;
  duplicateRowCount: number;
  duplicateGroups: DuplicateGroup[];
} {
  let validPhoneCount = 0;
  let invalidPhoneCount = 0;
  const parsedRows: Record<string, any>[] = [];
  const phoneMap = new Map<string, Array<{ rowIndex: number; data: Record<string, any> }>>();

  const phoneColIdx = headers.indexOf(phoneHeader);

  dataMatrix.forEach((row, rIdx) => {
    const rawPhone = phoneColIdx >= 0 && row[phoneColIdx] !== undefined ? String(row[phoneColIdx]).trim() : '';
    const isValValid = isValidPhoneNumber(rawPhone);
    const cleanPhone = isValValid ? normalizePhoneNumber(rawPhone) : '';

    const rowObj: Record<string, any> = {
      _phone: cleanPhone,
      _isPhoneValid: isValValid,
      _rawRowIndex: rIdx + 2,
    };

    headers.forEach((header, hIdx) => {
      rowObj[header] = row[hIdx] !== undefined ? String(row[hIdx]).trim() : '';
    });

    if (isValValid) {
      validPhoneCount++;
      parsedRows.push(rowObj);

      const existing = phoneMap.get(cleanPhone) || [];
      existing.push({ rowIndex: rIdx + 2, data: rowObj });
      phoneMap.set(cleanPhone, existing);
    } else if (rawPhone.length > 0) {
      invalidPhoneCount++;
    }
  });

  const uniquePhoneCount = phoneMap.size;
  const duplicateGroups: DuplicateGroup[] = [];
  let duplicatePhoneCount = 0;

  phoneMap.forEach((occurrences, phone) => {
    if (occurrences.length > 1) {
      duplicatePhoneCount++;
      duplicateGroups.push({
        phone,
        rows: occurrences,
      });
    }
  });

  const duplicateRowCount = validPhoneCount - uniquePhoneCount;

  return {
    rows: parsedRows,
    validPhoneCount,
    invalidPhoneCount,
    uniquePhoneCount,
    duplicatePhoneCount,
    duplicateRowCount,
    duplicateGroups,
  };
}

interface ExcelUploaderProps {
  parsedFile: ParsedExcelFile | null;
  varsDetected?: string[];
  duplicateHandling?: 'KEEP_ALL' | 'REMOVE_DUPLICATES' | null;
  onOpenDuplicateModal?: () => void;
  onParsed: (data: ParsedExcelFile) => void;
  onClear: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ExcelUploader({
  parsedFile,
  varsDetected = [],
  duplicateHandling,
  onOpenDuplicateModal,
  onParsed,
  onClear,
  onToast,
}: ExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(true);

  const effectiveRows = useMemo(() => {
    if (!parsedFile) return [];
    return getEffectiveExcelRows(parsedFile.rows, duplicateHandling);
  }, [parsedFile, duplicateHandling]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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

          if (headers.length === 0 || dataMatrix.length === 0) {
            onToast('Spreadsheet contains no data rows.', 'error');
            return;
          }

          // 2. Identify phone column with 2-stage detector
          const { detectedHeader, confidence } = detectPhoneColumn(headers, dataMatrix, true);
          const initialPhoneHeader = detectedHeader || headers[0] || '';

          // 3. Process data rows
          const evaluated = evaluateExcelRecipients(headers, dataMatrix, initialPhoneHeader);

          onParsed({
            fileName: file.name,
            headers,
            dataMatrix,
            rows: evaluated.rows,
            validPhoneCount: evaluated.validPhoneCount,
            invalidPhoneCount: evaluated.invalidPhoneCount,
            uniquePhoneCount: evaluated.uniquePhoneCount,
            duplicatePhoneCount: evaluated.duplicatePhoneCount,
            duplicateRowCount: evaluated.duplicateRowCount,
            duplicateGroups: evaluated.duplicateGroups,
            phoneHeader: initialPhoneHeader,
            detectedPhoneHeader: initialPhoneHeader,
          });

          if (evaluated.validPhoneCount === 0) {
            onToast(`File loaded. Please select the correct phone column below (${evaluated.invalidPhoneCount} invalid/empty numbers).`, 'info');
          } else if (evaluated.duplicateRowCount > 0) {
            onToast(`Loaded ${evaluated.validPhoneCount} rows from ${file.name} (${evaluated.duplicatePhoneCount} duplicate phone numbers found).`, 'info');
          } else {
            onToast(`Loaded ${evaluated.validPhoneCount} valid recipients from ${file.name}`, 'success');
          }
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

  const handlePhoneHeaderChange = (newHeader: string) => {
    if (!parsedFile) return;
    const evaluated = evaluateExcelRecipients(parsedFile.headers, parsedFile.dataMatrix, newHeader);
    onParsed({
      ...parsedFile,
      phoneHeader: newHeader,
      rows: evaluated.rows,
      validPhoneCount: evaluated.validPhoneCount,
      invalidPhoneCount: evaluated.invalidPhoneCount,
      uniquePhoneCount: evaluated.uniquePhoneCount,
      duplicatePhoneCount: evaluated.duplicatePhoneCount,
      duplicateRowCount: evaluated.duplicateRowCount,
      duplicateGroups: evaluated.duplicateGroups,
    });
    if (evaluated.validPhoneCount > 0) {
      onToast(`Selected "${newHeader}" (${evaluated.validPhoneCount} valid rows)`, 'success');
    } else {
      onToast(`Selected "${newHeader}" (0 valid recipients found)`, 'info');
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
            <div className="min-w-0 p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-0.5">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Recipients Detected</p>
              {parsedFile.validPhoneCount > 0 ? (
                <p className="text-xs font-black text-emerald-400 truncate">
                  ✓ {parsedFile.validPhoneCount} valid recipients ({parsedFile.headers.length} columns)
                </p>
              ) : (
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">0 valid recipients in &ldquo;{parsedFile.phoneHeader}&rdquo;</span>
                </p>
              )}
            </div>

            <div className="min-w-0 p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider truncate">Phone Column</p>
                <span className="text-[9px] text-muted shrink-0">Change if needed</span>
              </div>
              <select
                value={parsedFile.phoneHeader}
                onChange={(e) => handlePhoneHeaderChange(e.target.value)}
                className="w-full max-w-full min-w-0 truncate bg-bg border border-glass-border rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 cursor-pointer"
              >
                {parsedFile.headers.map((h) => (
                  <option key={h} value={h}>
                    {h} {h === parsedFile.detectedPhoneHeader ? '(Auto-detected)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {parsedFile.invalidPhoneCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{parsedFile.invalidPhoneCount} row(s) skipped due to missing or invalid phone numbers.</span>
            </div>
          )}

          {/* Duplicate Phone Numbers Banner */}
          {parsedFile.duplicateRowCount > 0 && (
            <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
              duplicateHandling === 'KEEP_ALL'
                ? 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100'
                : duplicateHandling === 'REMOVE_DUPLICATES'
                ? 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 text-zinc-900 dark:text-zinc-100'
            }`}>
              <div className="flex items-start gap-2.5 min-w-0">
                <Users className="w-4 h-4 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                    {parsedFile.duplicatePhoneCount} duplicate phone number{parsedFile.duplicatePhoneCount === 1 ? '' : 's'} found across {parsedFile.duplicateGroups.reduce((acc, g) => acc + g.rows.length, 0)} rows
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {duplicateHandling === 'KEEP_ALL'
                      ? `Setting: Keeping all ${parsedFile.validPhoneCount} rows (the same number may receive multiple messages)`
                      : duplicateHandling === 'REMOVE_DUPLICATES'
                      ? `Setting: Deduplicated to ${parsedFile.uniquePhoneCount} unique recipients (1 message per number)`
                      : 'Action required: Choose whether to keep all rows or remove duplicates.'}
                  </p>
                </div>
              </div>
              {onOpenDuplicateModal && (
                <button
                  type="button"
                  onClick={onOpenDuplicateModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                >
                  {duplicateHandling ? 'Change Selection' : 'Review & Choose'}
                </button>
              )}
            </div>
          )}

          {/* Data Preview Table (First 5 Rows) */}
          {showPreview && effectiveRows.length > 0 && (
            <div className="pt-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted mb-1.5">
                Data Preview (First {Math.min(5, effectiveRows.length)} of {effectiveRows.length} rows)
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
                    {effectiveRows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02]">
                        {parsedFile.headers.map((h) => (
                          <td key={h} className={`px-3 py-1.5 font-mono whitespace-nowrap ${h === parsedFile.phoneHeader ? 'text-emerald-300 font-bold' : 'text-muted hover:text-fg'}`}>
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

