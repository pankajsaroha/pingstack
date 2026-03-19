'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, CheckCircle2, MessageCircle, Loader2, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

export default function Inbox() {
  const [tenant, setTenant] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatusAndData();
    const interval = setInterval(fetchStatusAndData, 5000); // 5s polling as requested
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeContactId) {
      fetchMessages(activeContactId);
    }
  }, [activeContactId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
            if (!activeContactId && data.length > 0) {
              setActiveContactId(data[0].contact.id);
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

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await fetch(`/api/chat/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
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

    try {
      const res = await fetch(`/api/chat/${activeContactId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tempMessage.content })
      });
      if (res.ok) {
        fetchMessages(activeContactId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
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
      
      {/* Conversations Sidebar */}
      <div className="w-1/3 flex flex-col border-r border-gray-200/60 bg-gray-50/30">
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
                   onClick={() => setActiveContactId(conv.contact.id)}
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#Fefefe] relative">
        {activeContactId && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-gray-200/60 flex items-center bg-white/90 backdrop-blur-md z-10 sticky top-0 justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 tracking-tight">{activeConversation.contact.name || 'External Contact'}</h3>
                  <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">WhatsApp ID: {activeConversation.contact.phone_number}</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Conversation initialized
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] sm:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm relative ${
                        isOutbound 
                          ? 'bg-gray-900 text-white rounded-br-sm' 
                          : 'bg-white border border-gray-200/60 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content || '[Media Message]'}</p>
                        <div className={`flex items-center justify-end mt-2 space-x-1 ${isOutbound ? 'text-gray-400' : 'text-gray-400'}`}>
                          <span className="text-[9px] font-bold uppercase">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {isOutbound && (
                            <span className="ml-1 flex items-center scale-75 origin-right">
                              {msg.status === 'pending' && <Clock className="w-3 h-3" />}
                              {msg.status === 'sent' && <CheckCircle2 className="w-3 h-3 text-gray-400" />}
                              {(msg.status === 'delivered' || msg.status === 'read') && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-200/60">
              <form onSubmit={handleSendMessage} className="flex space-x-3 items-end">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black transition-all shadow-inner">
                  <textarea
                    rows={1}
                    className="w-full max-h-32 bg-transparent border-0 focus:ring-0 resize-none px-4 py-3.5 text-[15px] font-medium"
                    placeholder="Write a message..."
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
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="flex-shrink-0 h-[52px] w-[52px] bg-blue-600 hover:bg-black text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-50"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
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
    </div>
  );
}

