'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Clock, Check, CheckCheck, AlertCircle,
  Trash2, Image, FileText, Paperclip, X
} from 'lucide-react';

interface MessageBubbleProps {
  msg: {
    id: string;
    direction: 'inbound' | 'outbound';
    content: string | null;
    created_at: string;
    status: string;
    error?: string | null;
    media_path?: string | null;
    message_type?: string;
  };
  isSelected: boolean;
  selectionActive: boolean; // true when ANY message is selected (show checkboxes)
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function MessageBubble({
  msg,
  isSelected,
  selectionActive,
  onToggleSelect,
  onDelete,
}: MessageBubbleProps) {
  const isOutbound = msg.direction === 'outbound';
  const [showErrorPopover, setShowErrorPopover] = useState(false);

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
          <div className={`mb-2 p-2 rounded-lg border flex items-center ${
            isOutbound 
              ? 'bg-white/10 dark:bg-black/10 border-white/20 dark:border-black/20' 
              : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-700/60'
          }`}>
            <div className={`w-7 h-7 rounded-md flex items-center justify-center mr-2.5 shrink-0 ${
              isOutbound 
                ? 'bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900' 
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            }`}>
              {msg.message_type === 'image' && <Image className="w-3.5 h-3.5" />}
              {msg.message_type === 'video' && <Send className="w-3.5 h-3.5 rotate-90" />}
              {msg.message_type === 'document' && <FileText className="w-3.5 h-3.5" />}
              {!['image', 'video', 'document'].includes(msg.message_type || '') && <Paperclip className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[8px] font-bold uppercase tracking-wider ${isOutbound ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {msg.message_type || 'Media file'}
              </p>
              <p className={`text-[11px] font-semibold truncate ${isOutbound ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {msg.media_path.split('/').pop()}
              </p>
            </div>
          </div>
        )}

        {/* Text */}
        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-normal break-words [overflow-wrap:anywhere] min-w-0">
          {msg.content || (msg.media_path ? '' : '[Template Message]')}
        </p>

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
