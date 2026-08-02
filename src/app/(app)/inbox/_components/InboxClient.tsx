'use client';

import { useInboxData } from '../_hooks/useInboxData';
import ConversationList from './ConversationList';
import ChatThread from './ChatThread';
import Toast from '@/components/Toast';
import Link from 'next/link';
import { MessageCircle, Search, X, AlertCircle } from 'lucide-react';

interface InboxClientProps {
  initialConversations: any[];
  initialContacts: any[];
  initialTemplates: any[];
  tenant: any;
}

export default function InboxClient({
  initialConversations,
  initialContacts,
  initialTemplates,
  tenant,
}: InboxClientProps) {
  const {
    conversations,
    allContacts,
    messages,
    templates,
    sending,
    uploading,
    loadingMore,
    hasMore,
    toast,
    setToast,
    activeContactId,
    searchQuery,
    setSearchQuery,
    newMessage,
    setNewMessage,
    windowError,
    stagedFile,
    setStagedFile,
    showChatOnMobile,
    setShowChatOnMobile,
    showTemplates,
    setShowTemplates,
    selectedMessageIds,
    setSelectedMessageIds,

    messagesEndRef,
    chatContainerRef,
    fileInputRef,

    handleScroll,
    handleSelectContact,
    handleSendMessage,
    handleSendTemplate,
    handleBulkDelete,
    handleDeleteMessage,
    handleToggleMessageSelect,
    handleFileSelect,
    handleFileChange,
  } = useInboxData({
    initialConversations,
    initialContacts,
    initialTemplates,
    tenant,
  });

  const whatsappAccount = tenant?.whatsapp_account;
  const status = whatsappAccount?.status || 'NOT_CONNECTED';

  if (status === 'NOT_CONNECTED') {
    return (
      <div className="flex-grow flex-1 min-h-[450px] flex flex-col items-center justify-center bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl text-center p-12 max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center mb-6">
          <MessageCircle className="w-8 h-8 text-fg/30" />
        </div>
        <h2 className="text-2xl font-black text-fg tracking-tight">WhatsApp Offline</h2>
        <p className="text-muted mt-3 text-sm leading-relaxed max-w-sm">Please head over to your API Settings dashboard and link your Meta Business Profile to activate inbox streaming.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
          Connect Gateway
        </Link>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="flex-grow flex-1 min-h-[450px] flex flex-col items-center justify-center bg-[#050505] text-center p-10">
        <div className="flex-grow flex-1 min-h-[450px] flex flex-col items-center justify-center bg-glass-card border border-red-500/10 rounded-[2.5rem] text-center p-12 max-w-2xl mx-auto my-12 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-fg tracking-tight">Sync Pipeline Crashed</h2>
          <p className="text-muted mt-3 text-sm leading-relaxed max-w-sm font-semibold">Verification check failed. Retrigger partner permissions on Facebook settings.</p>
          <Link href="/dashboard" className="mt-8 px-6 py-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl font-bold transition-all">
            Retry Setup
          </Link>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.contact.id === activeContactId) || (() => {
    const contact = allContacts.find(c => c.id === activeContactId);
    return contact ? { contact, latestMessage: null, unreadCount: 0 } : null;
  })();

  return (
    <div className="flex-1 min-h-0 h-full flex bg-glass-card border border-glass-border rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden -mx-2 sm:mx-0">
      {/* Left panel — conversation list */}
      <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-r border-glass-border bg-glass-card/30`}>
        {/* Panel header */}
        <div className="p-6 border-b border-glass-border flex items-center justify-between">
          <h2 className="text-xl font-black text-fg tracking-tight">Inbox</h2>
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Sync
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-glass-border">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
            <input
              type="text"
              placeholder="Search chats or contacts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-glass-input border border-glass-border rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-fg placeholder:text-fg/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-fg/30 hover:text-fg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          allContacts={allContacts}
          activeContactId={activeContactId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectContact={handleSelectContact}
        />
      </div>

      {/* Right panel — chat thread */}
      <div className={`${showChatOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-glass-input relative`}>
        {/* Wallpaper texture */}
        <div className="absolute inset-0 bg-[url('/cubes.png')] opacity-[0.22] dark:opacity-[0.15] invert dark:invert-0 pointer-events-none" />

        <ChatThread
          activeConversation={activeConversation}
          messages={messages}
          loadingMore={loadingMore}
          hasMore={hasMore}
          sending={sending}
          uploading={uploading}
          windowError={windowError}
          newMessage={newMessage}
          stagedFile={stagedFile}
          showTemplates={showTemplates}
          templates={templates}
          tenant={tenant}
          selectedMessageIds={selectedMessageIds}
          messagesEndRef={messagesEndRef}
          chatContainerRef={chatContainerRef}
          fileInputRef={fileInputRef}
          onScroll={handleScroll}
          onMessageChange={setNewMessage}
          onSend={handleSendMessage}
          onSendTemplate={handleSendTemplate}
          onFileSelect={handleFileSelect}
          onFileChange={handleFileChange}
          onClearFile={() => setStagedFile(null)}
          onToggleTemplates={() => setShowTemplates(v => !v)}
          onCloseTemplates={() => setShowTemplates(false)}
          onToggleMessageSelect={handleToggleMessageSelect}
          onDeleteMessage={handleDeleteMessage}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedMessageIds(new Set())}
          onBackMobile={() => setShowChatOnMobile(false)}
        />
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
