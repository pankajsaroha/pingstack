'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Trash2, AlertTriangle, X, ChevronDown, Check, Users } from 'lucide-react';
import VirtualList from '@/components/VirtualList';
import ContactAvatar from '@/components/ContactAvatar';

interface ConversationListProps {
  conversations: any[];
  allContacts: any[];
  activeContactId: string | null;
  searchQuery: string;
  teams?: any[];
  members?: any[];
  activeFilter?: 'all' | 'mine' | 'unassigned' | 'team';
  onFilterChange?: (filter: 'all' | 'mine' | 'unassigned' | 'team') => void;
  activeTeamId?: string | null;
  onTeamFilterChange?: (teamId: string | null) => void;
  currentUserId?: string;
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
  teams = [],
  members = [],
  activeFilter = 'all',
  onFilterChange,
  activeTeamId,
  onTeamFilterChange,
  currentUserId,
  onSearchChange,
  onSelectContact,
  onDeleteConversation,
}: ConversationListProps) {
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const teamButtonRef = useRef<HTMLButtonElement>(null);
  const teamPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (!teamButtonRef.current) return;
    const rect = teamButtonRef.current.getBoundingClientRect();
    const popoverWidth = 224; // 14rem / 224px (w-56)
    const popoverEstimatedHeight = 260;

    // Position below button if space allows, otherwise above
    let top = rect.bottom + 4;
    if (top + popoverEstimatedHeight > window.innerHeight && rect.top > popoverEstimatedHeight) {
      top = Math.max(8, rect.top - popoverEstimatedHeight - 4);
    }

    // Align with button left, but keep fully within viewport boundaries
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popoverWidth - 8);
    }
    if (left < 8) {
      left = 8;
    }

    setDropdownPos({ top, left });
  }, []);

  useEffect(() => {
    if (!teamDropdownOpen) return;

    updateDropdownPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (teamButtonRef.current && teamButtonRef.current.contains(target)) {
        return;
      }
      if (teamPopoverRef.current && teamPopoverRef.current.contains(target)) {
        return;
      }
      setTeamDropdownOpen(false);
      setTeamSearchQuery('');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTeamDropdownOpen(false);
        setTeamSearchQuery('');
      }
    };

    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [teamDropdownOpen, updateDropdownPosition]);

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

    // 1. Filter by Team / Assignment Tab
    let assignmentFiltered = conversations;
    if (activeFilter === 'mine' && currentUserId) {
      assignmentFiltered = conversations.filter(c => c.assignment?.assigned_user_id === currentUserId);
    } else if (activeFilter === 'unassigned') {
      assignmentFiltered = conversations.filter(c => !c.assignment?.assigned_user_id && !c.assignment?.team_id);
    } else if (activeFilter === 'team' && activeTeamId) {
      assignmentFiltered = conversations.filter(c => c.assignment?.team_id === activeTeamId);
    }

    // 2. Search query filter
    const filteredConversations = assignmentFiltered.filter((conv) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const name = (conv.contact.name || '').toLowerCase();
      const phone = (conv.contact.phone_number || '').toLowerCase();
      const teamName = (conv.assignment?.team?.name || '').toLowerCase();
      const agentName = (conv.assignment?.assigned_user?.name || '').toLowerCase();
      return name.includes(query) || phone.includes(query) || teamName.includes(query) || agentName.includes(query);
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

    // Pre-calculate heights (slightly larger if assignment chip present)
    const itemHeights = listItems.map((item) => {
      if (item.type === 'conversation') {
        const aTeam = teams.find(t => t.id === item.data?.assignment?.team_id) || item.data?.assignment?.team;
        const aUser = members.find(m => m.id === item.data?.assignment?.assigned_user_id) || item.data?.assignment?.assigned_user;
        return aTeam || aUser ? 92 : 82;
      }
      if (item.type === 'header') return 37;
      return 72;
    });

    return {
      listItems,
      itemHeights,
      filteredConversationsCount: filteredConversations.length,
      matchingNewContactsCount: matchingNewContacts.length
    };
  }, [conversations, allContacts, searchQuery, activeFilter, activeTeamId, currentUserId]);

  const renderListElement = (item: ListElement) => {
    if (item.type === 'conversation') {
      const conv = item.data;
      const isActive = conv.contact.id === activeContactId;
      const contactInfo = {
        id: conv.contact.id,
        name: conv.contact.name || conv.contact.phone_number,
        phone: conv.contact.phone_number
      };

      const assignedTeam = teams.find(t => t.id === conv.assignment?.team_id) || conv.assignment?.team;
      const assignedUser = members.find(m => m.id === conv.assignment?.assigned_user_id) || conv.assignment?.assigned_user;
      const hasAssignment = Boolean(assignedTeam || assignedUser);

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
          className={`group px-3.5 py-2.5 cursor-pointer transition-colors relative border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3 select-none ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 border-l-3 border-l-indigo-600 dark:border-l-indigo-500'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }`}
          style={{ height: hasAssignment ? 92 : 82 }}
        >
          <ContactAvatar
            name={conv.contact.name}
            phone={conv.contact.phone_number}
            avatarUrl={conv.contact.avatar_url}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start mb-0.5">
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

            {/* Assignment Tags Chip (if assigned to a team or member) */}
            {hasAssignment && (
              <div className="flex items-center gap-1.5 my-0.5">
                {assignedTeam && (
                  <span 
                    className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded-md uppercase tracking-wider"
                    style={{
                      backgroundColor: `${assignedTeam.color || '#4F46E5'}15`,
                      color: assignedTeam.color || '#4F46E5',
                      border: `1px solid ${assignedTeam.color || '#4F46E5'}30`
                    }}
                  >
                    <span className="w-1 h-1 rounded-full" style={{ backgroundColor: assignedTeam.color || '#4F46E5' }} />
                    {assignedTeam.name}
                  </span>
                )}
                {assignedUser && (
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    👤 {assignedUser.name}
                  </span>
                )}
              </div>
            )}

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

  const hasMultipleMembers = members.length > 1;
  const hasTeams = teams.length > 0;
  const showFilterTabs = hasMultipleMembers || hasTeams;

  const countAll = conversations.length;
  const countMine = currentUserId ? conversations.filter(c => c.assignment?.assigned_user_id === currentUserId).length : 0;
  const countUnassigned = conversations.filter(c => !c.assignment?.assigned_user_id && !c.assignment?.team_id).length;
  const teamCounts = useMemo(() => {
    const map = new Map<string, number>();
    teams.forEach(t => {
      map.set(t.id, conversations.filter(c => c.assignment?.team_id === t.id).length);
    });
    return map;
  }, [teams, conversations]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Team / Assignment Filter Tabs (Progressive Disclosure) */}
      {showFilterTabs && (
        <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => {
              onFilterChange?.('all');
              onTeamFilterChange?.(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            All ({countAll})
          </button>
          
          {hasMultipleMembers && (
            <button
              onClick={() => {
                onFilterChange?.('mine');
                onTeamFilterChange?.(null);
              }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'mine'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              Assigned to Me ({countMine})
            </button>
          )}

          <button
            onClick={() => {
              onFilterChange?.('unassigned');
              onTeamFilterChange?.(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'unassigned'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            Unassigned ({countUnassigned})
          </button>

          {hasTeams && (
            <button
              ref={teamButtonRef}
              type="button"
              onClick={() => {
                if (!teamDropdownOpen) {
                  updateDropdownPosition();
                }
                setTeamDropdownOpen(v => !v);
                if (teamDropdownOpen) setTeamSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeFilter === 'team' && activeTeamId
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              {activeFilter === 'team' && activeTeamId ? (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: teams.find(t => t.id === activeTeamId)?.color || '#4F46E5',
                    }}
                  />
                  <span className="truncate max-w-[120px]">
                    Team: {teams.find(t => t.id === activeTeamId)?.name || 'Team'}
                  </span>
                </>
              ) : (
                <span>Team: All</span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${teamDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Floating Team Selector Popover via Portal */}
      {mounted && teamDropdownOpen && createPortal(
        <div
          ref={teamPopoverRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
          }}
          className="w-56 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            Filter by Team
          </div>

          {teams.length >= 5 && (
            <div className="px-2 py-1">
              <input
                type="text"
                value={teamSearchQuery}
                onChange={e => setTeamSearchQuery(e.target.value)}
                placeholder="Search teams..."
                className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                autoFocus
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onFilterChange?.('all');
              onTeamFilterChange?.(null);
              setTeamDropdownOpen(false);
              setTeamSearchQuery('');
            }}
            className={`w-full px-3 py-1.5 flex items-center justify-between text-left text-xs font-semibold cursor-pointer transition-colors ${
              activeFilter !== 'team' || !activeTeamId
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <span>All Teams ({countAll})</span>
            {(activeFilter !== 'team' || !activeTeamId) && (
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800/80" />

          <div className="max-h-52 overflow-y-auto custom-scrollbar">
            {teams
              .filter(t => !teamSearchQuery || t.name.toLowerCase().includes(teamSearchQuery.toLowerCase().trim()))
              .map(team => {
                const tCount = teamCounts.get(team.id) || 0;
                const isSelected = activeFilter === 'team' && activeTeamId === team.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onFilterChange?.('team');
                      onTeamFilterChange?.(team.id);
                      setTeamDropdownOpen(false);
                      setTeamSearchQuery('');
                    }}
                    className={`w-full px-3 py-1.5 flex items-center justify-between text-left text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: team.color || '#4F46E5' }} />
                      <span className="truncate">{team.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400">({tCount})</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </button>
                );
              })}
            {teams.filter(t => !teamSearchQuery || t.name.toLowerCase().includes(teamSearchQuery.toLowerCase().trim())).length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-400 text-center">
                No matching teams
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
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

