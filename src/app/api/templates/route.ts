import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    console.error('API GET templates: Missing x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    console.error('API GET templates: Supabase DB not initialized');
    return NextResponse.json({ error: 'Server error: database not initialized' }, { status: 500 });
  }

  const { data, error } = await db.from('templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('API GET templates error', { tenantId, error });
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { name, template_id, content } = await req.json();
    if (!name || !template_id || !content) {
      return NextResponse.json({ error: 'Missing required fields (name, template_id, content)' }, { status: 400 });
    }

    const { data, error } = await db.from('templates')
      .insert({ 
        tenant_id: tenantId, 
        name, 
        template_id, 
        content, 
        status: 'active' 
      })
      .select().single();

    if (error) {
      console.error('Add template error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Template processing error:', err);
    return NextResponse.json({ error: 'Invalid request body or processing error' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { error } = await db.from('templates').delete().in('id', ids).eq('tenant_id', tenantId);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
