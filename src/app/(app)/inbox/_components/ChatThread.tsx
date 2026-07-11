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
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  // Reset measurements when shifting conversations to avoid stale coordinates
  useEffect(() => {
    setMeasuredHeights({});
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
    setMeasuredHeights((prev) => {
      if (prev[id] === height) return prev;
      return { ...prev, [id]: height };
    });
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
        measuredHeights[item.id] || (item.type === 'date' ? 44 : 110);
        
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
  }, [messages, measuredHeights]);

  if (!activeConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-fg/30 space-y-4 opacity-40">
        <div className="w-20 h-20 bg-glass-input rounded-full flex items-center justify-center">
          <MessageCircle className="w-10 h-10" />
        </div>
        <p className="font-black text-xs uppercase tracking-widest">Select a thread to begin chatting</p>
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
      <div className="h-20 px-6 border-b border-glass-border flex items-center bg-bg/85 backdrop-blur-md z-10 sticky top-0 justify-between">
        <div className="flex items-center min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-2 mr-2 hover:bg-glass-input rounded-lg transition-colors cursor-pointer text-fg/50 hover:text-fg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-glass-input border border-glass-border text-fg rounded-xl flex items-center justify-center mr-3 shadow-lg shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="font-black text-fg tracking-tight truncate text-base">
              {activeConversation.contact.name || 'Anonymous Client'}
            </h3>
            <p className="text-[9px] text-fg/30 font-black tracking-widest uppercase truncate mt-0.5">
              Mobile: {activeConversation.contact.phone_number}
            </p>
          </div>
        </div>

        {/* Bulk-delete toolbar */}
        {selectedMessageIds.size > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-muted">{selectedMessageIds.size} Selected</span>
            <button
              onClick={onClearSelection}
              className="text-xs font-black uppercase text-fg/30 hover:text-fg tracking-wider cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={onBulkDelete}
              className="flex items-center px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete selected
            </button>
          </div>
        )}
      </div>

      {/* Messages scroll area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4 relative custom-scrollbar bg-transparent"
      >
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-fg/30" />
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
            <span className="bg-bg/95 backdrop-blur-md border border-glass-border px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-fg/50 shadow-md">
              {formatSeparatorDate(activeDateHeader.dateString)}
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-fg/20 text-xs font-black uppercase tracking-[0.2em]">
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
