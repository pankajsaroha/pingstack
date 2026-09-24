'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Clock, Check, CheckCheck, AlertCircle,
  Trash2, Image, FileText, Paperclip, X, Download, ExternalLink
} from 'lucide-react';
import { WhatsAppFormattedText } from '@/lib/whatsapp-formatter';

interface MessageBubbleProps {
  msg: {
    id: string;
    direction: 'inbound' | 'outbound';
    content: string | null;
    created_at: string;
    status: string;
    error?: string | null;
    media_path?: string | null;
    media_size_bytes?: number | null;
    message_type?: string;
    contact_id?: string;
  };
  contactId?: string;
  isSelected: boolean;
  selectionActive: boolean; // true when ANY message is selected (show checkboxes)
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function MessageBubble({
  msg,
  contactId: propContactId,
  isSelected,
  selectionActive,
  onToggleSelect,
  onDelete,
}: MessageBubbleProps) {
  const isOutbound = msg.direction === 'outbound';
  const effectiveContactId = msg.contact_id || propContactId;
  const [showErrorPopover, setShowErrorPopover] = useState(false);

  // Attachment details helper
  const rawFileName = msg.media_path ? msg.media_path.split('/').pop()?.replace(/^\d+_/, '') || 'attachment' : '';
  const fileExt = rawFileName.includes('.') ? rawFileName.split('.').pop()?.toUpperCase() || '' : (msg.message_type === 'document' ? 'DOC' : '');
  const formattedSize = msg.media_size_bytes 
    ? (msg.media_size_bytes < 1024 * 1024 
        ? `${Math.max(1, Math.round(msg.media_size_bytes / 1024))} KB` 
        : `${(msg.media_size_bytes / (1024 * 1024)).toFixed(1)} MB`)
    : '';

  // Long-press detection for mobile/touch
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isLongPressRef.current = false;

      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      touchTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(40); } catch (_) {}
        }
        onToggleSelect(msg.id);
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !touchTimerRef.current) return;
    if (e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        // Scrolling detected — cancel long press
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPos.current = null;
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (selectionActive) {
      e.stopPropagation();
      onToggleSelect(msg.id);
    }
  };

  return (
    <div className={`flex group items-center w-full min-w-0 py-1.5 sm:py-2 px-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>

      {/* Checkbox — visible when selection is active or on hover */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(msg.id);
        }}
        className={`mr-2.5 transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center select-none ${
          selectionActive || isSelected 
            ? 'opacity-100 w-5.5' 
            : 'opacity-0 w-0 group-hover:opacity-70 hover:!opacity-100 group-hover:w-5.5 overflow-hidden'
        }`}
        title={isSelected ? 'Deselect message' : 'Select message'}
      >
        <div
          className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center shadow-2xs ${
            isSelected
              ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500 text-white scale-105'
              : 'border-zinc-400 dark:border-zinc-500 bg-white/90 dark:bg-zinc-800/90 hover:border-indigo-500 dark:hover:border-indigo-400'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>

      {/* Delete button (single delete on desktop hover when selection mode is inactive) */}
      {!isOutbound && !selectionActive && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity self-center mr-1.5 cursor-pointer shrink-0 hidden sm:block"
          title="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bubble */}
      <div 
        onClick={handleBubbleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => {
          if (selectionActive) e.preventDefault();
        }}
        className={`max-w-[85%] sm:max-w-[70%] min-w-0 rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 shadow-2xs relative border break-words transition-all duration-150 ${
          selectionActive ? 'cursor-pointer select-none' : ''
        } ${
          isSelected 
            ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900'
            : ''
        } ${
          isOutbound
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 rounded-br-xs ml-8 sm:ml-12'
            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 rounded-bl-xs mr-8 sm:mr-12'
        }`}
      >
        {/* Attachment preview */}
        {msg.media_path && (
          <div className={`mb-2 p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
            isOutbound 
              ? 'bg-white/10 dark:bg-black/10 border-white/20 dark:border-black/20 hover:bg-white/15' 
              : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-900'
          }`}>
            <div className="flex items-center min-w-0 gap-2.5 flex-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isOutbound 
                  ? 'bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900' 
                  : fileExt === 'PDF' 
                    ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                    : (fileExt === 'DOC' || fileExt === 'DOCX')
                      ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
                      : (fileExt === 'XLS' || fileExt === 'XLSX' || fileExt === 'CSV')
                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}>
                {msg.message_type === 'image' && <Image className="w-4 h-4" />}
                {msg.message_type === 'video' && <Send className="w-4 h-4 rotate-90" />}
                {msg.message_type === 'document' && <FileText className="w-4 h-4" />}
                {!['image', 'video', 'document'].includes(msg.message_type || '') && <Paperclip className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {fileExt && (
                    <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded ${
                      isOutbound
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900'
                        : fileExt === 'PDF'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : (fileExt === 'DOC' || fileExt === 'DOCX')
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : (fileExt === 'XLS' || fileExt === 'XLSX' || fileExt === 'CSV')
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {fileExt}
                    </span>
                  )}
                  {formattedSize && (
                    <span className={`text-[9px] font-mono ${isOutbound ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {formattedSize}
                    </span>
                  )}
                </div>
                <p className={`text-xs font-semibold truncate mt-0.5 ${isOutbound ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`} title={rawFileName}>
                  {rawFileName}
                </p>
              </div>
            </div>

            {effectiveContactId && (
              <a
                href={`/api/chat/${effectiveContactId}/attachment?messageId=${msg.id}&download=1`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 rounded-lg transition-colors shrink-0 flex items-center justify-center cursor-pointer ${
                  isOutbound
                    ? 'bg-white/10 hover:bg-white/25 text-white dark:text-zinc-900'
                    : 'bg-zinc-200/80 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title={fileExt === 'PDF' ? 'Open / Download PDF' : `Download ${rawFileName}`}
              >
                {fileExt === 'PDF' ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              </a>
            )}
          </div>
        )}

        {/* Inbound Document without media_path fallback */}
        {!msg.media_path && msg.message_type === 'document' && (
          <div className={`mb-2 p-2.5 rounded-xl border flex items-center gap-2.5 ${
            isOutbound 
              ? 'bg-white/10 dark:bg-black/10 border-white/20 dark:border-black/20 text-white dark:text-zinc-900' 
              : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200'
          }`}>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Document</p>
              <p className="text-[11px] font-medium truncate text-zinc-500 dark:text-zinc-400">
                {msg.error || 'Document received — attachment unavailable'}
              </p>
            </div>
          </div>
        )}

        {/* Text or Unsupported Message Notice */}
        {(msg.message_type === 'unsupported' || msg.content === '[UNSUPPORTED]' || msg.content?.startsWith('[Unsupported WhatsApp message format')) ? (
          <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed min-w-0">
              <p className="font-semibold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Unsupported Format
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                {msg.error || 'This message format (e.g. B2B Template) is not supported for rendering by WhatsApp Cloud API.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-normal break-words [overflow-wrap:anywhere] min-w-0">
            {msg.content && !['[Document]', '[Photo]', '[Video]', '[Voice message]', '[Audio]'].includes(msg.content.trim()) ? (
              <WhatsAppFormattedText text={msg.content} />
            ) : (
              (msg.media_path || msg.message_type === 'document') ? null : '[Template Message]'
            )}
          </div>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center justify-end mt-1 space-x-1 ${isOutbound ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-400 dark:text-zinc-500'}`}>
          <span className="text-[9px] font-mono" suppressHydrationWarning>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOutbound && (
            <span className="ml-1 flex items-center">
              {msg.status === 'pending'   && <Clock className="w-3 h-3" />}
              {msg.status === 'sent'      && <Check className="w-3 h-3" />}
              {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
              {msg.status === 'read'      && <CheckCheck className="w-3 h-3 text-indigo-400 dark:text-indigo-600" />}
              {msg.status === 'failed'    && (
                <div className="relative group/error">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowErrorPopover(!showErrorPopover);
                    }}
                    className="flex items-center cursor-pointer border-0 bg-transparent p-0 outline-none"
                    title="Tap to view error details"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 cursor-pointer hover:scale-110 transition-transform" />
                  </button>

                  <div
                    className={`absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3 rounded-xl text-[11px] border border-red-500/30 shadow-lg transition-all z-50 pointer-events-auto ${
                      showErrorPopover
                        ? 'opacity-100 translate-y-0 block'
                        : 'opacity-0 translate-y-2 pointer-events-none hidden sm:group-hover/error:block sm:group-hover/error:opacity-100 sm:group-hover/error:pointer-events-auto'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-1.5 text-red-500 font-bold uppercase text-[10px]">
                      <div className="flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Meta Gateway Error
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowErrorPopover(false)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 cursor-pointer border-0 bg-transparent"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="leading-relaxed text-zinc-600 dark:text-zinc-300 font-normal select-text">
                      {msg.error?.includes('131049')
                        ? 'Meta Per-User Marketing Limit Reached (Code 131049). Meta caps marketing messages sent to this recipient within 24-48h to prevent spam. Use a Utility template or retry in 24-48h.'
                        : msg.error || 'Rejection from WhatsApp endpoint. Verify account balances.'}
                    </div>
                  </div>
                </div>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Delete button — outbound side */}
      {isOutbound && !selectionActive && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity self-center ml-1.5 cursor-pointer shrink-0 hidden sm:block"
          title="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
