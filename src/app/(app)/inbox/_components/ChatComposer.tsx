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
    <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      {/* Window closed warning */}
      {windowError && (
        <div className="mb-3 py-2 px-3 sm:px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500 gap-2 sm:gap-4">
          <div className="flex items-center min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mr-2 flex-shrink-0" />
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
              24H active window closed.
            </span>
          </div>
          <button
            onClick={onToggleTemplates}
            className="px-2.5 py-1 bg-amber-500 text-black hover:bg-amber-400 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0 shadow-2xs"
          >
            Template
          </button>
        </div>
      )}

      <form onSubmit={onSend} className="max-w-4xl mx-auto flex flex-col space-y-2.5 sm:space-y-3">
        {/* Staged file preview */}
        {stagedFile && (
          <div className="flex items-center self-start bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 px-3 py-1.5 rounded-lg animate-in zoom-in-95 duration-200">
            <div className="w-7 h-7 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center mr-2.5 shrink-0">
              {stagedFile.type.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            </div>
            <div className="mr-4 min-w-0">
              <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[180px]">{stagedFile.name}</p>
              <p className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 uppercase">{Math.round(stagedFile.size / 1024)} KB</p>
            </div>
            <button
              type="button"
              onClick={onClearFile}
              className="w-5 h-5 bg-zinc-200/60 dark:bg-zinc-800 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 bg-zinc-50 dark:bg-zinc-800/80 p-1 sm:p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-all shadow-2xs">
          <div className="flex shrink-0">
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
              className="flex-shrink-0 h-9 w-9 rounded-lg bg-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          <textarea
            readOnly={windowError}
            rows={1}
            className={`flex-1 min-w-0 bg-transparent border-0 focus:ring-0 resize-none px-2 py-2 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none ${windowError ? 'opacity-30 cursor-not-allowed' : ''}`}
            placeholder={windowError ? 'Chat locked' : 'Type message...'}
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
            className={`flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              showTemplates ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={(!newMessage.trim() && !stagedFile) || sending || uploading || windowError}
            className="flex-shrink-0 h-9 w-9 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shadow-2xs"
          >
            <Send className={`w-3.5 h-3.5 ml-0.5 ${uploading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </form>
    </div>
  );
}
