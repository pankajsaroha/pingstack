import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshSupabaseAuthSession } from '@/lib/supabase-auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('supabase_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Missing refresh token' }, { status: 401 });
    }

    const session = await refreshSupabaseAuthSession(refreshToken);
    const response = NextResponse.json({ session });

    if (session.refresh_token) {
      response.cookies.set('supabase_refresh_token', session.refresh_token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error: unknown) {
    console.error('[refresh-supabase] Error', error);
    const message = error instanceof Error ? error.message : 'Failed to refresh';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
