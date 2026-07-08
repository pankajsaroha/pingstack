'use client';

import { Fragment, useRef } from 'react';
import { User, Loader2, MessageCircle, Trash2, ChevronLeft } from 'lucide-react';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import ChatComposer from './ChatComposer';
import TemplateSelector from './TemplateSelector';

interface ChatThreadProps {
  activeConversation: any | null;
  messages: any[];
  loadingMore: boolean;
  hasMore: boolean;
  sending: boolean;
  uploading: boolean;
  windowError: boolean;
  newMessage: string;
  stagedFile: File | null;
  showTemplates: boolean;
  templates: any[];
  tenant: any;
  selectedMessageIds: Set<string>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onMessageChange: (msg: string) => void;
  onSend: (e: React.FormEvent) => void;
  onSendTemplate: (template: any, vars: Record<string, string>) => void;
  onFileSelect: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onToggleTemplates: () => void;
  onCloseTemplates: () => void;
  onToggleMessageSelect: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onBackMobile: () => void;
}

export default function ChatThread({
  activeConversation,
  messages,
  loadingMore,
  sending,
  uploading,
  windowError,
  newMessage,
  stagedFile,
  showTemplates,
  templates,
  tenant,
  selectedMessageIds,
  messagesEndRef,
  chatContainerRef,
  fileInputRef,
  onScroll,
  onMessageChange,
  onSend,
  onSendTemplate,
  onFileSelect,
  onFileChange,
  onClearFile,
  onToggleTemplates,
  onCloseTemplates,
  onToggleMessageSelect,
  onDeleteMessage,
  onBulkDelete,
  onClearSelection,
  onBackMobile,
}: ChatThreadProps) {

  // Track date separators — reset each render
  let lastDateString = '';

  if (!activeConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-fg/30 space-y-4 opacity-40">
        <div className="w-20 h-20 bg-glass-input rounded-full flex items-center justify-center">
          <MessageCircle className="w-10 h-10" />
        </div>
        <p className="font-black text-xs uppercase tracking-widest">Select a thread to begin chatting</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="h-20 px-6 border-b border-glass-border flex items-center bg-bg/85 backdrop-blur-md z-10 sticky top-0 justify-between">
        <div className="flex items-center min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-2 mr-2 hover:bg-glass-input rounded-lg transition-colors cursor-pointer text-fg/50 hover:text-fg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-glass-input border border-glass-border text-fg rounded-xl flex items-center justify-center mr-3 shadow-lg shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="font-black text-fg tracking-tight truncate text-base">
              {activeConversation.contact.name || 'Anonymous Client'}
            </h3>
            <p className="text-[9px] text-fg/30 font-black tracking-widest uppercase truncate mt-0.5">
              Mobile: {activeConversation.contact.phone_number}
            </p>
          </div>
        </div>

        {/* Bulk-delete toolbar */}
        {selectedMessageIds.size > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-muted">{selectedMessageIds.size} Selected</span>
            <button
              onClick={onClearSelection}
              className="text-xs font-black uppercase text-fg/30 hover:text-fg tracking-wider cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={onBulkDelete}
              className="flex items-center px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete selected
            </button>
          </div>
        )}
      </div>

      {/* Messages scroll area */}
      <div
        ref={chatContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4 relative custom-scrollbar bg-transparent"
      >
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-fg/30" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-fg/20 text-xs font-black uppercase tracking-[0.2em]">
            Session initialized
          </div>
        ) : (
          messages.map((msg) => {
            const msgDateString = new Date(msg.created_at).toDateString();
            const showDate = msgDateString !== lastDateString;
            if (showDate) lastDateString = msgDateString;

            return (
              <Fragment key={msg.id}>
                {showDate && <DateSeparator dateString={msg.created_at} />}
                <MessageBubble
                  msg={msg}
                  isSelected={selectedMessageIds.has(msg.id)}
                  selectionActive={selectedMessageIds.size > 0}
                  onToggleSelect={onToggleMessageSelect}
                  onDelete={onDeleteMessage}
                />
              </Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <ChatComposer
        tenant={tenant}
        windowError={windowError}
        sending={sending}
        uploading={uploading}
        newMessage={newMessage}
        stagedFile={stagedFile}
        showTemplates={showTemplates}
        onMessageChange={onMessageChange}
        onSend={onSend}
        onFileSelect={onFileSelect}
        onFileChange={onFileChange}
        onClearFile={onClearFile}
        onToggleTemplates={onToggleTemplates}
        fileInputRef={fileInputRef}
      />

      {/* Template overlay */}
      {showTemplates && (
        <TemplateSelector
          templates={templates}
          sending={sending}
          onSend={onSendTemplate}
          onClose={onCloseTemplates}
        />
      )}
    </>
  );
}
