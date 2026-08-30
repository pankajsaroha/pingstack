'use client';

import { useState } from 'react';
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

  return (
    <div className={`flex group items-center w-full min-w-0 ${isOutbound ? 'justify-end' : 'justify-start'}`}>

      {/* Checkbox — visible when selection is active or on hover */}
      <div className={`mr-2.5 sm:mr-3 transition-all shrink-0 ${selectionActive || isSelected ? 'opacity-100 w-5 sm:w-6' : 'opacity-0 w-0 group-hover:opacity-40 group-hover:w-5 sm:group-hover:w-6 overflow-hidden'}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(msg.id)}
          className="h-4 w-4 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
        />
      </div>

      {/* Delete button — inbound side */}
      {!isOutbound && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-fg/20 hover:text-red-400 transition-opacity self-center mr-1 cursor-pointer shrink-0"
          title="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete button — outbound side */}
      {isOutbound && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-fg/20 hover:text-red-400 transition-opacity self-center mr-1.5 cursor-pointer shrink-0"
          title="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bubble */}
      <div className={`max-w-[85%] sm:max-w-[70%] min-w-0 rounded-[1.25rem] sm:rounded-[1.5rem] px-3.5 sm:px-5 py-2.5 sm:py-3.5 shadow-xl relative border break-words ${
        isOutbound
          ? 'bg-fg text-bg border-white rounded-br-sm'
          : 'bg-glass-card border-glass-border text-fg rounded-bl-sm'
      }`}>
        {/* Attachment preview */}
        {msg.media_path && (
          <div className={`mb-2.5 p-2.5 sm:p-3 rounded-xl border flex items-center ${
            isOutbound ? 'bg-black/5 border-black/10' : 'bg-glass-input border-glass-border'
          }`}>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mr-2.5 sm:mr-3 shrink-0 ${
              isOutbound ? 'bg-bg text-fg' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {msg.message_type === 'image' && <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {msg.message_type === 'video' && <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-90" />}
              {msg.message_type === 'document' && <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {!['image', 'video', 'document'].includes(msg.message_type || '') && <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[8px] font-black uppercase tracking-widest ${isOutbound ? 'text-bg/40' : 'text-fg/30'}`}>
                {msg.message_type || 'Media file'}
              </p>
              <p className={`text-[10px] font-black truncate ${isOutbound ? 'text-bg' : 'text-fg'}`}>
                {msg.media_path.split('/').pop()}
              </p>
            </div>
          </div>
        )}

        {/* Text */}
        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium break-words [overflow-wrap:anywhere] min-w-0">
          {msg.content || (msg.media_path ? '' : '[Template Message]')}
        </p>

        {/* Timestamp + status */}
        <div className={`flex items-center justify-end mt-1.5 space-x-1 ${isOutbound ? 'text-bg/40' : 'text-fg/30'}`}>
          <span className="text-[8px] font-black uppercase tracking-wider font-mono">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOutbound && (
            <span className="ml-1 flex items-center">
              {msg.status === 'pending'   && <Clock className="w-3 h-3" />}
              {msg.status === 'sent'      && <Check className="w-3.5 h-3.5" />}
              {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5" />}
              {msg.status === 'read'      && <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />}
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
                    className={`absolute bottom-full right-0 mb-3 w-64 bg-glass-card/95 backdrop-blur-xl text-fg p-4 rounded-2xl text-[10px] font-black uppercase border border-red-500/30 shadow-2xl transition-all z-50 pointer-events-auto ${
                      showErrorPopover
                        ? 'opacity-100 translate-y-0 block'
                        : 'opacity-0 translate-y-2 pointer-events-none hidden sm:group-hover/error:block sm:group-hover/error:opacity-100 sm:group-hover/error:pointer-events-auto'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-1.5 border-b border-glass-border pb-1.5 text-red-400">
                      <div className="flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> META GATEWAY ERROR
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowErrorPopover(false)}
                        className="text-muted hover:text-fg p-0.5 cursor-pointer border-0 bg-transparent"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="leading-relaxed text-fg/70 font-semibold lowercase select-text">
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
    </div>
  );
}
