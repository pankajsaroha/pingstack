'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, Loader2, AlertCircle, Search, X } from 'lucide-react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { PLANS, getActivePlanType } from '@/lib/plans';
import { dbPublic } from '@/lib/db';
import { useTenant } from '@/context/tenant-context';

import ConversationList from './_components/ConversationList';
import ChatThread from './_components/ChatThread';

export default function Inbox() {
  // ── Tenant from shared context (fetched once in layout) ───────────
  const { tenant } = useTenant();

  // ── Data ─────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // ── UI state ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Conversation / chat state ─────────────────────────────────────
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Debounce search query updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);
  const [windowError, setWindowError] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // ── Refs ──────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialSelectionMade = useRef(false);
  const activeContactIdRef = useRef<string | null>(activeContactId);

  // ── Keep ref in sync ──────────────────────────────────────────────
  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchStatusAndData(),
      fetchTemplates(),
      fetchContacts()
    ]);

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchStatusAndData();
          }
        }, 60000); // 60 seconds fallback polling
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatusAndData();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────
  useEffect(() => {
    if (!tenant?.id) return;
    let isMounted = true;

    const handleRealtimeMessage = (payload: any) => {
      const message = payload.new || payload.record;
      if (!message || !message.id) return;

      if (message.contact_id === activeContactIdRef.current) {
        setMessages(prev => {
          const existingIndex = prev.findIndex((m: any) => m.id === message.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = { ...next[existingIndex], ...message };
            return next;
          }
          setTimeout(scrollToBottom, 50);
          return [...prev, message].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }

      setConversations(prev => {
        const idx = prev.findIndex(c => c.contact.id === message.contact_id);
        if (idx === -1) return prev;
        const next = [...prev];
        const conversation = next[idx];
        const newCreatedAt = new Date(message.created_at).getTime();
        if (!conversation.latestMessage || newCreatedAt >= new Date(conversation.latestMessage.created_at).getTime()) {
          conversation.latestMessage = message;
        }
        if (message.direction === 'inbound' && message.status === 'received') {
          conversation.unreadCount = Math.max((conversation.unreadCount || 0) + 1, 0);
        }
        return next.sort(
          (a, b) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime()
        );
      });
    };

    const realtimeChannelRef: { current: ReturnType<typeof dbPublic.channel> | null } = { current: null };

    const subscribeToMessages = async () => {
      try {
        const res = await fetch('/api/realtime/token', { method: 'POST', credentials: 'include' });
        if (!res.ok) { console.error('[realtime] token failed', await res.text()); return; }
        const { token } = await res.json();
        if (!token || !isMounted) return;

        dbPublic.realtime.setAuth(token);
        const channel = dbPublic.channel(`tenant:${tenant.id}`, { config: { private: true } })
          .on('broadcast', { event: 'INSERT' }, (p: any) => handleRealtimeMessage(p.payload || p))
          .on('broadcast', { event: 'UPDATE' }, (p: any) => handleRealtimeMessage(p.payload || p))
          .subscribe();
        realtimeChannelRef.current = channel;
      } catch (err) {
        console.error('[realtime] subscribe failed', err);
      }
    };

    subscribeToMessages();
    return () => {
      isMounted = false;
      if (realtimeChannelRef.current) dbPublic.removeChannel(realtimeChannelRef.current);
    };
  }, [tenant?.id]);

  // ── Load messages when active contact changes ─────────────────────
  useEffect(() => {
    if (activeContactId) {
      setMessages([]);
      setHasMore(true);
      fetchMessages(activeContactId);
      markAsRead(activeContactId);
    }
  }, [activeContactId]);

  // ── Window-closed check ───────────────────────────────────────────
  useEffect(() => {
    if (activeContactId && conversations.length > 0) {
      const conversation = conversations.find(c => c.contact.id === activeContactId);
      if (conversation) {
        const lastReceived = conversation.contact.last_received_at;
        const isClosed = !lastReceived || (Date.now() - new Date(lastReceived).getTime() > 24 * 60 * 60 * 1000);
        setWindowError(isClosed);
        if (isClosed && newMessage !== 'Chat window closed') setNewMessage('Chat window closed');
        else if (!isClosed && newMessage === 'Chat window closed') setNewMessage('');
      }
    }
  }, [activeContactId, conversations]);

  // ── Helpers ───────────────────────────────────────────────────────
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') =>
    messagesEndRef.current?.scrollIntoView({ behavior });

  // ── Data fetchers ─────────────────────────────────────────────────
  const fetchStatusAndData = async () => {
    // Tenant comes from TenantContext — no need to re-fetch /api/tenant/me here
    if (tenant?.whatsapp_account?.status !== 'ACTIVE') {
      setLoading(false);
      return;
    }
    try {
      const convsRes = await fetch('/api/chat/conversations', { credentials: 'include' });
      if (convsRes.ok) {
        const data = await convsRes.json();
        setConversations(data);
        if (!activeContactId && data.length > 0 && !initialSelectionMade.current) {
          setActiveContactId(data[0].contact.id);
          initialSelectionMade.current = true;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates', { credentials: 'include' });
      if (res.ok) setTemplates((await res.json()) || []);
    } catch (e) { console.error('Failed to fetch templates:', e); }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      if (res.ok) setAllContacts((await res.json()) || []);
    } catch (e) { console.error('Failed to fetch contacts:', e); }
  };

  const fetchMessages = async (contactId: string, isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return;
    if (isLoadMore) setLoadingMore(true);

    const container = chatContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    try {
      const before = isLoadMore && messages.length > 0 ? messages[0].created_at : '';
      const limit = isLoadMore ? 30 : 15;
      const url = `/api/chat/${contactId}?limit=${limit}${before ? `&before=${before}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.length < limit) setHasMore(false);
        if (isLoadMore) {
          setMessages(prev => [...data, ...prev]);
          setTimeout(() => {
            if (container) container.scrollTop = previousScrollTop + (container.scrollHeight - previousScrollHeight);
          }, 0);
        } else {
          setMessages(data);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      }
    } catch (e) { console.error(e); }
    finally { if (isLoadMore) setLoadingMore(false); }
  };

  const markAsRead = async (contactId: string) => {
    try {
      await fetch(`/api/chat/${contactId}/read`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
    } catch (e) { console.error('Failed to mark as read:', e); }
  };

  // ── Handlers ──────────────────────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
      fetchMessages(activeContactId!, true);
    }
  };

  const handleSelectContact = (contactId: string) => {
    setActiveContactId(contactId);
    setShowChatOnMobile(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = newMessage.trim().length > 0;
    if ((!hasContent && !stagedFile) || sending || uploading || !activeContactId) return;

    const messageContent = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      if (stagedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', stagedFile);
        formData.append('mediaType', stagedFile.type.startsWith('image/') ? 'image' :
                                     stagedFile.type.startsWith('video/') ? 'video' :
                                     stagedFile.type.startsWith('audio/') ? 'audio' : 'document');
        formData.append('fileName', stagedFile.name);
        if (hasContent) formData.append('caption', messageContent);

        const res = await fetch(`/api/chat/${activeContactId}/attachment`, {
          method: 'POST',
          headers: { 'x-tenant-id': tenant?.id || '' },
          body: formData
        });

        if (res.ok) {
          setStagedFile(null);
          setToast({ message: 'Attachment sent!', type: 'success' });
          fetchMessages(activeContactId);
        } else {
          const errorData = await res.json();
          if (errorData.code === 'WINDOW_CLOSED' || errorData.code === 'WINDOW_NEVER_OPENED') {
            setWindowError(true);
            setNewMessage('Chat window closed');
          } else {
            setToast({ message: errorData.error || 'Failed to send attachment', type: 'error' });
            setNewMessage(messageContent);
          }
        }
      } else {
        const res = await fetch(`/api/chat/${activeContactId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '' },
          body: JSON.stringify({ content: messageContent })
        });
        if (res.ok) {
          fetchMessages(activeContactId);
        } else {
          const data = await res.json();
          if (data.code === 'WINDOW_CLOSED' || data.code === 'WINDOW_NEVER_OPENED') {
            setWindowError(true);
            setNewMessage('Chat window closed');
          } else {
            setToast({ message: data.error || 'Failed to send message', type: 'error' });
            setNewMessage(messageContent);
          }
        }
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Send failed', type: 'error' });
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleSendTemplate = async (template: any, vars: Record<string, string>) => {
    if (!activeContactId) return;
    setSending(true);
    setShowTemplates(false);
    try {
      const res = await fetch(`/api/chat/${activeContactId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '' },
        body: JSON.stringify({
          templateName: template.name,
          language: template.language || 'en_US',
          variables: Object.values(vars)
        })
      });
      if (res.ok) {
        setToast({ message: 'Template sent successfully', type: 'success' });
        setWindowError(false);
        fetchMessages(activeContactId);
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to send template', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error sending template', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessageIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMessageIds.size} messages?`)) return;
    try {
      const res = await fetch('/api/messages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '' },
        body: JSON.stringify({ ids: Array.from(selectedMessageIds) })
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
        setSelectedMessageIds(new Set());
        setToast({ message: 'Messages deleted', type: 'success' });
      } else {
        setToast({ message: 'Failed to delete messages', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error deleting messages', type: 'error' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setToast({ message: 'Message deleted', type: 'success' });
      } else {
        setToast({ message: 'Failed to delete message', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error deleting message', type: 'error' });
    }
  };

  const handleToggleMessageSelect = (id: string) => {
    const next = new Set(selectedMessageIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMessageIds(next);
  };

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;
    const limits = PLANS[getActivePlanType(tenant.plan_type)];
    if (file.size > limits.maxFileSizeMb * 1024 * 1024) {
      setToast({ message: `File too large. Max ${limits.maxFileSizeMb}MB for your plan.`, type: 'error' });
      return;
    }
    setStagedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Derived ───────────────────────────────────────────────────────
  const whatsappAccount = tenant?.whatsapp_account;
  const status = whatsappAccount?.status || 'NOT_CONNECTED';

  const activeConversation = useMemo(() => {
    const existing = conversations.find(c => c.contact.id === activeContactId);
    if (existing) return existing;
    const contact = allContacts.find(c => c.id === activeContactId);
    return contact ? { contact, latestMessage: null, unreadCount: 0 } : null;
  }, [conversations, allContacts, activeContactId]);

  // ── Status gates ──────────────────────────────────────────────────
  if (loading && !tenant) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-32 grayscale opacity-45">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-fg" />
        <p className="text-xs font-black uppercase tracking-[0.2em]">Initializing messaging streams...</p>
      </div>
    );
  }

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
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-6" />
        <h2 className="text-xl font-black text-fg uppercase tracking-widest">Configuring Channel...</h2>
        <p className="text-muted text-xs mt-3 max-w-xs font-semibold leading-relaxed">Resolving partner authentication mappings on Meta developers dashboard.</p>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
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
    );
  }

  // ── Main layout ───────────────────────────────────────────────────
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
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full bg-glass-input border border-glass-border rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-fg placeholder:text-fg/20 transition-all"
            />
            {searchVal && (
              <button
                onClick={() => {
                  setSearchVal('');
                  setSearchQuery('');
                }}
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
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.22] dark:opacity-[0.15] invert dark:invert-0 pointer-events-none" />

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
