'use client';

import {
  Send, Clock, Check, CheckCheck, AlertCircle,
  Trash2, Image, FileText, Paperclip
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

  return (
    <div className={`flex group items-center ${isOutbound ? 'justify-end' : 'justify-start'}`}>

      {/* Checkbox — visible when selection is active or on hover */}
      <div className={`mr-3 transition-all ${selectionActive || isSelected ? 'opacity-100 w-6' : 'opacity-0 w-0 group-hover:opacity-40 group-hover:w-6 overflow-hidden'}`}>
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
          className="opacity-0 group-hover:opacity-100 p-2 text-fg/20 hover:text-red-400 transition-opacity self-center mr-1.5 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Bubble */}
      <div className={`max-w-[70%] sm:max-w-[60%] rounded-[1.5rem] px-5 py-3.5 shadow-xl relative border ${
        isOutbound
          ? 'bg-fg text-bg border-white rounded-br-sm'
          : 'bg-glass-card border-glass-border text-fg rounded-bl-sm'
      }`}>
        {/* Attachment preview */}
        {msg.media_path && (
          <div className={`mb-3 p-3 rounded-xl border flex items-center ${
            isOutbound ? 'bg-black/5 border-black/10' : 'bg-glass-input border-glass-border'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
              isOutbound ? 'bg-bg text-fg' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {msg.message_type === 'image' && <Image className="w-4 h-4" />}
              {msg.message_type === 'video' && <Send className="w-4 h-4 rotate-90" />}
              {msg.message_type === 'document' && <FileText className="w-4 h-4" />}
              {!['image', 'video', 'document'].includes(msg.message_type || '') && <Paperclip className="w-4 h-4" />}
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
        <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
          {msg.content || (msg.media_path ? '' : '[Template Message]')}
        </p>

        {/* Timestamp + status */}
        <div className={`flex items-center justify-end mt-2 space-x-1 ${isOutbound ? 'text-bg/40' : 'text-fg/30'}`}>
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
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-3 w-64 bg-glass-card/85 text-fg p-4 rounded-2xl text-[10px] font-black uppercase border border-red-500/20 shadow-2xl opacity-0 group-hover/error:opacity-100 transition-all z-50 pointer-events-none translate-y-2 group-hover/error:translate-y-0">
                    <div className="flex items-center mb-1.5 border-b border-glass-border pb-1.5 text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> META GATEWAY ERROR
                    </div>
                    <div className="leading-relaxed text-fg/60 font-semibold lowercase">
                      {msg.error || 'Rejection from WhatsApp endpoint. Verify account balances.'}
                    </div>
                  </div>
                </div>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Delete button — outbound side */}
      {isOutbound && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-fg/20 hover:text-red-400 transition-opacity self-center ml-1.5 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
