import { dbAdmin as db } from '@/lib/db';

export async function getCampaignsServer(tenantId: string) {
  if (!tenantId || !db) return [];

  try {
    const { data: campaigns, error: cErr } = await db
      .from('campaigns')
      .select('*, templates(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (cErr) {
      console.error('[getCampaignsServer] campaign query failed:', cErr);
      return [];
    }

    const { data: messages, error: mErr } = await db
      .from('messages')
      .select('campaign_id, status')
      .eq('tenant_id', tenantId)
      .not('campaign_id', 'is', null);

    if (mErr) {
      console.error('[getCampaignsServer] messages query failed:', mErr);
    }

    const statsMap: Record<string, Record<string, number>> = {};
    (messages || []).forEach((m: any) => {
      const campId = m.campaign_id;
      if (!campId) return;
      if (!statsMap[campId]) {
        statsMap[campId] = { sent: 0, delivered: 0, read: 0, failed: 0 };
      }
      const status = m.status || 'unknown';
      statsMap[campId][status] = (statsMap[campId][status] || 0) + 1;
    });

    return (campaigns || []).map((c: any) => ({
      ...c,
      stats: statsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 }
    }));
  } catch (err) {
    console.error('[getCampaignsServer] unexpected error:', err);
    return [];
  }
}
