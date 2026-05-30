'use client';

import { useEffect, useRef } from 'react';
import { dbPublic } from '@/lib/db';

const STORAGE_KEY = 'supabaseSession';
const REFRESH_ENDPOINT = '/api/auth/refresh-supabase';

const parseStoredSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const saveSession = (session: any) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const clearSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export default function SupabaseSessionManager() {
  const refreshTimeout = useRef<number | null>(null);

  const scheduleRefresh = (session: any) => {
    if (!session?.expires_at) return;

    const now = Date.now() / 1000;
    const expiresAt = Number(session.expires_at);
    const refreshInMs = Math.max((expiresAt - now - 60) * 1000, 0);

    if (refreshTimeout.current) {
      window.clearTimeout(refreshTimeout.current);
    }

    refreshTimeout.current = window.setTimeout(() => {
      refreshSession();
    }, refreshInMs);
  };

  const setSessionOnClient = async (session: any) => {
    if (!dbPublic?.auth?.setSession) return;
    try {
      await dbPublic.auth.setSession(session);
      saveSession(session);
      scheduleRefresh(session);
    } catch (err) {
      console.error('[SupabaseSessionManager] Failed to set session', err);
    }
  };

  const refreshSession = async () => {
    try {
      const res = await fetch(REFRESH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        clearSession();
        return;
      }

      const data = await res.json();
      if (data?.session) {
        await setSessionOnClient(data.session);
      } else {
        clearSession();
      }
    } catch (error) {
      console.error('[SupabaseSessionManager] refresh failed', error);
      clearSession();
    }
  };

  useEffect(() => {
    const load = async () => {
      const stored = parseStoredSession();
      const now = Date.now() / 1000;

      if (stored?.access_token) {
        if (stored.expires_at && Number(stored.expires_at) <= now + 60) {
          await refreshSession();
        } else {
          await setSessionOnClient(stored);
        }
      } else {
        await refreshSession();
      }
    };

    load();

    return () => {
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current);
      }
    };
  }, []);

  return null;
}
