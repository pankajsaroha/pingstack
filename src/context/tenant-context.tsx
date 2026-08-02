'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TenantContextValue {
  tenant: any;
  setTenant: (tenant: any) => void;
  refreshTenant: () => Promise<void>;
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

  return (
    <TenantContext.Provider value={{ tenant, setTenant, refreshTenant }}>
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
