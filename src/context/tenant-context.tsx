'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { dbPublic } from '@/lib/db';

export interface TenantContextValue {
  tenant: any;
  setTenant: (tenant: any) => void;
  refreshTenant: () => Promise<void>;
  unreadConversationsCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  initialTenant,
  children,
}: {
  initialTenant: any;
  children: ReactNode;
}) {
  const [tenant, setTenant] = useState<any>(initialTenant);
  const [unreadConversationsCount, setUnreadConversationsCount] = useState<number>(0);
  const unreadContactIdsRef = useRef<Set<string>>(new Set());

  const refreshTenant = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/me', { credentials: 'include' });
      if (res.ok) {
        setTenant(await res.json());
      }
    } catch (e) {
      console.error('[TenantContext] Failed to refresh tenant:', e);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const headers: Record<string, string> = { credentials: 'include' };
      if (tenant?.id) {
        headers['x-tenant-id'] = tenant.id;
      }
      const res = await fetch('/api/chat/unread-count', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const contactIds = data.contactIds || [];
        unreadContactIdsRef.current = new Set(contactIds);
        setUnreadConversationsCount(contactIds.length);
      }
    } catch (e) {
      console.error('[TenantContext] Failed to fetch unread count:', e);
    }
  }, [tenant?.id]);

  // Initial load of unread count & periodic visibility re-sync
  useEffect(() => {
    refreshUnreadCount();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };

    // Rehydrate unread count when window gains focus or comes back online
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshUnreadCount);
    window.addEventListener('online', refreshUnreadCount);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshUnreadCount);
      window.removeEventListener('online', refreshUnreadCount);
    };
  }, [refreshUnreadCount]);

  // Listen to custom conversation-read events dispatched when chats are opened/marked read
  useEffect(() => {
    const handleConversationRead = (e: Event) => {
      const customEvent = e as CustomEvent<{ contactId?: string }>;
      const contactId = customEvent.detail?.contactId;
      if (contactId && unreadContactIdsRef.current.has(contactId)) {
        unreadContactIdsRef.current.delete(contactId);
        setUnreadConversationsCount(unreadContactIdsRef.current.size);
      }
    };

    window.addEventListener('pingstack:conversation-read', handleConversationRead);
    return () => {
      window.removeEventListener('pingstack:conversation-read', handleConversationRead);
    };
  }, []);

  // Supabase Realtime synchronization for global unread counter across all workspace pages
  useEffect(() => {
    if (!tenant?.id) return;
    let isMounted = true;

    const realtimeChannelRef: { current: ReturnType<typeof dbPublic.channel> | null } = { current: null };

    const subscribeToRealtime = async () => {
      try {
        const res = await fetch('/api/realtime/token', { method: 'POST', credentials: 'include' });
        if (!res.ok) return;
        const { token } = await res.json();
        if (!token || !isMounted) return;

        dbPublic.realtime.setAuth(token);
        const channel = dbPublic.channel(`tenant:${tenant.id}`, { config: { private: true } })
          .on('broadcast', { event: 'INSERT' }, (p: any) => {
            const message = p.payload || p;
            if (!message || !message.contact_id) return;
            // When an inbound received message arrives, increment conversation count if this contact is not already unread
            if (message.direction === 'inbound' && message.status === 'received') {
              if (!unreadContactIdsRef.current.has(message.contact_id)) {
                unreadContactIdsRef.current.add(message.contact_id);
                setUnreadConversationsCount(unreadContactIdsRef.current.size);
              }
            }
          })
          .on('broadcast', { event: 'UPDATE' }, (p: any) => {
            const message = p.payload || p;
            if (message?.status === 'read') {
              // Re-fetch accurate count from DB to ensure perfect synchronization across tabs
              refreshUnreadCount();
            }
          })
          .subscribe();

        realtimeChannelRef.current = channel;
      } catch (err) {
        console.error('[TenantContext] Realtime subscription error:', err);
      }
    };

    subscribeToRealtime();

    return () => {
      isMounted = false;
      if (realtimeChannelRef.current) {
        dbPublic.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [tenant?.id, refreshUnreadCount]);

  return (
    <TenantContext.Provider value={{
      tenant,
      setTenant,
      refreshTenant,
      unreadConversationsCount,
      refreshUnreadCount,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used inside <TenantProvider>');
  }
  return ctx;
}
