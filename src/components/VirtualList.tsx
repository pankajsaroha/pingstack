'use client';

import React, { useState, useRef, useEffect, UIEvent } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeights: number[]; // Array of heights for each item in the list
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export default function VirtualList<T>({
  items,
  itemHeights,
  renderItem,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(500);
  const [scrollTop, setScrollTop] = useState(0);

  // Measure container height dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Compute cumulative heights and offsets
  const { cumulativeHeights, totalHeight } = React.useMemo(() => {
    const cumulative: number[] = [];
    let currentSum = 0;
    for (let i = 0; i < itemHeights.length; i++) {
      cumulative.push(currentSum);
      currentSum += itemHeights[i] || 80; // fallback height
    }
    return { cumulativeHeights: cumulative, totalHeight: currentSum };
  }, [itemHeights]);

  // Determine which items are visible
  let startIndex = 0;
  while (
    startIndex < cumulativeHeights.length - 1 &&
    cumulativeHeights[startIndex + 1] < scrollTop
  ) {
    startIndex++;
  }
  // Render a small buffer of 2 items above
  startIndex = Math.max(0, startIndex - 2);

  let endIndex = startIndex;
  const viewportBottom = scrollTop + containerHeight;
  while (
    endIndex < cumulativeHeights.length &&
    cumulativeHeights[endIndex] < viewportBottom
  ) {
    endIndex++;
  }
  // Render a small buffer of 2 items below
  endIndex = Math.min(cumulativeHeights.length, endIndex + 2);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = cumulativeHeights[startIndex] || 0;

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`${className} relative overflow-y-auto`}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}
