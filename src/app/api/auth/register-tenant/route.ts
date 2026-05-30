import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/hash';
import { generatePublicId } from '@/lib/utils';
import { sendVerificationOTP } from '@/lib/email-service';
import { ensureSupabaseAuthUser, getSupabaseAuthSession } from '@/lib/supabase-auth';
import type { Session } from '@supabase/supabase-js';

type VerificationPayload = {
  tenantName?: unknown;
  userName?: unknown;
  passwordHash?: unknown;
};

type VerificationCode = {
  payload: VerificationPayload | null;
};

type RegisteredUser = {
  id: string;
  role: string | null;
  tenant_id: string;
};

export async function POST(req: Request) {
  try {
    if (!db) {
      console.error('[auth/register-tenant] database client is not initialized');
      return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
    }

    const body = await req.json();
    const { step = 'INITIATE', email } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (step === 'INITIATE') {
      const { tenantName, userName, password } = body;

      if (!tenantName || !userName || !normalizedEmail || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if user exists
      const { data: existingUser, error: checkErr } = await db.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
      if (checkErr || existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // Hash password BEFORE storing it in verification table for security
      const passwordHash = await hashPassword(password);

      // Store in verification_codes
      const { error: otpErr } = await db.from('verification_codes').insert({
        email: normalizedEmail,
        code: otp,
        expires_at: expiresAt.toISOString(),
        payload: { tenantName, userName, passwordHash }
      });

      if (otpErr) {
        console.error('OTP DB Error:', otpErr);
        return NextResponse.json({ error: 'Failed to initiate verification' }, { status: 500 });
      }

      // Send Email
      const { error: emailErr } = await sendVerificationOTP(normalizedEmail, otp);
      
      if (emailErr) {
        console.error('Resend API Error:', emailErr);
        // Delete the code so the user can retry once the email setup is fixed
        await db.from('verification_codes').delete().eq('email', normalizedEmail).eq('code', otp);
        return NextResponse.json({ 
          error: `Email delivery failed: ${emailErr.message}. Ensure your Resend domain is verified or send to your registered Resend email.` 
        }, { status: 500 });
      }

      return NextResponse.json({ status: 'OTP_SENT' });
    }

    if (step === 'VERIFY') {
      const { code } = body;

      if (!normalizedEmail || !code) {
        return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
      }

      // Check OTP from DB
      const { data: verificationData, error: verifyErr } = await db.from('verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const verification = verificationData as VerificationCode | null;

      if (verifyErr || !verification) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }

      const payload = verification.payload;
      const tenantName = typeof payload?.tenantName === 'string' ? payload.tenantName : '';
      const userName = typeof payload?.userName === 'string' ? payload.userName : '';
      const passwordHash = typeof payload?.passwordHash === 'string' ? payload.passwordHash : '';

      if (!tenantName || !userName || !passwordHash) {
        return NextResponse.json({ error: 'Invalid verification payload. Please restart registration.' }, { status: 400 });
      }

      // START ACTUAL REGISTRATION
      const publicId = generatePublicId('t');
      const { data: tenant, error: tenantErr } = await db.from('tenants')
        .insert({ name: tenantName, public_id: publicId })
        .select('id').single();

      if (tenantErr || !tenant) {
        console.error(tenantErr);
        return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
      }

      const { data: userData, error: userErr } = await db.from('users')
        .insert({
          tenant_id: tenant.id,
          name: userName,
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'admin'
        }).select('id, role, tenant_id').single();
      const user = userData as RegisteredUser | null;

      if (userErr || !user) {
        console.error(userErr);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      // Cleanup codes for this email
      await db.from('verification_codes').delete().eq('email', normalizedEmail);

      const token = await signToken({
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role || 'admin'
      });

      if (!body.password) {
        return NextResponse.json({ error: 'Password required for verification' }, { status: 400 });
      }

      let supabaseSession: Session | null = null;
      try {
        await ensureSupabaseAuthUser(normalizedEmail, body.password);
        supabaseSession = await getSupabaseAuthSession(normalizedEmail, body.password);
      } catch (err) {
        console.warn('[auth/register-tenant] failed to sync with supabase:', err);
        // Continue - this is non-fatal
      }

      const response = NextResponse.json({ token, tenantId: publicId, supabaseSession });
      if (supabaseSession?.refresh_token) {
        response.cookies.set('supabase_refresh_token', supabaseSession.refresh_token, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        });
      }

      return response;
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Registration API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
