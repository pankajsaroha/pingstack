import { dbAdmin as db } from '@/lib/db';

export async function getContactsServer(tenantId: string) {
  if (!tenantId || !db) return [];
  try {
    const { data, error } = await db
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getContactsServer] query failed:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('[getContactsServer] unexpected error:', e);
    return [];
  }
}
