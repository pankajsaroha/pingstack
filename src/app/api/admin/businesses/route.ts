import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const plan = searchParams.get('plan')?.trim().toLowerCase() || 'all';
    const whatsapp = searchParams.get('whatsapp')?.trim().toLowerCase() || 'all';
    const status = searchParams.get('status')?.trim().toLowerCase() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    // 1. Fetch all WhatsApp accounts and Users for quick in-memory join
    const [allTenantsRes, allWaRes, allUsersRes, allMessagesCountRes] = await Promise.all([
      db.from('tenants').select('*').order('created_at', { ascending: false }),
      db.from('whatsapp_accounts').select('id, tenant_id, status, phone_number_id, business_id'),
      db.from('users').select('id, tenant_id, email, name'),
      // Fetch messages sent today per tenant
      db.from('messages')
        .select('tenant_id')
        .gte('created_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()),
    ]);

    if (allTenantsRes.error) {
      throw allTenantsRes.error;
    }

    const waByTenant = new Map<string, any>();
    (allWaRes.data || []).forEach((wa: any) => {
      if (wa.tenant_id) waByTenant.set(wa.tenant_id, wa);
    });

    const userByTenant = new Map<string, any>();
    (allUsersRes.data || []).forEach((u: any) => {
      if (u.tenant_id && !userByTenant.has(u.tenant_id)) {
        userByTenant.set(u.tenant_id, u);
      }
    });

    const messagesTodayByTenant = new Map<string, number>();
    (allMessagesCountRes.data || []).forEach((m: any) => {
      if (m.tenant_id) {
        messagesTodayByTenant.set(m.tenant_id, (messagesTodayByTenant.get(m.tenant_id) || 0) + 1);
      }
    });

    // Merge & format businesses
    let businesses = (allTenantsRes.data || []).map((t: any) => {
      const wa = waByTenant.get(t.id);
      const user = userByTenant.get(t.id);
      const isConnected = wa && (wa.status === 'ACTIVE' || wa.status === 'CONNECTED');
      const isSuspended = t.subscription_status === 'suspended';

      let computedStatus = 'Active';
      if (isSuspended) computedStatus = 'Suspended';
      else if (!isConnected) computedStatus = 'Onboarding';

      return {
        id: t.id,
        publicId: t.public_id,
        name: t.name,
        planType: t.plan_type || 'starter',
        subscriptionStatus: t.subscription_status || 'active',
        computedStatus,
        ownerName: user?.name || 'Owner',
        ownerEmail: user?.email || '—',
        whatsappStatus: isConnected ? 'Connected' : wa ? wa.status : 'Disconnected',
        whatsappPhoneId: wa?.phone_number_id || null,
        whatsappBusinessId: wa?.business_id || null,
        messagesToday: messagesTodayByTenant.get(t.id) || 0,
        storageBytes: t.storage_usage_bytes || 0,
        country: t.country || 'IN',
        createdAt: t.created_at,
        lastActivity: t.last_usage_reset || t.created_at,
      };
    });

    // Filter by search query
    if (query) {
      const qLower = query.toLowerCase();
      businesses = businesses.filter(
        (b: any) =>
          b.name.toLowerCase().includes(qLower) ||
          b.ownerEmail.toLowerCase().includes(qLower) ||
          b.ownerName.toLowerCase().includes(qLower) ||
          b.id.toLowerCase().includes(qLower) ||
          (b.publicId && b.publicId.toLowerCase().includes(qLower)) ||
          (b.whatsappPhoneId && b.whatsappPhoneId.includes(qLower)) ||
          (b.whatsappBusinessId && b.whatsappBusinessId.includes(qLower))
      );
    }

    // Filter by Plan
    if (plan !== 'all') {
      businesses = businesses.filter((b: any) => b.planType.toLowerCase() === plan);
    }

    // Filter by WhatsApp Status
    if (whatsapp !== 'all') {
      if (whatsapp === 'connected') {
        businesses = businesses.filter((b: any) => b.whatsappStatus === 'Connected');
      } else if (whatsapp === 'disconnected') {
        businesses = businesses.filter((b: any) => b.whatsappStatus === 'Disconnected');
      } else {
        businesses = businesses.filter((b: any) => b.whatsappStatus.toLowerCase() === whatsapp);
      }
    }

    // Filter by Account Status
    if (status !== 'all') {
      businesses = businesses.filter((b: any) => b.computedStatus.toLowerCase() === status);
    }

    const totalCount = businesses.length;
    const paginatedBusinesses = businesses.slice(offset, offset + limit);

    return NextResponse.json({
      businesses: paginatedBusinesses,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error('[Admin Businesses API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list businesses' }, { status: 500 });
  }
}
