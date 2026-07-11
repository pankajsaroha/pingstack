import { dbAdmin as db } from '@/lib/db';

export async function getContactsServer(tenantId: string): Promise<any[]>;
export async function getContactsServer(tenantId: string, limit: number): Promise<{ contacts: any[]; totalCount: number }>;
export async function getContactsServer(tenantId: string, limit?: number): Promise<any> {
  if (!tenantId || !db) return limit ? { contacts: [], totalCount: 0 } : [];
  try {
    let query = db
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.range(0, limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[getContactsServer] query failed:', error);
      return limit ? { contacts: [], totalCount: 0 } : [];
    }

    if (limit) {
      return {
        contacts: data || [],
        totalCount: count || 0
      };
    }

    return data || [];
  } catch (e) {
    console.error('[getContactsServer] unexpected error:', e);
    return limit ? { contacts: [], totalCount: 0 } : [];
  }
}
