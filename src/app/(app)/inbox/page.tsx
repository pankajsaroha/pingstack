'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, Check, CheckCheck, MessageCircle, Loader2, AlertCircle, Plus, Trash2, ChevronLeft, Zap, X, Paperclip, Image, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { PLANS, PlanType } from '@/lib/plans';
import { dbPublic } from '@/lib/db';

export default function Inbox() {
  const [tenant, setTenant] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialSelectionMade = useRef(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [windowError, setWindowError] = useState<boolean>(false);
  const [showSyncNotice, setShowSyncNotice] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeContactIdRef = useRef<string | null>(activeContactId);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    const planType = (tenant.plan_type || 'starter') as PlanType;
    const limits = PLANS[planType];
    
    if (file.size > limits.maxFileSizeMb * 1024 * 1024) {
      setToast({ message: `File too large. Max ${limits.maxFileSizeMb}MB for your plan.`, type: 'error' });
      return;
    }

    setStagedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    fetchStatusAndData();
    fetchTemplates();
    const interval = setInterval(fetchStatusAndData, 10000);
    return () => clearInterval(interval);
  }, []); 

  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

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
          return [...prev, message].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      }

      setConversations(prev => {
        const idx = prev.findIndex(c => c.contact.id === message.contact_id);
        if (idx === -1) return prev;

        const next = [...prev];
        const conversation = next[idx];
        const latestMessage = conversation.latestMessage;
        const newCreatedAt = new Date(message.created_at).getTime();

        if (!latestMessage || newCreatedAt >= new Date(latestMessage.created_at).getTime()) {
          conversation.latestMessage = message;
        }

        if (message.direction === 'inbound' && message.status === 'received') {
          conversation.unreadCount = Math.max((conversation.unreadCount || 0) + 1, 0);
        }

        return next.sort((a, b) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime());
      });
    };

    const subscribeToMessages = async () => {
      try {
        const res = await fetch('/api/realtime/token', {
          method: 'POST',
          credentials: 'include'
        });

        if (!res.ok) {
          console.error('[messages realtime] token failed', await res.text());
          return;
        }

        const { token } = await res.json();
        if (!token || !isMounted) return;

        dbPublic.realtime.setAuth(token);

        const messageChannel = dbPublic.channel(`tenant:${tenant.id}`, {
          config: { private: true }
        })
          .on('broadcast', { event: 'INSERT' }, (payload: any) => {
            handleRealtimeMessage(payload.payload || payload);
          })
          .on('broadcast', { event: 'UPDATE' }, (payload: any) => {
            handleRealtimeMessage(payload.payload || payload);
          })
          .subscribe();

        realtimeChannelRef.current = messageChannel;
      } catch (err) {
        console.error('[messages realtime] subscribe failed', err);
      }
    };

    const realtimeChannelRef: { current: ReturnType<typeof dbPublic.channel> | null } = { current: null };
    subscribeToMessages();

    return () => {
      isMounted = false;
      if (realtimeChannelRef.current) {
        dbPublic.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [tenant?.id]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    }
  };

  useEffect(() => {
    if (activeContactId) {
      setMessages([]);
      setHasMore(true);
      fetchMessages(activeContactId);
      markAsRead(activeContactId);
    }
  }, [activeContactId]);

  useEffect(() => {
    if (activeContactId && conversations.length > 0) {
      const conversation = conversations.find(c => c.contact.id === activeContactId);
      if (conversation) {
        const lastReceived = conversation.contact.last_received_at;
        const now = new Date();
        const isClosed = !lastReceived || (now.getTime() - new Date(lastReceived).getTime() > 24 * 60 * 60 * 1000);
        setWindowError(isClosed);
        
        if (isClosed && newMessage !== 'Chat window closed') {
          setNewMessage('Chat window closed');
        } else if (!isClosed && newMessage === 'Chat window closed') {
          setNewMessage('');
        }
      }
    }
  }, [activeContactId, conversations]);

  useEffect(() => {
    if (!loadingMore) {
        scrollToBottom();
    }
  }, [messages, loadingMore]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchStatusAndData = async () => {
    try {
      const statusRes = await fetch('/api/tenant/me', { credentials: 'include' });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setTenant(statusData);

        if (statusData.whatsapp_account?.status === 'ACTIVE') {
          const res = await fetch('/api/chat/conversations', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setConversations(data);
            
            if (!activeContactId && data.length > 0 && !initialSelectionMade.current) {
              setActiveContactId(data[0].contact.id);
              initialSelectionMade.current = true;
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string, isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return;
    if (isLoadMore) setLoadingMore(true);
    
    try {
      const before = isLoadMore && messages.length > 0 ? messages[0].created_at : '';
      const url = `/api/chat/${contactId}?limit=30${before ? `&before=${before}` : ''}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.length < 30) setHasMore(false);
        
        if (isLoadMore) {
          setMessages(prev => [...data, ...prev]);
        } else {
          setMessages(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isLoadMore) setLoadingMore(false);
    }
  };

  const markAsRead = async (contactId: string) => {
    try {
      await fetch(`/api/chat/${contactId}/read`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
        fetchMessages(activeContactId!, true);
    }
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
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': tenant?.id || ''
          },
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
      console.error('Send error:', err);
      setToast({ message: err.message || 'Send failed', type: 'error' });
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleSendTemplate = async (template: any) => {
    if (!activeContactId) return;
    
    setSending(true);
    setShowTemplates(false);
    
    try {
      const res = await fetch(`/api/chat/${activeContactId}/template`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ 
          templateName: template.name,
          language: template.language || 'en_US',
          variables: Object.values(templateVars)
        })
      });

      if (res.ok) {
        setToast({ message: 'Template sent successfully', type: 'success' });
        setWindowError(false);
        setSelectedTemplate(null);
        setTemplateVars({});
        fetchMessages(activeContactId);
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to send template', type: 'error' });
      }
    } catch (err) {
      console.error('Template send error:', err);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '' 
        },
        body: JSON.stringify({ ids: Array.from(selectedMessageIds) })
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
        setSelectedMessageIds(new Set());
        setToast({ message: 'Messages deleted', type: 'success' });
      } else {
        setToast({ message: 'Failed to delete messages', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error deleting messages', type: 'error' });
    }
  };

  const toggleMessageSelection = (id: string) => {
    const next = new Set(selectedMessageIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMessageIds(next);
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
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error deleting message', type: 'error' });
    }
  };

  const whatsappAccount = tenant?.whatsapp_account;
  const status = whatsappAccount?.status || 'NOT_CONNECTED';

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
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl text-center p-12 max-w-2xl mx-auto my-12">
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
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-[#050505] text-center p-10">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-6" />
        <h2 className="text-xl font-black text-fg uppercase tracking-widest">Configuring Channel...</h2>
        <p className="text-muted text-xs mt-3 max-w-xs font-semibold leading-relaxed">Resolving partner authentication mappings on Meta developers dashboard.</p>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-glass-card border border-red-500/10 rounded-[2.5rem] text-center p-12 max-w-2xl mx-auto my-12 shadow-2xl">
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

  const activeConversation = conversations.find(c => c.contact.id === activeContactId);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-glass-card border border-glass-border rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden -mx-2 sm:mx-0">
      
      {/* Conversations Master List */}
      <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-r border-glass-border bg-glass-card/30`}>
        <div className="p-6 border-b border-glass-border flex items-center justify-between">
          <h2 className="text-xl font-black text-fg tracking-tight">Inbox</h2>
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Sync
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-8 text-xs text-fg/30 font-black uppercase tracking-widest text-center mt-20">
              <MessageCircle className="w-12 h-12 text-fg/10 mx-auto mb-4" />
              Inbox is empty
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {conversations.map((conv) => {
                const isActive = conv.contact.id === activeContactId;
                return (
                   <div 
                     key={conv.contact.id}
                     onClick={() => {
                        setActiveContactId(conv.contact.id);
                        setShowChatOnMobile(true);
                      }}
                     className={`p-5 cursor-pointer transition-all relative ${
                       isActive ? 'bg-fg text-bg shadow-lg z-10 scale-[1.01]' : 'hover:bg-glass-card'
                     }`}
                   >
                     {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                     <div className="flex justify-between items-start mb-1.5">
                       <h3 className={`font-black text-sm truncate pr-2 ${isActive ? 'text-bg' : 'text-fg'}`}>
                         {conv.contact.name || conv.contact.phone_number}
                       </h3>
                       <span className={`text-[9px] font-black uppercase font-mono ${isActive ? 'text-bg/60' : 'text-fg/30'}`}>
                          {new Date(conv.latestMessage.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                     </div>
                     <div className="flex justify-between items-end">
                       <p className={`text-xs truncate w-full ${
                         conv.unreadCount > 0 
                           ? (isActive ? 'text-bg font-black' : 'text-fg font-black') 
                           : (isActive ? 'text-bg/70' : 'text-muted')
                       }`}>
                         {conv.latestMessage.direction === 'outbound' && <span className="mr-1 font-black text-indigo-400">You:</span>}
                         {conv.latestMessage.content || 'Attachment File'}
                       </p>
                       {conv.unreadCount > 0 && (
                         <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2 shadow-lg shadow-indigo-600/10">
                           <span className="text-[10px] font-black text-fg">{conv.unreadCount}</span>
                         </div>
                       )}
                     </div>
                   </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Thread Workspace */}
      <div className={`${showChatOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-glass-input relative`}>
        {activeContactId && activeConversation ? (
          <>
            {/* Header Panel */}
            <div className="h-20 px-6 border-b border-glass-border flex items-center bg-bg/85 backdrop-blur-md z-10 sticky top-0 justify-between">
              <div className="flex items-center min-w-0">
                <button 
                  onClick={() => setShowChatOnMobile(false)}
                  className="md:hidden p-2 -ml-2 mr-2 hover:bg-glass-input rounded-lg transition-colors cursor-pointer text-fg/50 hover:text-fg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-glass-input border border-glass-border text-fg rounded-xl flex items-center justify-center mr-3 shadow-lg shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="font-black text-fg tracking-tight truncate text-base">{activeConversation.contact.name || 'Anonymous Client'}</h3>
                  <p className="text-[9px] text-fg/30 font-black tracking-widest uppercase truncate mt-0.5">Mobile: {activeConversation.contact.phone_number}</p>
                </div>
              </div>
              
              {selectedMessageIds.size > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-muted">{selectedMessageIds.size} Selected</span>
                  <button 
                    onClick={() => setSelectedMessageIds(new Set())}
                    className="text-xs font-black uppercase text-fg/30 hover:text-fg tracking-wider cursor-pointer"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete selected
                  </button>
                </div>
              )}
            </div>

            {/* Sync Alert Banner */}
            {showSyncNotice && (
              <div className="bg-indigo-500/5 border-b border-indigo-500/10 px-6 py-2.5 flex items-center justify-between animate-in fade-in duration-300">
                 <div className="flex items-center text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                    Updates will sync below in real-time.
                 </div>
                 <button 
                   onClick={() => setShowSyncNotice(false)}
                   className="text-fg/20 hover:text-fg transition-colors cursor-pointer"
                 >
                    <X className="w-3.5 h-3.5" />
                 </button>
              </div>
            )}

            {/* Message Bubble Thread Container */}
            <div 
              onScroll={handleScroll}
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
                  const isOutbound = msg.direction === 'outbound';
                  const isSelected = selectedMessageIds.has(msg.id);
                  return (
                    <div key={msg.id} className={`flex group items-center ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      
                      <div className={`mr-3 transition-all ${selectedMessageIds.size > 0 || isSelected ? 'opacity-100 w-6' : 'opacity-0 w-0 group-hover:opacity-40 group-hover:w-6 overflow-hidden'}`}>
                         <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleMessageSelection(msg.id)}
                          className="h-4 w-4 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
                         />
                      </div>

                      {!isOutbound && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-fg/20 hover:text-red-400 transition-opacity self-center mr-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className={`max-w-[70%] sm:max-w-[60%] rounded-[1.5rem] px-5 py-3.5 shadow-xl relative border ${
                        isOutbound 
                          ? 'bg-fg text-bg border-white rounded-br-sm' 
                          : 'bg-glass-card border-glass-border text-fg rounded-bl-sm'
                      }`}>
                        {msg.media_path && (
                          <div className={`mb-3 p-3 rounded-xl border flex items-center ${
                            isOutbound ? 'bg-black/5 border-black/10' : 'bg-glass-input border-glass-border'
                          }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                              isOutbound ? 'bg-black text-fg' : 'bg-indigo-500/10 text-indigo-400'
                            }`}>
                              {msg.message_type === 'image' && <Image className="w-4 h-4" />}
                              {msg.message_type === 'video' && <Send className="w-4 h-4 rotate-90" />}
                              {msg.message_type === 'document' && <FileText className="w-4 h-4" />}
                              {!['image', 'video', 'document'].includes(msg.message_type) && <Paperclip className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className={`text-[8px] font-black uppercase tracking-widest ${isOutbound ? 'text-black/40' : 'text-fg/30'}`}>{msg.message_type || 'Media file'}</p>
                               <p className={`text-[10px] font-black truncate ${isOutbound ? 'text-black' : 'text-fg'}`}>{msg.media_path.split('/').pop()}</p>
                            </div>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.content || (msg.media_path ? '' : '[Template Message]')}</p>
                        <div className={`flex items-center justify-end mt-2 space-x-1 ${isOutbound ? 'text-black/40' : 'text-fg/30'}`}>
                          <span className="text-[8px] font-black uppercase tracking-wider font-mono">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {isOutbound && (
                            <span className="ml-1 flex items-center">
                              {msg.status === 'pending' && <Clock className="w-3 h-3" />}
                              {msg.status === 'sent' && <Check className="w-3.5 h-3.5" />}
                              {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5" />}
                              {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />}
                              {msg.status === 'failed' && (
                                <div className="relative group/error">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400 cursor-help" />
                                  <div className="absolute bottom-full right-0 mb-3 w-64 bg-glass-card/85 text-fg p-4 rounded-2xl text-[10px] font-black uppercase border border-red-500/20 shadow-2xl opacity-0 group-hover/error:opacity-100 transition-all z-50 pointer-events-none translate-y-2 group-hover/error:translate-y-0">
                                    <div className="flex items-center mb-1.5 border-b border-glass-border pb-1.5 text-red-400">
                                      <AlertCircle className="w-3 h-3 mr-1.5" /> META GATEWAY ERROR
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
                      
                      {isOutbound && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-fg/20 hover:text-red-400 transition-opacity self-center ml-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Panel */}
            <div className="p-6 bg-glass-card/50 border-t border-glass-border">
              {windowError && (
                 <div className="mb-3 py-2 px-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500 gap-4">
                    <div className="flex items-center min-w-0">
                       <AlertCircle className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
                       <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest truncate">24H active window closed. Send template to re-engage.</span>
                    </div>
                    <button 
                      onClick={() => setShowTemplates(true)}
                      className="px-2.5 py-1 bg-amber-500 text-black hover:bg-neutral-100 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all shrink-0"
                    >
                       Choose Template
                    </button>
                 </div>
              )}

              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex flex-col space-y-4">
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
                      onClick={() => setStagedFile(null)}
                      className="w-6 h-6 bg-glass-input hover:bg-red-500/10 text-muted hover:text-red-400 rounded-full flex items-center justify-center transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-3 bg-glass-input p-2 rounded-[2rem] border border-glass-border focus-within:border-glass-border transition-all">
                  <div className="flex">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      className="hidden" 
                      accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    <button
                      type="button"
                      disabled={uploading || windowError}
                      onClick={handleFileSelect}
                      className="flex-shrink-0 h-[52px] w-[52px] rounded-2xl bg-glass-input text-fg/50 flex items-center justify-center transition-all hover:bg-white/10 hover:text-fg disabled:opacity-30 cursor-pointer"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <textarea
                    readOnly={windowError}
                    rows={1}
                    className={`flex-1 bg-transparent border-0 focus:ring-0 resize-none px-4 py-3.5 text-sm font-semibold text-fg placeholder:text-fg/20 focus:outline-none ${windowError ? 'opacity-30 cursor-not-allowed' : ''}`}
                    placeholder={windowError ? "Chat window locked" : "Type your message..."}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
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

            {/* Template Selector Modal */}
            {showTemplates && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="w-full max-w-md bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl p-6 flex flex-col max-h-[80%] animate-in zoom-in-95 duration-300">
                    
                    <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-xl font-black text-fg tracking-tight">Select Template</h3>
                          <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest mt-1">Approved Meta Elements</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Link 
                            href="/templates" 
                            className="flex items-center px-3 py-1.5 bg-fg text-bg hover:opacity-90 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                          </Link>
                          <button 
                            onClick={() => setShowTemplates(false)} 
                            className="w-9 h-9 bg-glass-input border border-glass-border hover:bg-white/10 text-fg rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {selectedTemplate ? (
                          <div className="animate-in slide-in-from-right-4 duration-300 space-y-5">
                             <div className="bg-glass-input border border-glass-border p-4 rounded-2xl">
                                <h4 className="text-[8px] font-black text-fg/30 uppercase tracking-widest mb-1.5">Meta Content Preview</h4>
                                <p className="text-xs text-fg/70 italic leading-relaxed">"{selectedTemplate.content}"</p>
                             </div>
                             
                             <div className="space-y-4">
                                {Array.from({ length: (selectedTemplate.content?.match(/\{\{\d+\}\}/g) || []).length }).map((_, i) => (
                                   <div key={i} className="space-y-2">
                                      <label className="text-[9px] font-black text-fg/30 uppercase tracking-widest ml-1">Variable {i + 1}</label>
                                      <input 
                                        type="text"
                                        placeholder={`Value for {{${i + 1}}}...`}
                                        className="w-full bg-glass-input border border-glass-border rounded-2xl px-4 py-3 text-xs font-semibold focus:border-indigo-500 focus:outline-none transition-all text-fg"
                                        value={templateVars[i+1] || ''}
                                        onChange={(e) => setTemplateVars({...templateVars, [i+1]: e.target.value})}
                                        autoFocus={i === 0}
                                      />
                                   </div>
                                ))}
                             </div>

                             <div className="flex gap-3 pt-4">
                                <button 
                                  onClick={() => {
                                     setSelectedTemplate(null);
                                     setTemplateVars({});
                                  }}
                                  className="flex-1 px-6 py-3.5 border border-glass-border hover:bg-glass-input text-muted hover:text-fg rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer"
                                >
                                   Back
                                </button>
                                <button 
                                  onClick={() => handleSendTemplate(selectedTemplate)}
                                  className="flex-1 px-6 py-3.5 bg-fg text-bg hover:opacity-90 rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-lg"
                                >
                                   Send Now
                                </button>
                             </div>
                          </div>
                        ) : (
                          templates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                              <Zap className="w-8 h-8 text-fg mb-2" />
                              <p className="text-fg font-black text-[9px] uppercase tracking-widest">No templates configured</p>
                            </div>
                          ) : (
                            templates.map(tpl => {
                               const hasVars = tpl.content?.includes('{{1}}');
                               return (
                                <div 
                                  key={tpl.id} 
                                  onClick={() => {
                                    if (hasVars) {
                                      setSelectedTemplate(tpl);
                                      setTemplateVars({});
                                    } else {
                                      handleSendTemplate(tpl);
                                    }
                                  }}
                                  className="p-4 bg-glass-input border border-glass-border rounded-2xl hover:border-glass-border hover:bg-glass-card cursor-pointer group transition-all relative active:scale-[0.98] flex items-center"
                                >
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex items-center">
                                          <h4 className="text-xs font-black text-fg group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate">{tpl.name}</h4>
                                          {hasVars && (
                                             <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[7px] font-black uppercase tracking-widest">Variable</span>
                                          )}
                                        </div>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2 shrink-0">{tpl.language}</span>
                                    </div>
                                    <p className="text-[10px] text-muted leading-snug font-semibold line-clamp-2 italic">
                                      "{tpl.content}"
                                    </p>
                                  </div>
                                  
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                     <div className="w-8 h-8 bg-fg text-bg rounded-full flex items-center justify-center shadow-lg">
                                        {hasVars ? <ArrowRight className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5 ml-0.5" />}
                                     </div>
                                  </div>
                                </div>
                               );
                            })
                          )
                        )}
                    </div>
                  </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-fg/30 space-y-4 opacity-40">
            <div className="w-20 h-20 bg-glass-input rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10" />
            </div>
            <p className="font-black text-xs uppercase tracking-widest">Select a thread to begin chatting</p>
          </div>
        )}
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
