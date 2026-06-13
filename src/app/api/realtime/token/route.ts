import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role') || 'user';
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!tenantId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseJwtSecret) {
    return NextResponse.json({ error: 'Realtime token signing is not configured' }, { status: 500 });
  }

  const token = await new SignJWT({
    role: 'authenticated',
    tenantId,
    userId,
    appRole: role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(supabaseJwtSecret));

  return NextResponse.json({ token });
}
