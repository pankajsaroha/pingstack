import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/hash';
import { generatePublicId } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { tenantName, userName, email, password } = await req.json();

    if (!tenantName || !userName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existingUser } = await db.from('users').select('id').eq('email', email).single();
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const publicId = generatePublicId('t');
    const { data: tenant, error: tenantErr } = await db.from('tenants')
      .insert({ name: tenantName, public_id: publicId })
      .select('id').single();

    if (tenantErr || !tenant) {
      console.error(tenantErr);
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    const hashed = await hashPassword(password);
    const { data: user, error: userErr } = await db.from('users')
      .insert({
        tenant_id: tenant.id,
        name: userName,
        email,
        password_hash: hashed,
        role: 'admin'
      }).select('id, role, tenant_id').single();

    if (userErr || !user) {
      console.error(userErr);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const token = await signToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    });

    return NextResponse.json({ token, tenantId: publicId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
