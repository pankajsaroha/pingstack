'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { dbPublic } from '@/lib/db';

interface UseInboxDataProps {
  initialConversations: any[];
  initialContacts: any[];
  initialTemplates: any[];
  tenant: any;
}

export function useInboxData({
  initialConversations,
  initialContacts,
  initialTemplates,
  tenant,
}: UseInboxDataProps) {
  // ── Data states ──────────────────────────────────────────────────
  const [conversations, setConversations] = useState<any[]>(initialConversations);
  const [allContacts, setAllContacts] = useState<any[]>(initialContacts);
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>(initialTemplates);

  // ── UI states ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Chat states ──────────────────────────────────────────────────
  const [activeContactId, setActiveContactId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].contact.id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [windowError, setWindowError] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // ── Refs ─────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialSelectionMade = useRef(initialConversations.length > 0);
  const activeContactIdRef = useRef<string | null>(activeContactId);

  // Sync ref
  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

  // ── Scroll to bottom helper ──────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // ── Mark as read helper ──────────────────────────────────────────
  const markAsRead = useCallback(async (contactId: string) => {
    try {
      await fetch(`/api/chat/${contactId}/read`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenant?.id || '' },
      });
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  }, [tenant?.id]);

  // ── Fetch messages helper ────────────────────────────────────────
  const fetchMessages = useCallback(async (contactId: string, isLoadMore = false) => {
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
            if (container) {
              container.scrollTop = previousScrollTop + (container.scrollHeight - previousScrollHeight);
            }
          }, 0);
        } else {
          setMessages(data);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isLoadMore) setLoadingMore(false);
    }
  }, [messages, hasMore, loadingMore, scrollToBottom]);

  // ── Fallback polling data fetchers ───────────────────────────────
  const fetchStatusAndData = useCallback(async () => {
    if (tenant?.whatsapp_account?.status !== 'ACTIVE') {
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
    }
  }, [tenant?.whatsapp_account?.status, activeContactId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates', { credentials: 'include' });
      if (res.ok) setTemplates((await res.json()) || []);
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      if (res.ok) setAllContacts((await res.json()) || []);
    } catch (e) {
      console.error('Failed to fetch contacts:', e);
    }
  }, []);

  // ── Visibility & Polling ──────────────────────────────────────────
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchStatusAndData();
          }
        }, 60000);
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
  }, [fetchStatusAndData]);

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
        if (!res.ok) {
          console.error('[realtime] token failed', await res.text());
          return;
        }
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
  }, [tenant?.id, scrollToBottom]);

  // ── Load messages when active contact changes ─────────────────────
  useEffect(() => {
    if (activeContactId) {
      setMessages([]);
      setHasMore(true);
      fetchMessages(activeContactId);
      markAsRead(activeContactId);
    }
  }, [activeContactId, fetchMessages, markAsRead]);

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
  }, [activeContactId, conversations, newMessage]);

  // ── Event Handlers ────────────────────────────────────────────────
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
      fetchMessages(activeContactId!, true);
    }
  }, [activeContactId, fetchMessages, hasMore, loadingMore, messages.length]);

  const handleSelectContact = useCallback((contactId: string) => {
    setActiveContactId(contactId);
    setShowChatOnMobile(true);
  }, []);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
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
          body: formData,
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
          body: JSON.stringify({ content: messageContent }),
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
  }, [activeContactId, fetchMessages, newMessage, sending, stagedFile, tenant?.id, uploading]);

  const handleSendTemplate = useCallback(async (template: any, vars: Record<string, string>) => {
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
          variables: Object.values(vars),
        }),
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
  }, [activeContactId, fetchMessages, tenant?.id]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedMessageIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMessageIds.size} messages?`)) return;
    try {
      const res = await fetch('/api/messages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '' },
        body: JSON.stringify({ ids: Array.from(selectedMessageIds) }),
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
  }, [selectedMessageIds, tenant?.id]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '' },
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
  }, [tenant?.id]);

  const handleToggleMessageSelect = useCallback((id: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setStagedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return {
    // states
    conversations,
    allContacts,
    messages,
    templates,
    loading,
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

    // refs
    messagesEndRef,
    chatContainerRef,
    fileInputRef,

    // handlers
    handleScroll,
    handleSelectContact,
    handleSendMessage,
    handleSendTemplate,
    handleBulkDelete,
    handleDeleteMessage,
    handleToggleMessageSelect,
    handleFileSelect,
    handleFileChange,
  };
}
