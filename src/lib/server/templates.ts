import { dbAdmin as db } from '@/lib/db';
import { Template } from '@/types';

export async function getTemplatesServer(tenantId: string): Promise<Template[]> {
  if (!tenantId || !db) return [];
  try {
    const { data, error } = await db
      .from('templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getTemplatesServer] query failed:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('[getTemplatesServer] unexpected error:', e);
    return [];
  }
}
