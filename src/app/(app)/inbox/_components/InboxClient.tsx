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
      <div className="flex-grow flex-1 min-h-[420px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs text-center p-8 max-w-xl mx-auto my-8">
        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl flex items-center justify-center mb-4">
          <MessageCircle className="w-6 h-6 text-zinc-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">WhatsApp Connection Pending</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-xs leading-relaxed max-w-md">
          If you have already linked your WhatsApp Business Account, it may take a few minutes to complete initial synchronization and activate live inbox streaming.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center items-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Refresh Page 🔄
          </button>
          <Link href="/dashboard" className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-2xs">
            Check Connection Status
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="flex-grow flex-1 min-h-[420px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-red-500/20 rounded-xl text-center p-8 max-w-xl mx-auto my-8 shadow-2xs">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Sync Pipeline Crashed</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-xs leading-relaxed max-w-sm">Verification check failed. Retrigger partner permissions on Facebook settings.</p>
        <Link href="/dashboard" className="mt-6 px-4 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-all">
          Retry Setup
        </Link>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.contact.id === activeContactId) || (() => {
    const contact = allContacts.find(c => c.id === activeContactId);
    return contact ? { contact, latestMessage: null, unreadCount: 0 } : null;
  })();

  return (
    <div className="flex-1 min-h-0 h-full flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden mx-0 w-full">
      {/* Left panel — conversation list */}
      <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50`}>
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Conversations</h2>
          <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chats or contacts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-lg pl-9 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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
      <div className={`${showChatOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-zinc-50/30 dark:bg-zinc-950/40 relative`}>
        {/* Wallpaper texture */}
        <div className="absolute inset-0 bg-[url('/cubes.png')] opacity-[0.08] dark:opacity-[0.05] invert dark:invert-0 pointer-events-none" />

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
