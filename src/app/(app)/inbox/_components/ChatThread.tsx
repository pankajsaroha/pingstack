'use client';

import { Fragment, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Loader2, MessageCircle, Trash2, ChevronLeft } from 'lucide-react';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import ChatComposer from './ChatComposer';
import TemplateSelector from './TemplateSelector';
import { formatSeparatorDate } from './utils';

interface ChatThreadProps {
  activeConversation: any | null;
  messages: any[];
  loadingMore: boolean;
  hasMore: boolean;
  sending: boolean;
  uploading: boolean;
  windowError: boolean;
  newMessage: string;
  stagedFile: File | null;
  showTemplates: boolean;
  templates: any[];
  tenant: any;
  selectedMessageIds: Set<string>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onMessageChange: (msg: string) => void;
  onSend: (e: React.FormEvent) => void;
  onSendTemplate: (template: any, vars: Record<string, string>) => void;
  onFileSelect: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onToggleTemplates: () => void;
  onCloseTemplates: () => void;
  onToggleMessageSelect: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onBackMobile: () => void;
}

// Measured element component that updates height maps
function MeasuredItem({
  id,
  children,
  onMeasure,
}: {
  id: string;
  children: React.ReactNode;
  onMeasure: (id: string, height: number) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onMeasure(id, entry.contentRect.height);
      }
    });
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [id, onMeasure]);

  return <div ref={elementRef}>{children}</div>;
}

