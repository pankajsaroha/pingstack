import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const qLower = q.toLowerCase();

    const [tenantsRes, waRes, usersRes, campaignsRes] = await Promise.all([
      db.from('tenants').select('id, name, public_id, plan_type, subscription_status, created_at'),
      db.from('whatsapp_accounts').select('id, tenant_id, phone_number_id, business_id, status'),
      db.from('users').select('id, tenant_id, email, name'),
      db.from('campaigns').select('id, tenant_id, name, status'),
    ]);

    const tenants = tenantsRes.data || [];
    const waAccounts = waRes.data || [];
    const users = usersRes.data || [];
    const campaigns = campaignsRes.data || [];

    const tenantMap = new Map<string, any>();
    tenants.forEach((t: any) => tenantMap.set(t.id, t));

    const results: Array<{
      type: 'business' | 'user' | 'whatsapp' | 'campaign';
      id: string;
      title: string;
      subtitle: string;
      href: string;
      badge?: string;
    }> = [];

    // Search Businesses
    tenants.forEach((t: any) => {
      if (
        t.name.toLowerCase().includes(qLower) ||
        t.id.toLowerCase().includes(qLower) ||
        (t.public_id && t.public_id.toLowerCase().includes(qLower))
      ) {
        results.push({
          type: 'business',
          id: t.id,
          title: t.name,
          subtitle: `Plan: ${t.plan_type || 'Starter'} • ID: ${t.public_id || t.id}`,
          href: `/admin/businesses/${t.id}`,
          badge: t.plan_type?.toUpperCase(),
        });
      }
    });

    // Search Users / Owners
    users.forEach((u: any) => {
      if (u.email.toLowerCase().includes(qLower) || (u.name && u.name.toLowerCase().includes(qLower))) {
        const tenant = tenantMap.get(u.tenant_id);
        results.push({
          type: 'user',
          id: u.id,
          title: u.name || u.email,
          subtitle: `User (${u.email}) at ${tenant?.name || 'Workspace'}`,
          href: u.tenant_id ? `/admin/businesses/${u.tenant_id}` : '/admin/businesses',
          badge: u.role?.toUpperCase(),
        });
      }
    });

    // Search WhatsApp Accounts
    waAccounts.forEach((wa: any) => {
      if (
        (wa.phone_number_id && wa.phone_number_id.includes(q)) ||
        (wa.business_id && wa.business_id.includes(q))
      ) {
        const tenant = tenantMap.get(wa.tenant_id);
        results.push({
          type: 'whatsapp',
          id: wa.id,
          title: `WhatsApp Phone ID: ${wa.phone_number_id}`,
          subtitle: `WABA: ${wa.business_id} • ${tenant?.name || 'Workspace'}`,
          href: wa.tenant_id ? `/admin/businesses/${wa.tenant_id}` : '/admin/businesses',
          badge: wa.status,
        });
      }
    });

    // Search Campaigns
    campaigns.forEach((c: any) => {
      if (c.name.toLowerCase().includes(qLower)) {
        const tenant = tenantMap.get(c.tenant_id);
        results.push({
          type: 'campaign',
          id: c.id,
          title: c.name,
          subtitle: `Campaign at ${tenant?.name || 'Workspace'} • Status: ${c.status}`,
          href: `/admin/campaigns`,
          badge: c.status?.toUpperCase(),
        });
      }
    });

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (err: any) {
    console.error('[Admin Search API] Error:', err);
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 });
  }
}
