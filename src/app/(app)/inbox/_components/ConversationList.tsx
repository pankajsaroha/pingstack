'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, Trash2, AlertTriangle, X } from 'lucide-react';
import VirtualList from '@/components/VirtualList';
import ContactAvatar from '@/components/ContactAvatar';

interface ConversationListProps {
  conversations: any[];
  allContacts: any[];
  activeContactId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectContact: (contactId: string) => void;
  onDeleteConversation?: (contactId: string) => void;
}

type ListElement =
  | { type: 'conversation'; key: string; data: any }
  | { type: 'header'; key: string; label: string }
  | { type: 'contact'; key: string; data: any };

export default function ConversationList({
  conversations,
  allContacts,
  activeContactId,
  searchQuery,
  onSearchChange,
  onSelectContact,
  onDeleteConversation,
}: ConversationListProps) {
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<{ id: string; name: string; phone: string } | null>(null);

  // Long-press detection for conversations
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const handleTouchStart = (contact: { id: string; name: string; phone: string }, e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isLongPressRef.current = false;

      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      touchTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(40); } catch (_) {}
        }
        setDeleteConfirmContact(contact);
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !touchTimerRef.current) return;
    if (e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        // Scrolling conversation list — cancel long press
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPos.current = null;
  };

  const handleConversationClick = (contactId: string) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    onSelectContact(contactId);
  };

  const { listItems, itemHeights, filteredConversationsCount, matchingNewContactsCount } = useMemo(() => {
    const conversationsContactIds = new Set(conversations.map((c) => c.contact.id));

    const filteredConversations = conversations.filter((conv) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const name = (conv.contact.name || '').toLowerCase();
      const phone = (conv.contact.phone_number || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });

    const matchingNewContacts = searchQuery.trim()
      ? allContacts.filter((contact) => {
          const query = searchQuery.toLowerCase().trim();
          const name = (contact.name || '').toLowerCase();
          const phone = (contact.phone_number || '').toLowerCase();
          return (
            (name.includes(query) || phone.includes(query)) &&
            !conversationsContactIds.has(contact.id)
          );
        })
      : [];

    // Build the flat items list
    const listItems: ListElement[] = [];

    filteredConversations.forEach((conv) => {
      listItems.push({
        type: 'conversation',
        key: `conv-${conv.contact.id}`,
        data: conv,
      });
    });

    if (matchingNewContacts.length > 0) {
      listItems.push({
        type: 'header',
        key: 'header-new-contacts',
        label: 'Contacts (No History)',
      });
      matchingNewContacts.forEach((contact) => {
        listItems.push({
          type: 'contact',
          key: `contact-${contact.id}`,
          data: contact,
        });
      });
    }

    // Pre-calculate heights
    const itemHeights = listItems.map((item) => {
      if (item.type === 'conversation') return 82;
      if (item.type === 'header') return 37;
      return 72;
    });

    return {
      listItems,
      itemHeights,
      filteredConversationsCount: filteredConversations.length,
      matchingNewContactsCount: matchingNewContacts.length
    };
  }, [conversations, allContacts, searchQuery]);

  const renderListElement = (item: ListElement) => {
    if (item.type === 'conversation') {
      const conv = item.data;
      const isActive = conv.contact.id === activeContactId;
      const contactInfo = {
        id: conv.contact.id,
        name: conv.contact.name || conv.contact.phone_number,
        phone: conv.contact.phone_number
      };

      return (
        <div
          key={item.key}
          onClick={() => handleConversationClick(conv.contact.id)}
          onTouchStart={(e) => handleTouchStart(contactInfo, e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            setDeleteConfirmContact(contactInfo);
          }}
          className={`group px-3.5 py-3 cursor-pointer transition-colors relative border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3 select-none ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 border-l-3 border-l-indigo-600 dark:border-l-indigo-500'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }`}
          style={{ height: 82 }}
        >
          <ContactAvatar
            name={conv.contact.name}
            phone={conv.contact.phone_number}
            avatarUrl={conv.contact.avatar_url}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start mb-1">
              <h3
                className={`font-semibold text-xs truncate pr-2 ${
                  isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-800 dark:text-zinc-200'
                }`}
              >
                {conv.contact.name || conv.contact.phone_number}
              </h3>
              <span
                className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0"
                suppressHydrationWarning
              >
                {new Date(conv.latestMessage.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <p
                className={`text-xs truncate w-full ${
                  conv.unreadCount > 0
                    ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {conv.latestMessage.direction === 'outbound' && (
                  <span className="mr-1 font-semibold text-indigo-600 dark:text-indigo-400">You:</span>
                )}
                {conv.latestMessage.content === '[UNSUPPORTED]'
                  ? 'Unsupported format'
                  : (conv.latestMessage.content || 'Attachment File')}
              </p>
              {conv.unreadCount > 0 && (
                <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2 shadow-2xs">
                  <span className="text-[9px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop delete chat button on hover */}
          {onDeleteConversation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmContact(contactInfo);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer hidden sm:block shrink-0"
              title="Delete chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    if (item.type === 'header') {
      return (
        <div
          key={item.key}
          className="bg-zinc-100/80 dark:bg-zinc-800/80 px-4 py-2 border-y border-zinc-200 dark:border-zinc-800 backdrop-blur-sm sticky top-0 z-10 text-left"
          style={{ height: 37 }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {item.label}
          </span>
        </div>
      );
    }

    if (item.type === 'contact') {
      const contact = item.data;
      const isActive = contact.id === activeContactId;
      return (
        <div
          key={item.key}
          onClick={() => onSelectContact(contact.id)}
          className={`px-3.5 py-3 cursor-pointer transition-colors relative border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3 ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 border-l-3 border-l-indigo-600 dark:border-l-indigo-500'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }`}
          style={{ height: 72 }}
        >
          <ContactAvatar
            name={contact.name}
            phone={contact.phone_number}
            avatarUrl={contact.avatar_url}
            size="md"
          />
          <div className="min-w-0 flex-1 pr-2">
            <h3
              className={`font-semibold text-xs truncate ${
                isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {contact.name || contact.phone_number}
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">
              {contact.phone_number}
            </p>
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-md shrink-0 ${
              isActive
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Start Chat
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 overflow-hidden relative">
      {conversations.length === 0 && allContacts.length === 0 ? (
        <div className="p-8 text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-center mt-16">
          <MessageCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          Inbox is empty
        </div>
      ) : searchQuery &&
        filteredConversationsCount === 0 &&
        matchingNewContactsCount === 0 ? (
        <div className="p-8 text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-center mt-12">
          No matching chats or contacts
        </div>
      ) : (
        <VirtualList
          items={listItems}
          itemHeights={itemHeights}
          renderItem={(item) => renderListElement(item)}
          className="custom-scrollbar"
        />
      )}

      {/* Delete Chat Confirmation Modal */}
      {deleteConfirmContact && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmContact(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Delete Chat?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Are you sure you want to delete all conversation history with <strong className="text-zinc-800 dark:text-zinc-200">{deleteConfirmContact.name}</strong>? This will remove these messages from Pingstack.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmContact(null)}
                className="flex-1 py-2.5 px-4 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = deleteConfirmContact.id;
                  setDeleteConfirmContact(null);
                  onDeleteConversation?.(id);
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