export default function ChatThread({
  activeConversation,
  messages,
  loadingMore,
  sending,
  uploading,
  windowError,
  newMessage,
  stagedFile,
  showTemplates,
  templates,
  tenant,
  selectedMessageIds,
  messagesEndRef,
  chatContainerRef,
  fileInputRef,
  onScroll,
  onMessageChange,
  onSend,
  onSendTemplate,
  onFileSelect,
  onFileChange,
  onClearFile,
  onToggleTemplates,
  onCloseTemplates,
  onToggleMessageSelect,
  onDeleteMessage,
  onBulkDelete,
  onClearSelection,
  onBackMobile,
}: ChatThreadProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const measuredHeightsRef = useRef<Record<string, number>>({});
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Reset measurements when shifting conversations to avoid stale coordinates
  useEffect(() => {
    measuredHeightsRef.current = {};
    setRenderTrigger(0);
    setScrollTop(0);
    if (chatContainerRef?.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  }, [activeConversation?.contact?.id, chatContainerRef]);

  // Track container height changes
  useEffect(() => {
    if (!chatContainerRef || !chatContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(chatContainerRef.current);
    return () => observer.disconnect();
  }, [chatContainerRef]);

  const onMeasure = useCallback((id: string, height: number) => {
    if (measuredHeightsRef.current[id] === height) return;
    measuredHeightsRef.current[id] = height;
    setRenderTrigger((v) => v + 1);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    onScroll(e);
  };



  // Build flat items list: separating message bubbles and date headers
  const { listItems, cumulativeHeights, dateHeaders, totalHeight } = useMemo(() => {
    const listItems: { type: 'message' | 'date'; id: string; data: any }[] = [];
    let lastDateString = '';
    messages.forEach((msg) => {
      const msgDateString = new Date(msg.created_at).toDateString();
      if (msgDateString !== lastDateString) {
        listItems.push({
          type: 'date',
          id: `date-${msgDateString}`,
          data: msg.created_at,
        });
        lastDateString = msgDateString;
      }
      listItems.push({ type: 'message', id: msg.id, data: msg });
    });

    // Calculate cumulative heights and offsets
    const cumulativeHeights: number[] = [];
    let currentSum = 0;
    const dateHeaders: { id: string; dateString: string; offset: number; height: number }[] = [];

    for (let i = 0; i < listItems.length; i++) {
      cumulativeHeights.push(currentSum);
      const item = listItems[i];
      const itemHeight =
        measuredHeightsRef.current[item.id] || (item.type === 'date' ? 44 : 110);
        
      if (item.type === 'date') {
        dateHeaders.push({
          id: item.id,
          dateString: item.data,
          offset: currentSum,
          height: itemHeight
        });
      }
      currentSum += itemHeight;
    }
    return { listItems, cumulativeHeights, dateHeaders, totalHeight: currentSum };
  }, [messages, renderTrigger]);

  if (!activeConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 space-y-3">
        <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-zinc-400" />
        </div>
        <p className="font-bold text-xs uppercase tracking-wider">Select a conversation to begin chatting</p>
      </div>
    );
  }

  // Determine active sticky date header based on scrollTop
  let activeDateHeader: typeof dateHeaders[0] | null = null;
  let pushY = 0;

  for (let i = 0; i < dateHeaders.length; i++) {
    const header = dateHeaders[i];
    if (header.offset <= scrollTop + 8) {
      activeDateHeader = header;
      
      const nextHeader = dateHeaders[i + 1];
      if (nextHeader) {
        const distance = nextHeader.offset - (scrollTop + 8);
        if (distance < 44) {
          pushY = 44 - distance;
        }
      }
    }
  }

  // Determine viewport slice
  let startIndex = 0;
  while (
    startIndex < cumulativeHeights.length - 1 &&
    cumulativeHeights[startIndex + 1] < scrollTop
  ) {
    startIndex++;
  }
  startIndex = Math.max(0, startIndex - 5); // Buffer of 5 items above

  let endIndex = startIndex;
  const viewportBottom = scrollTop + containerHeight;
  while (
    endIndex < cumulativeHeights.length &&
    cumulativeHeights[endIndex] < viewportBottom
  ) {
    endIndex++;
  }
  endIndex = Math.min(cumulativeHeights.length, endIndex + 5); // Buffer of 5 items below

  const visibleItems = listItems.slice(startIndex, endIndex);

  return (
    <>
      {/* Header */}
      <div className="h-14 sm:h-16 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md z-10 sticky top-0 justify-between">
        <div className="flex items-center min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1.5 mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center justify-center mr-3 shadow-2xs shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate text-xs sm:text-sm">
              {activeConversation.contact.name || 'Anonymous Client'}
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">
              {activeConversation.contact.phone_number}
            </p>
          </div>
        </div>

        {/* Bulk-delete toolbar */}
        {selectedMessageIds.size > 0 && (
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{selectedMessageIds.size} Selected</span>
            <button
              onClick={onClearSelection}
              className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 tracking-wider cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={onBulkDelete}
              className="flex items-center px-3 py-1.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Delete selected</span>
              <span className="sm:hidden">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages scroll area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 relative custom-scrollbar bg-transparent overflow-x-hidden"
      >
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        )}

        {/* Floating Sticky Date Separator */}
        {activeDateHeader && (
          <div
            style={{
              position: 'sticky',
              top: '8px',
              zIndex: 30,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'center',
              height: 0,
              overflow: 'visible',
              transform: `translateY(${-pushY}px)`
            }}
          >
            <span className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 px-3 py-1 rounded-full text-[10px] font-mono text-zinc-600 dark:text-zinc-300 shadow-2xs">
              {formatSeparatorDate(activeDateHeader.dateString)}
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-widest">
            Session initialized
          </div>
        ) : (
          <div
            style={{
              height: totalHeight,
              width: '100%',
              position: 'relative',
            }}
          >
            {visibleItems.map((item: any, index: number) => {
              const idx = startIndex + index;
              const topOffset = cumulativeHeights[idx] || 0;

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: topOffset,
                  }}
                >
                  <MeasuredItem id={item.id} onMeasure={onMeasure}>
                    {item.type === 'date' ? (
                      <DateSeparator dateString={item.data} />
                    ) : (
                      <MessageBubble
                        msg={item.data}
                        isSelected={selectedMessageIds.has(item.id)}
                        selectionActive={selectedMessageIds.size > 0}
                        onToggleSelect={onToggleMessageSelect}
                        onDelete={onDeleteMessage}
                      />
                    )}
                  </MeasuredItem>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>

      {/* Composer */}
      <ChatComposer
        tenant={tenant}
        windowError={windowError}
        sending={sending}
        uploading={uploading}
        newMessage={newMessage}
        stagedFile={stagedFile}
        showTemplates={showTemplates}
        onMessageChange={onMessageChange}
        onSend={onSend}
        onFileSelect={onFileSelect}
        onFileChange={onFileChange}
        onClearFile={onClearFile}
        onToggleTemplates={onToggleTemplates}
        fileInputRef={fileInputRef}
      />

      {/* Template overlay */}
      {showTemplates && (
        <TemplateSelector
          templates={templates}
          sending={sending}
          onSend={onSendTemplate}
          onClose={onCloseTemplates}
        />
      )}
    </>
  );
}
