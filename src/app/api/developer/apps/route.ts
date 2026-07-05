import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashApiKey } from '@/lib/api-auth';
import { randomBytes } from 'crypto';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { data, error } = await db
      .from('developer_apps')
      .select('id, name, description, api_key_prefix, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 });
    }

    // Generate secure random key
    const rawSecret = randomBytes(24).toString('hex');
    const plaintextKey = `ps_secret_live_${rawSecret}`;
    const hash = hashApiKey(plaintextKey);
    const prefix = `${plaintextKey.substring(0, 15)}...`;

    const { data, error } = await db
      .from('developer_apps')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        description: description?.trim() || null,
        api_key_prefix: prefix,
        api_secret_hash: hash
      })
      .select('id, name, description, api_key_prefix, created_at')
      .single();

    if (error) throw error;

    // Return the plaintext key ONCE to the UI
    return NextResponse.json({
      app: data,
      apiKey: plaintextKey
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing app ID' }, { status: 400 });

    const { error } = await db
      .from('developer_apps')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
