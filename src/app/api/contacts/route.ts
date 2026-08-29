import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkLimit } from '@/lib/limits';
import { enforceRateLimit } from '@/lib/rate-limit';
import { invalidateContactsCache } from '@/lib/server/contacts';
import { logAuditEvent } from '@/lib/audit';
import { normalizePhoneNumber } from '@/lib/phone';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API GET contacts: Missing or invalid x-tenant-id', { tenantId });
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }

  if (!db) {
    console.error('API GET contacts: Supabase DB not initialized');
    return NextResponse.json({ error: 'Server error: database not initialized' }, { status: 500 });
  }

  const limitCheck = await enforceRateLimit(tenantId, 'read_list');
  if (limitCheck.limited && limitCheck.response) {
    return limitCheck.response;
  }

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get('page');
  const searchParam = searchParams.get('search') || '';
  const idsOnly = searchParams.get('idsOnly') === 'true';

  let query = db.from('contacts').select(idsOnly ? 'id' : '*', { count: 'exact' }).eq('tenant_id', tenantId);

  if (searchParam) {
    const rawSearch = searchParam.trim();
    const digitsSearch = rawSearch.replace(/\D/g, '');
    if (digitsSearch) {
      query = query.or(`name.ilike.%${rawSearch}%,phone_number.ilike.%${digitsSearch}%`);
    } else {
      query = query.or(`name.ilike.%${rawSearch}%,phone_number.ilike.%${rawSearch}%`);
    }
  }

  query = query.order('created_at', { ascending: false });

  if (idsOnly) {
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ids: (data || []).map((c: any) => c.id) });
  }

  if (pageParam) {
    const page = parseInt(pageParam) || 1;
    const pageSize = parseInt(searchParams.get('pageSize') || '10') || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('API GET contacts error', { tenantId, error });
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  if (pageParam) {
    return NextResponse.json({
      contacts: data || [],
      totalCount: count || 0
    });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API POST contacts: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, phone_number } = body;

    if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // NORMALIZE PHONE: Strip +, non-digits, and prepend 91 default country code if 10 digits
    const normalizedPhone = normalizePhoneNumber(phone_number);

    const canAddContact = await checkLimit(tenantId, 'contacts');
    if (!canAddContact) {
      return NextResponse.json({ error: 'Upgrade to continue. You have reached your contacts limit.' }, { status: 403 });
    }

    const { data, error } = await db.from('contacts')
      .insert({ 
        tenant_id: tenantId, 
        name: name || null, 
        phone_number: normalizedPhone 
      })
      .select()
      .single();

    if (error) {
      console.error('Add contact error:', error);
      return NextResponse.json({ 
        error: error.message,
        code: error.code 
      }, { status: 400 });
    }

    await invalidateContactsCache(tenantId);

    await logAuditEvent({
      tenantId,
      userId,
      action: 'CONTACT_CREATE',
      resource: `contact:${data.id}`,
      details: { name, phone: normalizedPhone }
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Contact processing error:', err, 'TenantID:', req.headers.get('x-tenant-id'));
    return NextResponse.json({ error: err.message || 'Processing error' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || tenantId === 'undefined') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { id, name, phone_number } = await req.json();
    if (!id || !phone_number) return NextResponse.json({ error: 'ID and Phone number are required' }, { status: 400 });

    const normalizedPhone = normalizePhoneNumber(phone_number);

    const { data, error } = await db.from('contacts')
      .update({ name: name || null, phone_number: normalizedPhone })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await invalidateContactsCache(tenantId);

    await logAuditEvent({
      tenantId,
      userId,
      action: 'CONTACT_UPDATE',
      resource: `contact:${id}`,
      details: { name, phone: normalizedPhone }
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || tenantId === 'undefined') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { error } = await db.from('contacts').delete().in('id', ids).eq('tenant_id', tenantId);
    if (error) throw error;

    await invalidateContactsCache(tenantId);

    await logAuditEvent({
      tenantId,
      userId,
      action: 'CONTACT_DELETE',
      resource: `contacts:${ids.length}`,
      details: { deletedCount: ids.length }
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
