import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkLimit } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API GET contacts: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }

  const { data, error } = await db.from('contacts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API POST contacts: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, phone_number } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // NORMALIZE PHONE: Strip + and non-digits
    const normalizedPhone = String(phone_number).replace(/\D/g, '');

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

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Contact processing error:', err, 'TenantID:', req.headers.get('x-tenant-id'));
    return NextResponse.json({ error: err.message || 'Processing error' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { error } = await db.from('contacts').delete().in('id', ids).eq('tenant_id', tenantId);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
