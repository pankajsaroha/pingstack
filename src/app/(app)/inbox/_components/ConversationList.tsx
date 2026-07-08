'use client';

import { MessageCircle, Search, X } from 'lucide-react';

interface ConversationListProps {
  conversations: any[];
  allContacts: any[];
  activeContactId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectContact: (contactId: string) => void;
}

export default function ConversationList({
  conversations,
  allContacts,
  activeContactId,
  searchQuery,
  onSearchChange,
  onSelectContact,
}: ConversationListProps) {

  const conversationsContactIds = new Set(conversations.map(c => c.contact.id));

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = (conv.contact.name || '').toLowerCase();
    const phone = (conv.contact.phone_number || '').toLowerCase();
    return name.includes(query) || phone.includes(query);
  });

  const matchingNewContacts = searchQuery.trim()
    ? allContacts.filter(contact => {
        const query = searchQuery.toLowerCase().trim();
        const name = (contact.name || '').toLowerCase();
        const phone = (contact.phone_number || '').toLowerCase();
        return (name.includes(query) || phone.includes(query)) && !conversationsContactIds.has(contact.id);
      })
    : [];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {conversations.length === 0 && allContacts.length === 0 ? (
        <div className="p-8 text-xs text-fg/30 font-black uppercase tracking-widest text-center mt-20">
          <MessageCircle className="w-12 h-12 text-fg/10 mx-auto mb-4" />
          Inbox is empty
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {/* Conversations with history */}
          {filteredConversations.map((conv) => {
            const isActive = conv.contact.id === activeContactId;
            return (
              <div
                key={conv.contact.id}
                onClick={() => onSelectContact(conv.contact.id)}
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
                    {new Date(conv.latestMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <p className={`text-xs truncate w-full ${
                    conv.unreadCount > 0
                      ? (isActive ? 'text-bg font-black' : 'text-fg font-black')
                      : (isActive ? 'text-bg/70' : 'text-muted')
                  }`}>
                    {conv.latestMessage.direction === 'outbound' && (
                      <span className="mr-1 font-black text-indigo-400">You:</span>
                    )}
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

          {/* Matching contacts with no message history */}
          {matchingNewContacts.length > 0 && (
            <>
              <div className="bg-glass-input/50 px-5 py-3 border-y border-glass-border sticky top-0 z-10 backdrop-blur-sm">
                <span className="text-[9px] font-black uppercase tracking-widest text-fg/30">Contacts (No History)</span>
              </div>
              {matchingNewContacts.map((contact) => {
                const isActive = contact.id === activeContactId;
                return (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact.id)}
                    className={`p-5 cursor-pointer transition-all relative ${
                      isActive ? 'bg-fg text-bg shadow-lg z-10 scale-[1.01]' : 'hover:bg-glass-card'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                    <div className="flex justify-between items-center">
                      <div className="min-w-0 flex-1 pr-4">
                        <h3 className={`font-black text-sm truncate ${isActive ? 'text-bg' : 'text-fg'}`}>
                          {contact.name || contact.phone_number}
                        </h3>
                        <p className={`text-[9px] font-black uppercase tracking-widest truncate mt-0.5 ${isActive ? 'text-bg/60' : 'text-fg/30'}`}>
                          {contact.phone_number}
                        </p>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-md shrink-0 ${
                        isActive
                          ? 'bg-bg/10 border-bg/20 text-bg'
                          : 'bg-glass-input border-glass-border text-fg/40'
                      }`}>
                        Start Chat
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* No-results */}
          {searchQuery && filteredConversations.length === 0 && matchingNewContacts.length === 0 && (
            <div className="p-8 text-xs text-fg/30 font-black uppercase tracking-widest text-center mt-12">
              No matching chats or contacts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
