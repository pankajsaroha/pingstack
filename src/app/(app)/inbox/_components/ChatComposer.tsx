'use client';

import { useState } from 'react';
import { Send, Zap, AlertCircle, Paperclip, X, Image, FileText } from 'lucide-react';
import { PLANS, getActivePlanType } from '@/lib/plans';

interface ChatComposerProps {
  tenant: any;
  windowError: boolean;
  sending: boolean;
  uploading: boolean;
  newMessage: string;
  stagedFile: File | null;
  showTemplates: boolean;
  onMessageChange: (msg: string) => void;
  onSend: (e: React.FormEvent) => void;
  onFileSelect: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onToggleTemplates: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ChatComposer({
  tenant,
  windowError,
  sending,
  uploading,
  newMessage,
  stagedFile,
  showTemplates,
  onMessageChange,
  onSend,
  onFileSelect,
  onFileChange,
  onClearFile,
  onToggleTemplates,
  fileInputRef,
}: ChatComposerProps) {

  return (
    <div className="p-6 bg-glass-card/50 border-t border-glass-border">
      {/* Window closed warning */}
      {windowError && (
        <div className="mb-3 py-2 px-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500 gap-4">
          <div className="flex items-center min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest truncate">
              24H active window closed. Send template to re-engage.
            </span>
          </div>
          <button
            onClick={onToggleTemplates}
            className="px-2.5 py-1 bg-amber-500 text-black hover:bg-neutral-100 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all shrink-0"
          >
            Choose Template
          </button>
        </div>
      )}

      <form onSubmit={onSend} className="max-w-4xl mx-auto flex flex-col space-y-4">
        {/* Staged file preview */}
        {stagedFile && (
          <div className="flex items-center self-start bg-indigo-500/5 border border-indigo-500/10 px-4 py-2 rounded-2xl animate-in zoom-in-95 duration-200">
            <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center mr-3">
              {stagedFile.type.startsWith('image/') ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="mr-6">
              <p className="text-[10px] font-black text-fg truncate max-w-[150px]">{stagedFile.name}</p>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{Math.round(stagedFile.size / 1024)} KB</p>
            </div>
            <button
              type="button"
              onClick={onClearFile}
              className="w-6 h-6 bg-glass-input hover:bg-red-500/10 text-muted hover:text-red-400 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center space-x-3 bg-glass-input p-2 rounded-[2rem] border border-glass-border focus-within:border-glass-border transition-all">
          <div className="flex">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <button
              type="button"
              disabled={uploading || windowError}
              onClick={onFileSelect}
              className="flex-shrink-0 h-[52px] w-[52px] rounded-2xl bg-glass-input text-fg/50 flex items-center justify-center transition-all hover:bg-white/10 hover:text-fg disabled:opacity-30 cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          <textarea
            readOnly={windowError}
            rows={1}
            className={`flex-1 bg-transparent border-0 focus:ring-0 resize-none px-4 py-3.5 text-sm font-semibold text-fg placeholder:text-fg/20 focus:outline-none ${windowError ? 'opacity-30 cursor-not-allowed' : ''}`}
            placeholder={windowError ? 'Chat window locked' : 'Type your message...'}
            value={newMessage}
            onChange={e => onMessageChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend(e as any);
              }
            }}
          />

          <button
            type="button"
            onClick={onToggleTemplates}
            className={`flex-shrink-0 h-[52px] w-[52px] rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              showTemplates ? 'bg-fg text-bg' : 'bg-glass-input text-muted hover:bg-white/10 hover:text-fg'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>

          <button
            type="submit"
            disabled={(!newMessage.trim() && !stagedFile) || sending || uploading || windowError}
            className="flex-shrink-0 h-[52px] w-[52px] bg-white hover:bg-neutral-100 text-black rounded-2xl flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
          >
            <Send className={`w-5 h-5 ml-0.5 ${uploading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </form>
    </div>
  );
}
