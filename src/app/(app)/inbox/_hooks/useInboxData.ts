'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { dbPublic } from '@/lib/db';
import { getRealtimeToken } from '@/lib/realtime-token';

interface UseInboxDataProps {
  initialConversations: any[];
  initialMessages?: any[];
  initialContacts: any[];
  initialTemplates: any[];
  initialTeams?: any[];
  initialMembers?: any[];
  tenant: any;
}

export function useInboxData({
  initialConversations,
  initialMessages = [],
  initialContacts,
  initialTemplates,
  initialTeams = [],
  initialMembers = [],
  tenant,
}: UseInboxDataProps) {
  // ── Data states ──────────────────────────────────────────────────
  const [conversations, setConversations] = useState<any[]>(initialConversations);
  const [allContacts, setAllContacts] = useState<any[]>(initialContacts);
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [teams, setTeams] = useState<any[]>(initialTeams);
  const [members, setMembers] = useState<any[]>(initialMembers);

  // ── Team & Assignment Filter states ─────────────────────────────
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'unassigned' | 'team'>('all');
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

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
  const initialMessagesLoadedRef = useRef<boolean>(
    initialMessages.length > 0 && initialConversations.length > 0 && initialConversations[0]?.contact?.id === (initialConversations.length > 0 ? initialConversations[0].contact.id : null)
  );
  const activeContactIdRef = useRef<string | null>(activeContactId);
  const pendingAssignmentsRef = useRef<Map<string, {
    assignment: any;
    sequence: number;
    previousAssignment: any;
  }>>(new Map());
  const assignmentSeqRef = useRef<number>(0);

  // Sync ref
  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

  // Sync active conversation with current filter transition
  useEffect(() => {
    if (!activeContactId) return;

    let filtered = conversations;
    const currentUserId = tenant?.user_id;

    if (activeFilter === 'mine' && currentUserId) {
      filtered = conversations.filter(c => c.assignment?.assigned_user_id === currentUserId);
    } else if (activeFilter === 'unassigned') {
      filtered = conversations.filter(c => !c.assignment?.assigned_user_id && !c.assignment?.team_id);
    } else if (activeFilter === 'team' && activeTeamId) {
      filtered = conversations.filter(c => c.assignment?.team_id === activeTeamId);
    }

    const stillVisible = filtered.some(c => c.contact?.id === activeContactId);
    if (!stillVisible) {
      setActiveContactId(null);
      setMessages([]);
      setShowChatOnMobile(false);
    }
  }, [activeFilter, activeTeamId, conversations, tenant?.user_id, activeContactId]);

  // Gracefully reset team filter if activeTeamId is no longer in authorized teams list
  useEffect(() => {
    if (activeFilter === 'team' && activeTeamId) {
      if (teams && teams.length > 0 && !teams.some(t => t.id === activeTeamId)) {
        setActiveFilter('all');
        setActiveTeamId(null);
      }
    }
  }, [teams, activeFilter, activeTeamId]);

  // ── Message & Pagination State Refs (prevents dependency recreation loops) ──
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const hasMoreRef = useRef(hasMore);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadingMoreRef = useRef(loadingMore);
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const prevContactIdRef = useRef<string | null>(null);

  // ── Scroll to bottom helper ──────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // ── Mark as read helper ──────────────────────────────────────────
  const markAsRead = useCallback(async (contactId: string) => {
    try {
      // Optimistically clear unread count for this conversation in Inbox list
      setConversations(prev => prev.map(c => c.contact.id === contactId ? { ...c, unreadCount: 0 } : c));

      // Dispatch global event for Sidebar / TenantContext
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pingstack:conversation-read', { detail: { contactId } }));
      }

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
    if (isLoadMore && (!hasMoreRef.current || loadingMoreRef.current)) return;
    if (isLoadMore) setLoadingMore(true);

    const container = chatContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    try {
      const currentMsgs = messagesRef.current;
      const before = isLoadMore && currentMsgs.length > 0 ? currentMsgs[0].created_at : '';
      const limit = isLoadMore ? 30 : 20;
      const url = `/api/chat/${contactId}?limit=${limit}${before ? `&before=${before}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
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
      } else if (res.status === 403 || res.status === 404) {
        setActiveContactId(null);
        setMessages([]);
        setShowChatOnMobile(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isLoadMore) setLoadingMore(false);
    }
  }, [scrollToBottom]);

  // ── Fallback polling data fetchers ───────────────────────────────
  const fetchStatusAndData = useCallback(async () => {
    try {
      const convsRes = await fetch('/api/chat/conversations', { credentials: 'include' });
      if (convsRes.ok) {
        const data: any[] = await convsRes.json();
        
        // Reconcile with any in-flight optimistic assignments so background polling NEVER overwrites newer user intent
        const merged = data.map((conv: any) => {
          const pending = pendingAssignmentsRef.current.get(conv.contact.id);
          if (pending) {
            return { ...conv, assignment: pending.assignment };
          }
          return conv;
        });

        setConversations(merged);
        if (!activeContactId && merged.length > 0 && !initialSelectionMade.current) {
          setActiveContactId(merged[0].contact.id);
          initialSelectionMade.current = true;
        } else if (activeContactId && !merged.some((c: any) => c.contact?.id === activeContactId)) {
          // If active conversation is no longer present in authorized conversations list, clear selection
          setActiveContactId(null);
          setMessages([]);
          setShowChatOnMobile(false);
        }
      }

      // Re-fetch active contact's messages to auto-update delivery & error statuses
      if (activeContactId) {
        const msgRes = await fetch(`/api/chat/${activeContactId}?limit=20`, { credentials: 'include' });
        if (msgRes.ok) {
          const freshMsgs = await msgRes.json();
          setMessages(freshMsgs);
        } else if (msgRes.status === 403 || msgRes.status === 404) {
          setActiveContactId(null);
          setMessages([]);
          setShowChatOnMobile(false);
        }
      }
    } catch (e) {
      console.error('Inbox polling error:', e);
    }
  }, [activeContactId]);

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

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch teams:', e);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team-members', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch members:', e);
    }
  }, []);

  // Background non-blocking fetch of teams & members if not provided on SSR
  useEffect(() => {
    if (!initialTeams || initialTeams.length === 0) {
      fetchTeams();
    }
    if (!initialMembers || initialMembers.length === 0) {
      fetchMembers();
    }
  }, [fetchTeams, fetchMembers, initialTeams, initialMembers]);

  // Lazy fetch templates when template drawer is toggled
  useEffect(() => {
    if (showTemplates && templates.length === 0) {
      fetchTemplates();
    }
  }, [showTemplates, templates.length, fetchTemplates]);

  // Lazy fetch contacts when user searches contacts or opens new chat
  useEffect(() => {
    if (searchQuery.trim().length > 0 && allContacts.length === 0) {
      fetchContacts();
    }
  }, [searchQuery, allContacts.length, fetchContacts]);

  const fetchStatusAndDataRef = useRef(fetchStatusAndData);
  useEffect(() => {
    fetchStatusAndDataRef.current = fetchStatusAndData;
  }, [fetchStatusAndData]);

  // ── Visibility & Polling (No immediate 0s duplicate fetch on mount) ─
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchStatusAndDataRef.current();
          }
        }, 3000);
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
        fetchStatusAndDataRef.current();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ── Realtime subscription (Deduplicated token) ────────────────────
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
        const token = await getRealtimeToken(tenant.id);
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

  // ── Load messages when active contact changes (Skips duplicate on SSR fast-path) ──
  useEffect(() => {
    if (!activeContactId) {
      prevContactIdRef.current = null;
      return;
    }

    if (initialMessagesLoadedRef.current) {
      initialMessagesLoadedRef.current = false;
      prevContactIdRef.current = activeContactId;
      markAsRead(activeContactId);
      return;
    }

    if (prevContactIdRef.current !== activeContactId) {
      prevContactIdRef.current = activeContactId;
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
        if (isClosed) {
          setNewMessage(prev => prev === '' ? 'Chat window closed' : prev);
        } else {
          setNewMessage(prev => prev === 'Chat window closed' ? '' : prev);
        }
      }
    }
  }, [activeContactId, conversations]);

  // ── Event Handlers ────────────────────────────────────────────────
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMoreRef.current && !loadingMoreRef.current && messagesRef.current.length > 0) {
      fetchMessages(activeContactId!, true);
    }
  }, [activeContactId, fetchMessages]);

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
    const count = selectedMessageIds.size;
    const confirmMessage = count === 1
      ? 'Are you sure you want to delete this message?'
      : `Are you sure you want to delete these ${count} messages?`;
    if (!confirm(confirmMessage)) return;
    try {
      const res = await fetch('/api/messages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '' },
        body: JSON.stringify({ ids: Array.from(selectedMessageIds) }),
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
        setSelectedMessageIds(new Set());
        setToast({ message: count === 1 ? 'Message deleted' : `${count} messages deleted`, type: 'success' });
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

  const handleDeleteConversation = useCallback(async (contactId: string) => {
    try {
      const res = await fetch(`/api/chat/${contactId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '' },
      });
      if (res.ok) {
        setConversations(prev => {
          const updated = prev.filter(c => c.contact.id !== contactId);
          if (activeContactId === contactId) {
            const nextActiveId = updated.length > 0 ? updated[0].contact.id : null;
            setActiveContactId(nextActiveId);
            if (nextActiveId) {
              fetchMessages(nextActiveId);
            } else {
              setMessages([]);
            }
            setShowChatOnMobile(false);
          }
          return updated;
        });
        setToast({ message: 'Conversation deleted', type: 'success' });
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error || 'Failed to delete conversation', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error deleting conversation', type: 'error' });
    }
  }, [activeContactId, fetchMessages, tenant?.id]);

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

  const handleAssignConversation = useCallback(async (contactId: string, teamId: string | null, assignedUserId: string | null) => {
    // 1. Capture current assignment state as rollback anchor
    const currentConv = conversations.find(c => c.contact?.id === contactId);
    const previousAssignment = currentConv?.assignment || null;

    // 2. Resolve team and user objects from teams/members lists
    const targetTeam = teams.find(t => t.id === teamId) || null;
    const targetUser = members.find(m => m.id === assignedUserId) || null;

    const optimisticAssignment = {
      tenant_id: tenant?.id || '',
      contact_id: contactId,
      team_id: teamId,
      assigned_user_id: assignedUserId,
      status: 'open',
      team: targetTeam ? { id: targetTeam.id, name: targetTeam.name, color: targetTeam.color } : null,
      assigned_user: targetUser ? { id: targetUser.id, name: targetUser.name, email: targetUser.email } : null
    };

    // 3. Increment monotonic sequence and record pending assignment
    const seq = ++assignmentSeqRef.current;
    pendingAssignmentsRef.current.set(contactId, {
      assignment: optimisticAssignment,
      sequence: seq,
      previousAssignment
    });

    // 4. Immediately apply local-first optimistic state to conversations list
    setConversations(prev => prev.map(c => {
      if (c.contact?.id === contactId) {
        return { ...c, assignment: optimisticAssignment };
      }
      return c;
    }));

    try {
      const res = await fetch(`/api/chat/${contactId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ teamId, assignedUserId })
      });

      const data = await res.json().catch(() => ({}));

      // Check if this request is still the newest user selection for this contact
      const pending = pendingAssignmentsRef.current.get(contactId);
      if (pending && pending.sequence === seq) {
        if (!res.ok) {
          // Revert to confirmed previous assignment on failure
          pendingAssignmentsRef.current.delete(contactId);
          setConversations(prev => prev.map(c => {
            if (c.contact?.id === contactId) {
              return { ...c, assignment: pending.previousAssignment };
            }
            return c;
          }));
          setToast({ message: data.error || 'Failed to update conversation assignment', type: 'error' });
        } else {
          // Confirm authoritative server assignment
          const serverAssignment = data.assignment || optimisticAssignment;
          pendingAssignmentsRef.current.delete(contactId);
          setConversations(prev => prev.map(c => {
            if (c.contact?.id === contactId) {
              return { ...c, assignment: serverAssignment };
            }
            return c;
          }));
          setToast({ message: 'Conversation assignment updated', type: 'success' });
        }
      }
    } catch (e) {
      console.error('Assignment error:', e);
      const pending = pendingAssignmentsRef.current.get(contactId);
      if (pending && pending.sequence === seq) {
        pendingAssignmentsRef.current.delete(contactId);
        setConversations(prev => prev.map(c => {
          if (c.contact?.id === contactId) {
            return { ...c, assignment: pending.previousAssignment };
          }
          return c;
        }));
        setToast({ message: 'Network error updating assignment', type: 'error' });
      }
    }
  }, [conversations, teams, members, tenant?.id]);

  return {
    // states
    conversations,
    setConversations,
    allContacts,
    messages,
    templates,
    teams,
    setTeams,
    members,
    setMembers,
    activeFilter,
    setActiveFilter,
    activeTeamId,
    setActiveTeamId,
    loading,
    sending,
    uploading,
    loadingMore,
    hasMore,
    toast,
    setToast,
    activeContactId,
    setActiveContactId,
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
    handleDeleteConversation,
    handleToggleMessageSelect,
    handleFileSelect,
    handleFileChange,
    handleAssignConversation,
  };
}

