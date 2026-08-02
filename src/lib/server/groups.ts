import { dbAdmin as db } from '@/lib/db';
import { Group } from '@/types';

export async function getGroupsServer(tenantId: string): Promise<Group[]> {
  if (!tenantId || !db) return [];
  try {
    const { data, error } = await db
      .from('groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getGroupsServer] query failed:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('[getGroupsServer] unexpected error:', e);
    return [];
  }
}
