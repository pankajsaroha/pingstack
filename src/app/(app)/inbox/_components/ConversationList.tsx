'use client';

import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import VirtualList from '@/components/VirtualList';

interface ConversationListProps {
  conversations: any[];
  allContacts: any[];
  activeContactId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectContact: (contactId: string) => void;
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
}: ConversationListProps) {
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
      return (
        <div
          key={item.key}
          onClick={() => onSelectContact(conv.contact.id)}
          className={`px-4 py-3 cursor-pointer transition-colors relative border-b border-zinc-100 dark:border-zinc-800/60 ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 border-l-3 border-l-indigo-600 dark:border-l-indigo-500'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }`}
          style={{ height: 82 }}
        >
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
              {conv.latestMessage.content || 'Attachment File'}
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
          className={`px-4 py-3 cursor-pointer transition-colors relative border-b border-zinc-100 dark:border-zinc-800/60 ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 border-l-3 border-l-indigo-600 dark:border-l-indigo-500'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }`}
          style={{ height: 72 }}
        >
          <div className="flex justify-between items-center">
            <div className="min-w-0 flex-1 pr-3">
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
    </div>
  );
}
