'use client';

import { useEffect } from 'react';

export default function TimezoneSync() {
  useEffect(() => {
    const syncTimezone = async () => {
      try {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // 1. Fetch current tenant info to see if we need to update
        const res = await fetch('/api/tenant/me');
        if (!res.ok) return;
        
        const tenant = await res.json();
        
        // 2. Only update if different or missing
        if (tenant.timezone !== userTimezone) {
          console.log(`[TimezoneSync] Updating tenant timezone to ${userTimezone}`);
          await fetch('/api/tenant/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timezone: userTimezone })
          });
        }
      } catch (e) {
        console.error('[TimezoneSync] Failed to sync timezone:', e);
      }
    };

    syncTimezone();
  }, []);

  return null;
}
