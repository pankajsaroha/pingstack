'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, Check, CheckCheck, MessageCircle, Loader2, AlertCircle, Plus, Trash2, ChevronLeft, Zap, X } from 'lucide-react';
import Link from 'next/link';
import Toast from '@/components/Toast';

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
  const [windowError, setWindowError] = useState<boolean>(false);
  const [showSyncNotice, setShowSyncNotice] = useState(true);

  useEffect(() => {
    fetchStatusAndData();
    fetchTemplates();
    const interval = setInterval(fetchStatusAndData, 5000); // 5s polling as requested
    return () => clearInterval(interval);
  }, []); 

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
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
      setWindowError(false);
      fetchMessages(activeContactId);
      markAsRead(activeContactId);
    }
  }, [activeContactId]);


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
      // 1. Fetch Tenant/Meta Status
      const statusRes = await fetch('/api/tenant/me');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setTenant(statusData);

        // 2. If Active, fetch conversations
        if (statusData.whatsapp_account?.status === 'ACTIVE') {
          const res = await fetch('/api/chat/conversations');
          if (res.ok) {
            const data = await res.json();
            setConversations(data);
            
            // Only auto-select first conversation IF none is already selected AND it's the first load
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
          // Prepend messages
          setMessages(prev => [...data, ...prev]);
          // Maintain scroll position (simple version)
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
    if (!newMessage.trim() || !activeContactId) return;

    const tempMessage = {
      id: 'temp-' + Date.now(),
      content: newMessage,
      direction: 'outbound',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSending(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`/api/chat/${activeContactId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ content: tempMessage.content }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        fetchMessages(activeContactId);
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.error || 'Failed to send message';
        
        if (errorData.code === 'WINDOW_CLOSED' || errorData.code === 'WINDOW_NEVER_OPENED') {
          setWindowError(true);
        }

        setToast({ message: errorMessage, type: 'error' });
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setSending(false);
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
          language: template.language || 'en_US'
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
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // --- RENDERING STATES ---

  if (status === 'NOT_CONNECTED') {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm text-center p-10">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">WhatsApp Not Connected</h2>
        <p className="text-gray-500 mt-2 max-w-sm">Please head over to your dashboard and connect your WhatsApp Business Account via Meta to access your inbox.</p>
        <Link href="/dashboard" className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm text-center p-10">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Syncing with Meta...</h2>
        <p className="text-gray-500 mt-2 max-w-sm">We are finishing the setup for your WhatsApp account. This usually takes less than a minute.</p>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl border border-red-50 shadow-sm text-center p-10">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Connection Error</h2>
        <p className="text-gray-500 mt-2 max-w-sm">There was an issue verifying your Meta credentials. Please try reconnecting from the dashboard.</p>
        <Link href="/dashboard" className="mt-8 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all">
          Retry Setup
        </Link>
      </div>
    );
  }

  // ACTIVE STATE
  const activeConversation = conversations.find(c => c.contact.id === activeContactId);

  return (
    <div className="h-[calc(100vh-6rem)] flex bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden -mx-2 sm:mx-0">
      
      {/* Conversations Sidebar (Master List) */}
      <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-r border-gray-200/60 bg-gray-50/30`}>
        <div className="p-4 border-b border-gray-200/60 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Inbox</h2>
          <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            Live
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-sm text-gray-400 text-center mt-20">
              <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              Your inbox is empty
            </div>
          ) : (
            <div>
              {conversations.map((conv) => {
                const isActive = conv.contact.id === activeContactId;
                return (
                   <div 
                   key={conv.contact.id}
                   onClick={() => {
                      setActiveContactId(conv.contact.id);
                      setShowChatOnMobile(true);
                    }}
                   className={`p-4 border-b border-gray-100 cursor-pointer transition-colors relative ${
                     isActive ? 'bg-white shadow-sm ring-1 ring-black/5 z-10' : 'hover:bg-gray-50'
                   }`}
                 >
                   {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-black" />}
                   <div className="flex justify-between items-start mb-1">
                     <h3 className={`font-bold truncate pr-2 ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                       {conv.contact.name || conv.contact.phone_number}
                     </h3>
                     <span className="text-[10px] text-gray-400 font-bold uppercase">
                        {new Date(conv.latestMessage.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                   </div>
                   <div className="flex justify-between items-end">
                     <p className={`text-sm truncate w-full ${conv.unreadCount > 0 ? 'text-gray-900 font-black' : 'text-gray-500'}`}>
                       {conv.latestMessage.direction === 'outbound' && <span className="mr-1 font-bold text-blue-600">You:</span>}
                       {conv.latestMessage.content || 'System Message'}
                     </p>
                     {conv.unreadCount > 0 && (
                       <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                         <span className="text-[10px] font-bold text-white">{conv.unreadCount}</span>
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

      {/* Chat Area (Detail View) */}
      <div className={`${showChatOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-[#Fefefe] relative`}>
        {activeContactId && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 sm:px-6 border-b border-gray-200/60 flex items-center bg-white/90 backdrop-blur-md z-10 sticky top-0 justify-between">
              <div className="flex items-center min-w-0">
                <button 
                  onClick={() => setShowChatOnMobile(false)}
                  className="md:hidden p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center mr-3 shadow-lg shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="font-black text-gray-900 tracking-tight truncate">{activeConversation.contact.name || 'External Contact'}</h3>
                  <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase truncate">WA: {activeConversation.contact.phone_number}</p>
                </div>
              </div>
              
              {selectedMessageIds.size > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-gray-500">{selectedMessageIds.size} selected</span>
                  <button 
                    onClick={() => setSelectedMessageIds(new Set())}
                    className="text-xs font-bold text-gray-500 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Delete Selected
                  </button>
                </div>
              )}
            </div>

            {/* SYNC NOTICE BANNER */}
            {showSyncNotice && (
              <div className="bg-blue-50/50 border-b border-blue-100/50 px-6 py-2 flex items-center justify-between animate-in fade-in duration-300">
                 <div className="flex items-center text-[10px] font-bold text-blue-600/80 uppercase tracking-tight">
                    <Clock className="w-3 h-3 mr-2 opacity-70" />
                    Sent messages may take a moment to appear. Please refresh if needed.
                 </div>
                 <div className="flex items-center space-x-4">
                    <div className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">
                       Fixing Syncing Soon • Apologies
                    </div>
                    <button 
                      onClick={() => setShowSyncNotice(false)}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                    >
                       <X className="w-3 h-3" />
                    </button>
                 </div>
              </div>
            )}

            {/* Messages Area */}
            <div 
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5 relative"
            >
              {loadingMore && (
                <div className="flex justify-center p-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Conversation initialized
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  const isSelected = selectedMessageIds.has(msg.id);
                  return (
                    <div key={msg.id} className={`flex group items-center ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      {/* Selection Checkbox */}
                      <div className={`mr-2 transition-all ${selectedMessageIds.size > 0 || isSelected ? 'opacity-100 w-6' : 'opacity-0 w-0 group-hover:opacity-40 group-hover:w-6 overflow-hidden'}`}>
                         <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleMessageSelection(msg.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                         />
                      </div>

                      {!isOutbound && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-opacity self-center mr-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className={`max-w-[70%] sm:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm relative ${
                        isOutbound 
                          ? 'bg-gray-900 text-white rounded-br-sm' 
                          : 'bg-white border border-gray-200/60 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content || '[Template Message]'}</p>
                        <div className={`flex items-center justify-end mt-2 space-x-1 ${isOutbound ? 'text-gray-400' : 'text-gray-400'}`}>
                          <span className="text-[9px] font-bold uppercase">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {isOutbound && (
                            <span className="ml-1 flex items-center">
                              {msg.status === 'pending' && <Clock className="w-3 h-3 text-gray-400" />}
                              {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-gray-400" />}
                              {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-gray-400" />}
                              {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-blue-400" />}
                              {msg.status === 'failed' && (
                                <div className="relative group/error">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500 cursor-help" />
                                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-red-600 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight shadow-xl opacity-0 group-hover/error:opacity-100 transition-all z-50 pointer-events-none translate-y-2 group-hover/error:translate-y-0">
                                    <div className="flex items-center mb-1.5 border-b border-white/20 pb-1.5">
                                      <AlertCircle className="w-3 h-3 mr-1.5" /> Meta Rejection Reason
                                    </div>
                                    <div className="leading-relaxed opacity-90 font-bold">
                                      {msg.error || 'Unknown Meta API error. Please check logs.'}
                                    </div>
                                    <div className="mt-2 text-[8px] opacity-60">
                                      Tip: Marketing frequency caps (131049) reset every 24 hours.
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
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-opacity self-center ml-1"
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

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-200/60">
              {windowError && (
                 <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center">
                       <AlertCircle className="w-4 h-4 text-amber-600 mr-3" />
                       <div className="text-xs font-bold text-amber-800">24-Hour window closed. Send a template to re-open.</div>
                    </div>
                    <button 
                      onClick={() => setShowTemplates(true)}
                      className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition-all"
                    >
                       Choose Template
                    </button>
                 </div>
              )}

              <form onSubmit={handleSendMessage} className="flex space-x-3 items-end">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black transition-all shadow-inner">
                  <textarea
                    readOnly={windowError}
                    rows={1}
                    className={`w-full max-h-32 bg-transparent border-0 focus:ring-0 resize-none px-4 py-3.5 text-[15px] font-medium ${windowError ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={windowError ? "Chat window closed" : "Write a message..."}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={`flex-shrink-0 h-[52px] w-[52px] rounded-2xl flex items-center justify-center transition-all active:scale-90 ${showTemplates ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <Zap className={`w-5 h-5 ${showTemplates ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || windowError}
                    className="flex-shrink-0 h-[52px] w-[52px] bg-blue-600 hover:bg-black text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </div>
              </form>
            </div>

            {/* Template Selector Overlay - COMPACT MODAL */}
            {showTemplates && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 flex flex-col max-h-[70%] animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Select Template</h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Quick Send</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTemplates(false);
                          }} 
                          className="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
                        {templates.length === 0 ? (
                          <div className="text-center py-12 text-gray-400 text-sm">No active templates found.</div>
                        ) : (
                          templates.map(tpl => (
                              <div 
                                key={tpl.id} 
                                onClick={() => handleSendTemplate(tpl)}
                                className="p-4 border border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer group transition-all"
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 truncate mr-2">{tpl.name}</h4>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">{tpl.language}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 italic leading-relaxed">"{tpl.content}"</p>
                              </div>
                          ))
                        )}
                    </div>
                  </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
              <MessageCircle className="w-10 h-10 text-gray-200" />
            </div>
            <p className="font-bold text-gray-300">Select a thread to begin chatting</p>
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

