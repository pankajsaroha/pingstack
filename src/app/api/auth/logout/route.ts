import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const isSecure = process.env.NODE_ENV === 'production';

  // Expire both auth cookies server-side so httpOnly tokens are properly cleared
  response.cookies.set('token', '', {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    maxAge: 0,
  });

  response.cookies.set('supabase_refresh_token', '', {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
  });

  return response;
}
