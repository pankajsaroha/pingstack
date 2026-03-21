import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const { error } = await db
      .from('messages')
      .delete()
      .in('id', ids)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error('Bulk Delete Message Error:', err);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
