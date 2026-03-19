import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePublicId } from '@/lib/utils';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await db.from('campaigns').select('*, templates(name)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, template_id, scheduled_at } = await req.json();
  if (!name || !template_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const publicId = generatePublicId('c');
  const { data, error } = await db.from('campaigns')
    .insert({ tenant_id: tenantId, public_id: publicId, name, template_id, scheduled_at, status: 'draft' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
