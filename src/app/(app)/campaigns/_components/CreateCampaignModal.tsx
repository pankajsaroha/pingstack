'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Loader2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Users, 
  User, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Info,
  HelpCircle
} from 'lucide-react';
import ExcelUploader, { ParsedExcelFile } from './ExcelUploader';

interface CreateCampaignModalProps {
  templates: any[];
  groups: any[];
  contacts?: any[];
  planType: string;
  initialGroupId?: string;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (campaignData: {
    name: string;
    template_id: string;
    group_id?: string;
    group_ids?: string[];
    contact_ids?: string[];
    scheduled_at: string | null;
    excelData: any[] | null;
    groupVarValues?: Record<string, string> | null;
  }) => Promise<void>;
}

type MainRecipientSource = 'CONTACTS_GROUPS' | 'EXCEL';
type ContactsVarMode = 'SAME_FOR_ALL' | 'PER_RECIPIENT';

export default function CreateCampaignModal({
  templates,
  groups,
  contacts = [],
  planType,
  initialGroupId,
  onClose,
  onToast,
  onSaved,
}: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // 1. Primary Recipient Source: strictly Groups / Contacts OR Excel / CSV
  const [recipientSource, setRecipientSource] = useState<MainRecipientSource>(
    initialGroupId === 'EXCEL' ? 'EXCEL' : 'CONTACTS_GROUPS'
  );

  // Groups & Contacts state
  const [cgSubTab, setCgSubTab] = useState<'CONTACTS' | 'GROUPS'>(
    initialGroupId && initialGroupId !== 'EXCEL' ? 'GROUPS' : 'GROUPS'
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initialGroupId && initialGroupId !== 'EXCEL' ? [initialGroupId] : []
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [cgDropdownOpen, setCgDropdownOpen] = useState(false);
  const cgDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic Variable Modes for Groups & Contacts
  const [contactsVarMode, setContactsVarMode] = useState<ContactsVarMode>('SAME_FOR_ALL');
  const [sameVarValues, setSameVarValues] = useState<Record<string, string>>({});
  const [perRecipientVarValues, setPerRecipientVarValues] = useState<Record<string, Record<string, string>>>({});
  const [perRecipientPage, setPerRecipientPage] = useState(1);

  // Sub-mode for Customize Per Recipient: Manual Entry vs Excel Helper
  const [customizeMethod, setCustomizeMethod] = useState<'MANUAL' | 'EXCEL'>('MANUAL');
  const [excelValuesDragOver, setExcelValuesDragOver] = useState(false);
  const [parsingDynamicExcel, setParsingDynamicExcel] = useState(false);
  const [excelImportSummary, setExcelImportSummary] = useState<{
    matchedCount: number;
    unmatchedCount: number;
    missingRecipientsCount: number;
    fileName: string;
  } | null>(null);
  const excelValuesFileInputRef = useRef<HTMLInputElement>(null);

  // Excel / CSV state
  const [parsedExcelFile, setParsedExcelFile] = useState<ParsedExcelFile | null>(null);
  const [excelColMapping, setExcelColMapping] = useState<Record<string, string>>({});

  // Preview Recipient Index Pager (for multi-recipient preview)
  const [previewIndex, setPreviewIndex] = useState(0);

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (cgDropdownRef.current && !cgDropdownRef.current.contains(event.target as Node)) {
        setCgDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCgDropdownOpen(false);
      }
    };

    if (cgDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cgDropdownOpen]);

  // Active template
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === templateId);
  }, [templateId, templates]);

  // Detect variables e.g. ["1", "2"] from active template
  const varsDetected: string[] = useMemo(() => {
    if (!activeTemplate?.content) return [];
    const matches = activeTemplate.content.match(/\{\{(\d+)\}\}/g) || [];
    const rawNums = Array.from(new Set(matches.map((m: string) => m.replace(/\D/g, ''))));
    return (rawNums as string[]).sort((a: string, b: string) => Number(a) - Number(b));
  }, [activeTemplate]);

  // Reset variable values when template changes (pure generic empty initial values)
  useEffect(() => {
    if (varsDetected.length > 0) {
      const initialSame: Record<string, string> = {};
      varsDetected.forEach((num: string) => {
        initialSame[num] = '';
      });
      setSameVarValues(initialSame);
    } else {
      setSameVarValues({});
    }
    setPreviewIndex(0);
  }, [varsDetected]);

  // Fetch contacts for selected groups to ensure all group members are resolved into rows
  const [groupContactsMap, setGroupContactsMap] = useState<Record<string, any[]>>({});
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);

  useEffect(() => {
    const missingGroupIds = selectedGroupIds.filter((gid) => !groupContactsMap[gid]);
    if (missingGroupIds.length === 0) return;

    let isMounted = true;
    setLoadingGroupContacts(true);

    Promise.all(
      missingGroupIds.map(async (gid) => {
        try {
          const res = await fetch(`/api/groups/${gid}/contacts`);
          if (res.ok) {
            const data = await res.json();
            return { gid, contacts: Array.isArray(data) ? data : [] };
          }
        } catch (e) {
          console.error(`Failed to fetch contacts for group ${gid}:`, e);
        }
        return { gid, contacts: [] };
      })
    ).then((results) => {
      if (!isMounted) return;
      setGroupContactsMap((prev) => {
        const next = { ...prev };
        results.forEach(({ gid, contacts }) => {
          next[gid] = contacts;
        });
        return next;
      });
      setLoadingGroupContacts(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedGroupIds, groupContactsMap]);

  // Auto-map Excel columns when file is parsed or template changes
  useEffect(() => {
    if (parsedExcelFile && varsDetected.length > 0) {
      const newMapping: Record<string, string> = {};
      const nonPhoneHeaders = parsedExcelFile.headers.filter((h) => h !== parsedExcelFile.phoneHeader);

      varsDetected.forEach((varNum, idx) => {
        const exactMatch = parsedExcelFile.headers.find(
          (h) => h.toLowerCase() === `var${varNum}` || h.toLowerCase() === `variable${varNum}` || h === `{{${varNum}}}`
        );
        if (exactMatch) {
          newMapping[varNum] = exactMatch;
        } else if (nonPhoneHeaders[idx]) {
          newMapping[varNum] = nonPhoneHeaders[idx];
        } else {
          newMapping[varNum] = parsedExcelFile.headers[0] || '';
        }
      });
      setExcelColMapping(newMapping);
    }
  }, [parsedExcelFile, varsDetected]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone_number && c.phone_number.includes(q))
    );
  }, [contacts, contactSearch]);

  // Authoritative resolved list of unique recipients for Groups & Contacts
  const resolvedContactsList = useMemo(() => {
    const byPhone = new Map<string, { id?: string; name: string; phone: string }>();

    // 1. Direct contacts
    selectedContactIds.forEach((cId) => {
      const found = contacts.find((c) => c.id === cId);
      if (found && found.phone_number) {
        const clean = String(found.phone_number).replace(/\D/g, '');
        if (clean.length >= 7) {
          byPhone.set(clean, {
            id: found.id,
            name: found.name || 'Customer',
            phone: found.phone_number,
          });
        }
      }
    });

    // 2. Groups (dynamically resolved members)
    selectedGroupIds.forEach((gid) => {
      const gContacts = groupContactsMap[gid] || [];
      gContacts.forEach((c) => {
        if (c && c.phone_number) {
          const clean = String(c.phone_number).replace(/\D/g, '');
          if (clean.length >= 7 && !byPhone.has(clean)) {
            byPhone.set(clean, {
              id: c.id,
              name: c.name || 'Customer',
              phone: c.phone_number,
            });
          }
        }
      });
    });

    return Array.from(byPhone.values());
  }, [contacts, selectedContactIds, selectedGroupIds, groupContactsMap]);

  // Clean digits helper for phone number matching
  const cleanDigits = (val: any) => String(val || '').replace(/\D/g, '');

  // 1. Download dynamic values Excel template for selected recipients
  const handleDownloadDynamicValuesTemplate = () => {
    if (resolvedContactsList.length === 0) {
      onToast('Select at least one contact or group to generate the template.', 'error');
      return;
    }
    if (varsDetected.length === 0) {
      onToast('Selected template does not have any dynamic variables.', 'info');
      return;
    }

    try {
      const headers = ['Phone Number', ...varsDetected.map((_, i) => `Var ${i + 1}`)];
      const rows = resolvedContactsList.map((r) => {
        const existing = perRecipientVarValues[r.phone] || {};
        const rowObj: Record<string, string> = {
          'Phone Number': r.phone,
        };
        varsDetected.forEach((v, i) => {
          rowObj[`Var ${i + 1}`] = existing[v] || '';
        });
        return rowObj;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      worksheet['!cols'] = [
        { wch: 22 },
        ...varsDetected.map(() => ({ wch: 18 })),
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dynamic Values');

      const instructionsData = [
        { 'Campaign Instructions': '1. Do not modify the "Phone Number" column. It is used to match recipients.' },
        { 'Campaign Instructions': '2. Fill in values for each variable column (Var 1, Var 2, etc.).' },
        { 'Campaign Instructions': '3. Save and upload this completed file back to PingStack.' },
      ];
      const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
      instructionsSheet['!cols'] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTemplateName = activeTemplate?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campaign';
      link.setAttribute('download', `${safeTemplateName}_dynamic_values.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onToast(`Downloaded Excel template for ${resolvedContactsList.length} recipients!`, 'success');
    } catch (err: any) {
      console.error('Download template error:', err);
      onToast('Failed to generate Excel template: ' + err.message, 'error');
    }
  };

  // 2. Upload completed dynamic values Excel and populate perRecipientVarValues
  const handleUploadDynamicValuesExcel = async (file: File) => {
    setParsingDynamicExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('Spreadsheet has no sheets');

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows');
      }

      const firstRow = rawRows[0];
      const fileHeaders = Object.keys(firstRow);

      const phoneHeader = fileHeaders.find((h) => {
        const lower = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          lower === 'phonenumber' ||
          lower === 'phone' ||
          lower === 'mobile' ||
          lower === 'contact' ||
          lower === 'number' ||
          lower === 'mobilenumber'
        );
      });

      if (!phoneHeader) {
        throw new Error('Missing "Phone Number" column in uploaded file.');
      }

      const varColumnMap: Record<string, string> = {};
      const detectedVarNums = varsDetected;

      for (let i = 0; i < detectedVarNums.length; i++) {
        const v = detectedVarNums[i];
        const indexBased = i + 1;

        const matchedHeader = fileHeaders.find((h) => {
          const clean = h.trim().toLowerCase().replace(/[\{\}\s_]/g, '');
          return (
            clean === `var${indexBased}` ||
            clean === `variable${indexBased}` ||
            clean === `var${v}` ||
            clean === `variable${v}` ||
            clean === `${v}` ||
            clean === `${indexBased}`
          );
        });

        if (!matchedHeader) {
          throw new Error(
            `Missing variable column for VAR ${indexBased} ({{${v}}}) in uploaded spreadsheet. Please ensure the file was generated for this template.`
          );
        }
        varColumnMap[v] = matchedHeader;
      }

      // Build lookup map for resolved contacts: normalized digits -> original r.phone
      const selectedRecipientsMap = new Map<string, string>();
      resolvedContactsList.forEach((r) => {
        const digits = cleanDigits(r.phone);
        if (digits) {
          selectedRecipientsMap.set(digits, r.phone);
          if (digits.length >= 10) {
            selectedRecipientsMap.set(digits.slice(-10), r.phone);
          }
        }
      });

      const updatedPerRecipientValues: Record<string, Record<string, string>> = {
        ...perRecipientVarValues,
      };

      let unmatchedCount = 0;
      const matchedPhonesSet = new Set<string>();

      rawRows.forEach((row) => {
        const rawPhone = String(row[phoneHeader] || '');
        const rawDigits = cleanDigits(rawPhone);
        if (!rawDigits) return;

        let matchedOriginalPhone = selectedRecipientsMap.get(rawDigits);
        if (!matchedOriginalPhone && rawDigits.length >= 10) {
          matchedOriginalPhone = selectedRecipientsMap.get(rawDigits.slice(-10));
        }

        if (matchedOriginalPhone) {
          matchedPhonesSet.add(matchedOriginalPhone);
          const rowVars: Record<string, string> = updatedPerRecipientValues[matchedOriginalPhone] || {};
          detectedVarNums.forEach((v) => {
            const colName = varColumnMap[v];
            if (colName && row[colName] !== undefined) {
              rowVars[v] = String(row[colName]).trim();
            }
          });
          updatedPerRecipientValues[matchedOriginalPhone] = rowVars;
        } else {
          unmatchedCount++;
        }
      });

      const missingRecipientsCount = Math.max(0, resolvedContactsList.length - matchedPhonesSet.size);

      setPerRecipientVarValues(updatedPerRecipientValues);
      setExcelImportSummary({
        matchedCount: matchedPhonesSet.size,
        unmatchedCount,
        missingRecipientsCount,
        fileName: file.name,
      });

      if (matchedPhonesSet.size === 0) {
        onToast('None of the phone numbers in the file matched the selected recipients.', 'error');
      } else {
        onToast(`Successfully loaded dynamic values for ${matchedPhonesSet.size} recipients!`, 'success');
      }
    } catch (err: any) {
      console.error('Upload dynamic values error:', err);
      onToast('Upload failed: ' + err.message, 'error');
    } finally {
      setParsingDynamicExcel(false);
    }
  };

  // Total unique recipients count
  const cgTotalEstimatedCount = useMemo(() => {
    if (loadingGroupContacts && resolvedContactsList.length === 0 && selectedGroupIds.length > 0) {
      let sum = 0;
      selectedGroupIds.forEach((gid) => {
        const g = groups.find((grp) => grp.id === gid);
        sum += g?.contacts_count || g?.members_count || 0;
      });
      return sum + selectedContactIds.length;
    }
    return resolvedContactsList.length;
  }, [resolvedContactsList, loadingGroupContacts, selectedGroupIds, groups, selectedContactIds]);

  // Total recipients count across current mode
  const totalRecipientsCount = useMemo(() => {
    if (recipientSource === 'CONTACTS_GROUPS') {
      return cgTotalEstimatedCount;
    } else {
      return parsedExcelFile?.validPhoneCount || 0;
    }
  }, [recipientSource, cgTotalEstimatedCount, parsedExcelFile]);

  // Current preview recipient data
  const currentPreviewRecipient = useMemo(() => {
    if (recipientSource === 'CONTACTS_GROUPS') {
      if (resolvedContactsList.length === 0) {
        return { index: 0, total: 1, phone: '+91XXXXXXXXXX', name: 'Sample Customer' };
      }
      const boundedIndex = Math.min(previewIndex, resolvedContactsList.length - 1);
      const recipient = resolvedContactsList[boundedIndex];
      return {
        index: boundedIndex,
        total: resolvedContactsList.length,
        phone: recipient?.phone || '+91XXXXXXXXXX',
        name: recipient?.name || 'Customer',
      };
    } else {
      const rows = parsedExcelFile?.rows || [];
      if (rows.length === 0) {
        return { index: 0, total: 1, phone: '+91XXXXXXXXXX', row: {} };
      }
      const boundedIndex = Math.min(previewIndex, rows.length - 1);
      const row = rows[boundedIndex];
      return {
        index: boundedIndex,
        total: rows.length,
        phone: row?._phone || '+91XXXXXXXXXX',
        row: row || {},
      };
    }
  }, [recipientSource, resolvedContactsList, parsedExcelFile, previewIndex]);

  // Rendered Message Live Preview
  const resolvedMessagePreview = useMemo(() => {
    if (!activeTemplate?.content) return '';
    let content = activeTemplate.content;

    if (recipientSource === 'CONTACTS_GROUPS') {
      const recipient = currentPreviewRecipient;
      if (contactsVarMode === 'SAME_FOR_ALL') {
        varsDetected.forEach((varNum) => {
          const val = sameVarValues[varNum] || `{{${varNum}}}`;
          content = content.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), val);
        });
      } else {
        const customRow = perRecipientVarValues[recipient.phone] || {};
        varsDetected.forEach((varNum) => {
          const val = customRow[varNum] || `{{${varNum}}}`;
          content = content.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), val);
        });
      }
    } else {
      const sampleRow = currentPreviewRecipient.row || {};
      varsDetected.forEach((varNum) => {
        const mappedCol = excelColMapping[varNum];
        const val = mappedCol && sampleRow[mappedCol] !== undefined ? String(sampleRow[mappedCol]) : `[${mappedCol || varNum}]`;
        content = content.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), val);
      });
    }

    return content;
  }, [
    activeTemplate,
    varsDetected,
    recipientSource,
    contactsVarMode,
    sameVarValues,
    perRecipientVarValues,
    currentPreviewRecipient,
    excelColMapping,
  ]);

  // Validation State & Readiness
  const readinessCheck = useMemo(() => {
    if (!templateId) return { ready: false, text: 'Select an approved WhatsApp template to continue' };

    if (recipientSource === 'CONTACTS_GROUPS') {
      const count = cgTotalEstimatedCount;
      if (count === 0) return { ready: false, text: 'Select at least one contact or group' };

      if (varsDetected.length > 0) {
        if (contactsVarMode === 'SAME_FOR_ALL') {
          const missingVars = varsDetected.filter((v) => !sameVarValues[v]?.trim());
          if (missingVars.length > 0) {
            return { ready: false, text: `Enter value for variable {{${missingVars[0]}}}` };
          }
        } else {
          const rows = resolvedContactsList;
          if (rows.length === 0) return { ready: false, text: 'No contacts resolved to customize' };
          let missingCount = 0;
          rows.forEach((r) => {
            const rowVals = perRecipientVarValues[r.phone] || {};
            const isMissing = varsDetected.some((v) => !rowVals[v]?.trim());
            if (isMissing) missingCount++;
          });
          if (missingCount > 0) {
            return {
              ready: false,
              text: `${rows.length - missingCount} / ${rows.length} recipients ready · ${missingCount} missing values`,
            };
          }
        }
      }

      return {
        ready: true,
        text: `✓ ${count} unique recipient${count === 1 ? '' : 's'} ready`,
      };
    } else {
      // Excel mode
      if (!parsedExcelFile || parsedExcelFile.validPhoneCount === 0) {
        return { ready: false, text: 'Upload a spreadsheet with valid phone numbers' };
      }

      if (varsDetected.length > 0) {
        const unmapped = varsDetected.filter((v) => !excelColMapping[v]);
        if (unmapped.length > 0) {
          return { ready: false, text: `Map column for variable {{${unmapped[0]}}}` };
        }
      }

      return {
        ready: true,
        text: `✓ ${parsedExcelFile.validPhoneCount} recipients ready from ${parsedExcelFile.fileName}`,
      };
    }
  }, [
    templateId,
    recipientSource,
    cgTotalEstimatedCount,
    varsDetected,
    contactsVarMode,
    sameVarValues,
    perRecipientVarValues,
    resolvedContactsList,
    parsedExcelFile,
    excelColMapping,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !templateId || !readinessCheck.ready) return;

    if (isScheduled && !scheduledAt) {
      onToast('Please select a schedule time.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      if (recipientSource === 'CONTACTS_GROUPS') {
        if (contactsVarMode === 'PER_RECIPIENT' && varsDetected.length > 0) {
          const directData = resolvedContactsList.map((r) => {
            const rowVals = perRecipientVarValues[r.phone] || {};
            const variables = varsDetected.map((v) => rowVals[v] || '');
            return {
              phone: r.phone,
              variables,
            };
          });

          await onSaved({
            name,
            template_id: templateId,
            group_id: selectedGroupIds[0] || 'DIRECT_CONTACTS',
            group_ids: selectedGroupIds,
            contact_ids: selectedContactIds,
            scheduled_at: isScheduled ? scheduledAt : null,
            excelData: directData,
            groupVarValues: null,
          });
        } else {
          await onSaved({
            name,
            template_id: templateId,
            group_id: selectedGroupIds[0] || (selectedContactIds[0] ? 'DIRECT_CONTACTS' : ''),
            group_ids: selectedGroupIds,
            contact_ids: selectedContactIds,
            scheduled_at: isScheduled ? scheduledAt : null,
            excelData: null,
            groupVarValues: varsDetected.length > 0 ? sameVarValues : null,
          });
        }
      } else {
        const directData = (parsedExcelFile?.rows || []).map((row) => {
          const variables = varsDetected.map((varNum) => {
            const col = excelColMapping[varNum];
            return col && row[col] !== undefined ? String(row[col]) : '';
          });
          return {
            phone: row._phone,
            variables,
          };
        });

        await onSaved({
          name,
          template_id: templateId,
          group_id: 'EXCEL',
          group_ids: [],
          contact_ids: [],
          scheduled_at: isScheduled ? scheduledAt : null,
          excelData: directData,
          groupVarValues: null,
        });
      }

      onClose();
    } catch (err: any) {
      onToast(err.message || 'Failed to create campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] overflow-y-auto p-3 sm:p-6 text-left animate-in fade-in duration-200">
      <div className="min-h-full flex items-start justify-center py-4 sm:py-8">
        <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 relative text-left animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-8 sm:right-8 text-muted hover:text-fg p-1.5 hover:bg-glass-input rounded-lg transition-colors cursor-pointer bg-transparent border-0 outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-1 pr-8">
          <h3 className="text-xl sm:text-2xl font-black text-fg tracking-tight">Create Campaign</h3>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-transparent border-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showGuide ? 'Hide guide' : 'How campaigns work'}</span>
          </button>
        </div>
        <p className="text-xs text-muted font-medium mb-4">Configure and launch bulk WhatsApp campaigns</p>

        {/* Contextual In-Product Campaign Guidance (Section 15) */}
        {showGuide && (
          <div className="mb-5 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-indigo-400 dark:text-indigo-300">
              <Info className="w-4 h-4 shrink-0 text-indigo-400" />
              <span className="text-sm font-bold tracking-tight">How Campaigns Work</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] leading-relaxed pt-1">
              <div className="p-3 bg-black/20 dark:bg-black/40 rounded-xl border border-indigo-500/10 dark:border-white/5">
                <strong className="text-indigo-600 dark:text-indigo-300 font-bold block mb-1">STEP 1 — Choose a template</strong>
                <span className="text-fg/80 dark:text-zinc-300">Select an approved WhatsApp template with or without dynamic variables.</span>
              </div>
              <div className="p-3 bg-black/20 dark:bg-black/40 rounded-xl border border-indigo-500/10 dark:border-white/5">
                <strong className="text-indigo-600 dark:text-indigo-300 font-bold block mb-1">STEP 2 — Choose recipients</strong>
                <span className="text-fg/80 dark:text-zinc-300">Use Groups/Contacts for saved PingStack records, or Excel/CSV for custom spreadsheet data.</span>
              </div>
              <div className="p-3 bg-black/20 dark:bg-black/40 rounded-xl border border-indigo-500/10 dark:border-white/5">
                <strong className="text-indigo-600 dark:text-indigo-300 font-bold block mb-1">STEP 3 — Provide template values</strong>
                <span className="text-fg/80 dark:text-zinc-300">Choose <em>Same values for everyone</em> for bulk messages or <em>Customize per recipient</em> for individualized data.</span>
              </div>
              <div className="p-3 bg-black/20 dark:bg-black/40 rounded-xl border border-indigo-500/10 dark:border-white/5">
                <strong className="text-indigo-600 dark:text-indigo-300 font-bold block mb-1">STEP 4 &amp; 5 — Preview &amp; Send</strong>
                <span className="text-fg/80 dark:text-zinc-300">Inspect the live message preview for each recipient, review total count, and send or schedule.</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 sm:space-y-6 mb-6 sm:mb-8">
            {/* 1. Campaign Title */}
            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Campaign Title</label>
              <input
                type="text"
                required
                placeholder="e.g. September Member Outreach"
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-4 sm:px-5 py-3.5 text-xs sm:text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 transition-all font-sans"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 2. WhatsApp Template Selector */}
            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">WhatsApp Template</label>
              <select
                required
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-4 sm:px-5 py-3.5 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="" className="bg-bg text-fg">Select an approved template...</option>
                {templates.filter((t) => t.status === 'APPROVED').map((t) => (
                  <option key={t.id} value={t.id} className="bg-bg text-fg">
                    {t.name} ({t.category || 'UTILITY'})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. RECIPIENT SOURCE MODEL (Section 1) */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest px-1">Recipient Source</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRecipientSource('CONTACTS_GROUPS')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
                    recipientSource === 'CONTACTS_GROUPS'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Groups / Contacts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientSource('EXCEL')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
                    recipientSource === 'EXCEL'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Excel / CSV</span>
                </button>
              </div>

              <p className="text-[10px] text-muted font-medium px-1">
                {recipientSource === 'CONTACTS_GROUPS'
                  ? 'Best when sending to your saved contacts or groups in PingStack.'
                  : 'Best when each recipient has different data such as appointment dates, fees, order IDs, etc.'}
              </p>
            </div>

            {/* 4A. GROUPS / CONTACTS SELECTION */}
            {recipientSource === 'CONTACTS_GROUPS' && (
              <div className="space-y-3 p-4 bg-glass-input border border-glass-border rounded-2xl animate-in fade-in duration-200">
                <div className="relative" ref={cgDropdownRef}>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                    Select Groups or Contacts
                  </label>
                  <button
                    type="button"
                    onClick={() => setCgDropdownOpen(!cgDropdownOpen)}
                    className="w-full bg-bg border border-glass-border rounded-xl px-4 py-3 text-xs font-bold focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none transition-all cursor-pointer text-fg flex items-center justify-between text-left"
                  >
                    <span className="truncate">
                      {selectedGroupIds.length > 0
                        ? `${selectedGroupIds.length} Group${selectedGroupIds.length === 1 ? '' : 's'} selected (${cgTotalEstimatedCount} unique recipients)`
                        : selectedContactIds.length > 0
                        ? `${selectedContactIds.length} Contact${selectedContactIds.length === 1 ? '' : 's'} selected`
                        : 'Choose Groups or Contacts...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform duration-200 ${cgDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {cgDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-bg/95 backdrop-blur-md border border-glass-border rounded-2xl shadow-2xl z-50 p-3 text-left animate-in fade-in duration-150">
                      <div className="flex border-b border-white/10 pb-2 mb-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setCgSubTab('GROUPS')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border-0 ${
                            cgSubTab === 'GROUPS'
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          <span>Groups ({groups.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCgSubTab('CONTACTS')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border-0 ${
                            cgSubTab === 'CONTACTS'
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                          }`}
                        >
                          <User className="w-3 h-3" />
                          <span>Contacts ({contacts.length})</span>
                        </button>
                      </div>

                      {cgSubTab === 'GROUPS' ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted">Available Groups</span>
                            {groups.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedGroupIds.length === groups.length) setSelectedGroupIds([]);
                                  else setSelectedGroupIds(groups.map((g) => g.id));
                                }}
                                className="text-[9px] font-bold text-indigo-400 hover:underline bg-transparent border-0 cursor-pointer"
                              >
                                {selectedGroupIds.length === groups.length ? 'Deselect All' : 'Select All'}
                              </button>
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                            {groups.length === 0 ? (
                              <p className="text-xs text-muted p-2">No groups found.</p>
                            ) : (
                              groups.map((g) => {
                                const isChecked = selectedGroupIds.includes(g.id);
                                return (
                                  <label
                                    key={g.id}
                                    className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-xl cursor-pointer select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                                        } else {
                                          setSelectedGroupIds([...selectedGroupIds, g.id]);
                                        }
                                      }}
                                      className="h-3.5 w-3.5 text-indigo-500 rounded cursor-pointer shrink-0"
                                    />
                                    <span className="text-xs font-bold text-fg flex-1 truncate">{g.name}</span>
                                    {g.contacts_count !== undefined && (
                                      <span className="text-[10px] text-muted font-mono">({g.contacts_count} contacts)</span>
                                    )}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted" />
                            <input
                              type="text"
                              placeholder="Search contacts by name or phone..."
                              value={contactSearch}
                              onChange={(e) => setContactSearch(e.target.value)}
                              className="w-full bg-glass-input border border-glass-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-fg focus:outline-none"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                            {filteredContacts.length === 0 ? (
                              <p className="text-xs text-muted p-2">No contacts found.</p>
                            ) : (
                              filteredContacts.map((c) => {
                                const isChecked = selectedContactIds.includes(c.id);
                                return (
                                  <label
                                    key={c.id}
                                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl cursor-pointer select-none"
                                  >
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setSelectedContactIds(selectedContactIds.filter((id) => id !== c.id));
                                          } else {
                                            setSelectedContactIds([...selectedContactIds, c.id]);
                                          }
                                        }}
                                        className="h-3.5 w-3.5 text-indigo-500 rounded cursor-pointer shrink-0"
                                      />
                                      <div className="truncate">
                                        <p className="text-xs font-bold text-fg truncate">{c.name || 'Unnamed'}</p>
                                        <p className="text-[10px] text-muted font-mono">{c.phone_number}</p>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recipient Count Summary */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Unique Recipients</span>
                  <span className="font-black text-indigo-400 font-mono">
                    {cgTotalEstimatedCount} recipients (deduplicated)
                  </span>
                </div>
              </div>
            )}

            {/* 4B. EXCEL / CSV UPLOADER */}
            {recipientSource === 'EXCEL' && (
              <div className="space-y-3">
                <ExcelUploader
                  parsedFile={parsedExcelFile}
                  varsDetected={varsDetected}
                  onParsed={setParsedExcelFile}
                  onClear={() => setParsedExcelFile(null)}
                  onToast={onToast}
                />
              </div>
            )}

            {/* 5. DYNAMIC VARIABLES CONFIGURATION (Sections 3, 4, 5, 14, 18) */}
            {varsDetected.length > 0 && (
              <div className="space-y-4 p-4 sm:p-5 bg-glass-input border border-glass-border rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-fg">Dynamic Values</span>
                  </div>
                  <span className="text-[10px] text-muted">WhatsApp parameters: {varsDetected.map(v => `{{${v}}}`).join(', ')}</span>
                </div>

                {recipientSource === 'CONTACTS_GROUPS' ? (
                  /* Groups & Contacts Variable Modes */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setContactsVarMode('SAME_FOR_ALL')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                          contactsVarMode === 'SAME_FOR_ALL'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                        }`}
                      >
                        Same values for everyone
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactsVarMode('PER_RECIPIENT')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                          contactsVarMode === 'PER_RECIPIENT'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                        }`}
                      >
                        Customize per recipient
                      </button>
                    </div>

                {/* Mode A: SAME VALUES FOR EVERYONE (Row-style Table View) */}
                {contactsVarMode === 'SAME_FOR_ALL' ? (
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted font-medium">
                      Enter fixed values applied to every selected recipient:
                    </p>

                    <div className="overflow-x-auto rounded-xl border border-glass-border bg-black/30 custom-scrollbar">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-white/5 text-fg/70 font-mono border-b border-glass-border">
                          <tr>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-fg whitespace-nowrap min-w-[140px]">
                              RECIPIENTS
                            </th>
                            {varsDetected.map((v, i) => (
                              <th key={v} className="px-3 py-2 text-fg/90 font-mono font-bold uppercase min-w-[150px]">
                                VAR {i + 1} <span className="text-muted font-normal text-[9px]">({`{{${v}}}`})</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-3 font-mono font-bold text-fg/90 whitespace-nowrap align-top">
                              <span className="inline-flex items-center gap-1.5 text-xs text-fg">
                                <Users className="w-3.5 h-3.5 text-muted" />
                                All recipients
                              </span>
                              <span className="block text-[9px] text-muted font-sans font-normal mt-0.5">
                                {cgTotalEstimatedCount > 0 ? `${cgTotalEstimatedCount} recipients` : 'All selected contacts'}
                              </span>
                            </td>
                            {varsDetected.map((varNum) => (
                              <td key={varNum} className="px-2 py-2.5 align-top">
                                <div className="min-w-[140px]">
                                  <input
                                    type="text"
                                    required
                                    placeholder={`Value for {{${varNum}}}`}
                                    value={sameVarValues[varNum] || ''}
                                    onChange={(e) => setSameVarValues({ ...sameVarValues, [varNum]: e.target.value })}
                                    className="block w-full bg-bg border border-glass-border rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-fg focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Mode B: DYNAMIC VALUES Table with Manual Entry & Excel Assistant */
                  <div className="space-y-3.5">
                    {/* Mode Sub-Switch: Fill manually vs Use Excel */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setCustomizeMethod('MANUAL')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                            customizeMethod === 'MANUAL'
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                          }`}
                        >
                          Fill manually
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomizeMethod('EXCEL')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                            customizeMethod === 'EXCEL'
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent'
                          }`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Use Excel</span>
                        </button>
                      </div>

                      {/* Download Template Action Button */}
                      <button
                        type="button"
                        onClick={handleDownloadDynamicValuesTemplate}
                        disabled={resolvedContactsList.length === 0}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Excel Template</span>
                      </button>
                    </div>

                    {/* Excel Helper Section when active */}
                    {customizeMethod === 'EXCEL' && (
                      <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs space-y-3 animate-in fade-in duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-indigo-400 dark:text-indigo-300 text-xs">Need to fill many recipients?</h5>
                            <p className="text-[11px] text-fg/80 dark:text-zinc-300 mt-0.5 leading-relaxed">
                              Download a pre-filled Excel template with the selected recipients, add values for each template variable, then upload it to automatically fill the table.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadDynamicValuesTemplate}
                            disabled={resolvedContactsList.length === 0}
                            className="shrink-0 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 border-0 cursor-pointer disabled:opacity-40"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Template (.xlsx)</span>
                          </button>
                        </div>

                        {/* Excel Upload Dropzone for Dynamic Values */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setExcelValuesDragOver(true);
                          }}
                          onDragLeave={() => setExcelValuesDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setExcelValuesDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleUploadDynamicValuesExcel(file);
                          }}
                          onClick={() => excelValuesFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                            excelValuesDragOver
                              ? 'border-indigo-500 bg-indigo-500/15'
                              : 'border-indigo-500/20 hover:border-indigo-500/40 bg-black/20'
                          }`}
                        >
                          <input
                            type="file"
                            ref={excelValuesFileInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDynamicValuesExcel(file);
                            }}
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                          />
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-fg">
                              {parsingDynamicExcel ? (
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-fg">
                                {parsingDynamicExcel ? 'Processing spreadsheet...' : 'Upload completed Excel'}
                              </p>
                              <p className="text-[10px] text-muted">Click or drag your filled spreadsheet here to populate the table</p>
                            </div>
                          </div>
                        </div>

                        {/* Upload validation feedback */}
                        {excelImportSummary && (
                          <div
                            className={`p-2.5 rounded-xl border text-[11px] leading-snug ${
                              excelImportSummary.unmatchedCount > 0 || excelImportSummary.missingRecipientsCount > 0
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {excelImportSummary.unmatchedCount === 0 && excelImportSummary.missingRecipientsCount === 0 ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span>
                                ✓ {excelImportSummary.matchedCount} / {resolvedContactsList.length} recipients populated from {excelImportSummary.fileName}
                              </span>
                            </div>
                            {excelImportSummary.unmatchedCount > 0 && (
                              <p className="mt-1 text-[10px] text-amber-400/90 pl-5">
                                ⚠ {excelImportSummary.unmatchedCount} phone number{excelImportSummary.unmatchedCount === 1 ? '' : 's'} in the file were not found in the selected recipients.
                              </p>
                            )}
                            {excelImportSummary.missingRecipientsCount > 0 && (
                              <p className="mt-0.5 text-[10px] text-amber-400/90 pl-5">
                                ⚠ {excelImportSummary.missingRecipientsCount} selected recipient{excelImportSummary.missingRecipientsCount === 1 ? '' : 's'} do not have values in the uploaded file.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table View (Always visible so user can see & edit values) */}
                    <div className="overflow-x-auto rounded-xl border border-glass-border bg-black/30 max-h-64 custom-scrollbar">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-white/5 text-fg/70 font-mono border-b border-glass-border sticky top-0 backdrop-blur-sm z-10">
                          <tr>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-fg whitespace-nowrap min-w-[120px]">
                              NAME
                            </th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-fg whitespace-nowrap min-w-[140px]">
                              PHONE NUMBER
                            </th>
                            {varsDetected.map((v, i) => (
                              <th key={v} className="px-3 py-2 text-fg/90 font-mono font-bold uppercase min-w-[130px]">
                                VAR {i + 1} <span className="text-muted font-normal text-[9px]">({`{{${v}}}`})</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {resolvedContactsList.length === 0 ? (
                            <tr>
                              <td colSpan={varsDetected.length + 2} className="p-4 text-center text-muted">
                                Select groups or contacts above to populate recipient phone numbers.
                              </td>
                            </tr>
                          ) : (
                            resolvedContactsList
                              .slice((perRecipientPage - 1) * 10, perRecipientPage * 10)
                              .map((r) => {
                                const rowVals = perRecipientVarValues[r.phone] || {};
                                return (
                                  <tr key={r.phone} className="hover:bg-white/[0.02]">
                                    <td className="px-3 py-2 font-semibold text-fg/90 whitespace-nowrap">
                                      {r.name && r.name !== 'Customer' ? r.name : '—'}
                                    </td>
                                    <td className="px-3 py-2 font-mono font-bold text-fg/90 whitespace-nowrap">
                                      {r.phone}
                                    </td>
                                    {varsDetected.map((v) => (
                                      <td key={v} className="px-2 py-1.5">
                                        <input
                                          type="text"
                                          placeholder={`Value for {{${v}}}`}
                                          value={rowVals[v] || ''}
                                          onChange={(e) => {
                                            const updated = { ...rowVals, [v]: e.target.value };
                                            setPerRecipientVarValues({
                                              ...perRecipientVarValues,
                                              [r.phone]: updated,
                                            });
                                          }}
                                          className="bg-bg border border-glass-border rounded px-2.5 py-1 text-[10px] font-bold text-fg w-full min-w-[120px] focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>

                        {/* Pagination for table */}
                        {resolvedContactsList.length > 10 && (
                          <div className="flex items-center justify-between text-[10px] text-muted px-1">
                            <span>
                              Showing {((perRecipientPage - 1) * 10) + 1} - {Math.min(perRecipientPage * 10, resolvedContactsList.length)} of {resolvedContactsList.length} recipients
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={perRecipientPage === 1}
                                onClick={() => setPerRecipientPage((p) => p - 1)}
                                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 cursor-pointer text-fg border border-zinc-200 dark:border-zinc-700"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={perRecipientPage * 10 >= resolvedContactsList.length}
                                onClick={() => setPerRecipientPage((p) => p + 1)}
                                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 cursor-pointer text-fg border border-zinc-200 dark:border-zinc-700"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Excel / CSV Variable to Column Mapping (Sections 8, 9, 13) */
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted font-medium">
                      Map each template variable to a column from your uploaded spreadsheet file:
                    </p>

                    {parsedExcelFile ? (
                      <div className="space-y-2">
                        {varsDetected.map((varNum, i) => (
                          <div key={varNum} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-fg/80">
                              VAR {i + 1} <code className="text-muted font-mono text-[9px] ml-1">{"{{" + varNum + "}}"}</code>
                            </label>
                            <select
                              value={excelColMapping[varNum] || ''}
                              onChange={(e) => setExcelColMapping({ ...excelColMapping, [varNum]: e.target.value })}
                              className="bg-bg border border-glass-border rounded-lg px-3 py-1.5 text-xs font-bold text-fg focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 cursor-pointer"
                            >
                              <option value="">Select column...</option>
                              {parsedExcelFile.headers.map((h) => (
                                <option key={h} value={h}>
                                  {h} {h === parsedExcelFile.phoneHeader ? '(Phone)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted p-2 italic">Upload a spreadsheet above to map columns.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. LIVE RESOLVED MESSAGE PREVIEW WITH PAGER */}
            {activeTemplate && (
              <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase text-zinc-700 dark:text-zinc-300 tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Live Message Preview
                  </span>

                  {/* Recipient Pager if multiple recipients */}
                  {totalRecipientsCount > 1 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        disabled={previewIndex === 0}
                        onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                        className="p-0.5 hover:text-fg disabled:opacity-30 cursor-pointer bg-transparent border-0"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span>
                        Recipient {currentPreviewRecipient.index + 1} of {currentPreviewRecipient.total} ({currentPreviewRecipient.phone})
                      </span>
                      <button
                        type="button"
                        disabled={previewIndex >= currentPreviewRecipient.total - 1}
                        onClick={() => setPreviewIndex((i) => Math.min(currentPreviewRecipient.total - 1, i + 1))}
                        className="p-0.5 hover:text-fg disabled:opacity-30 cursor-pointer bg-transparent border-0"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium whitespace-pre-wrap font-sans shadow-2xs">
                  {resolvedMessagePreview}
                </div>
              </div>
            )}

            {/* 7. SCHEDULE DISPATCH SECTION */}
            <div className="pt-3 border-t border-glass-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <input
                    id="scheduled"
                    type="checkbox"
                    disabled={planType !== 'growth'}
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 bg-glass-input border-glass-border rounded cursor-pointer text-zinc-900 dark:text-zinc-100"
                  />
                  <label htmlFor="scheduled" className="ml-2 block text-xs font-bold uppercase tracking-wider text-fg/70 cursor-pointer">
                    Schedule Dispatch
                  </label>
                  {planType === 'starter' && (
                    <span className="ml-3 px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-bold rounded uppercase">
                      Growth Required
                    </span>
                  )}
                </div>
              </div>
              {isScheduled && (
                <div className="animate-in fade-in duration-200 mt-2">
                  <input
                    type="datetime-local"
                    required
                    className="block w-full bg-glass-input border border-glass-border rounded-xl px-4 py-2.5 text-xs font-bold text-fg focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Readiness State Banner */}
          <div className="mb-4">
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              readinessCheck.ready
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {readinessCheck.ready ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              )}
              <span className="font-semibold">{readinessCheck.text}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !readinessCheck.ready}
              className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center cursor-pointer border-0"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-current" />}
              <span>{submitting ? 'Sending Campaign...' : (isScheduled ? 'Schedule Dispatch' : 'Launch Campaign')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
