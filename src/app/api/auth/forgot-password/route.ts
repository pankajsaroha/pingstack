import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { sendVerificationOTP } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    if (!db) {
      console.error('[auth/forgot-password] database client is not initialized');
      return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
    }

    const body = await req.json();
    const { step = 'INITIATE', email } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (step === 'INITIATE') {
      const { data: user, error: userErr } = await db.from('users').select('id, name').eq('email', normalizedEmail).maybeSingle();

      if (userErr || !user) {
        return NextResponse.json({ error: 'Email address not found. Please register first.' }, { status: 404 });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // Store in verification_codes
      const { error: otpErr } = await db.from('verification_codes').insert({
        email: normalizedEmail,
        code: otp,
        expires_at: expiresAt.toISOString(),
        payload: { type: 'PASSWORD_RESET' }
      });

      if (otpErr) {
        console.error('Password reset OTP DB error:', otpErr);
        return NextResponse.json({ error: 'Failed to initiate password reset' }, { status: 500 });
      }

      // Send Email
      const { error: emailErr } = await sendVerificationOTP(normalizedEmail, otp);
      if (emailErr) {
        console.error('Password reset email error:', emailErr);
        await db.from('verification_codes').delete().eq('email', normalizedEmail).eq('code', otp);
        return NextResponse.json({ error: `Email delivery failed: ${emailErr.message}` }, { status: 500 });
      }

      return NextResponse.json({ status: 'OTP_SENT' });
    }

    if (step === 'VERIFY') {
      const { code } = body;
      if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

      const { data: verification, error: verifyErr } = await db.from('verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (verifyErr || !verification) {
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (step === 'RESET') {
      const { code, password } = body;
      if (!code || !password) return NextResponse.json({ error: 'Missing code or password' }, { status: 400 });

      // Verify code one last time
      const { data: verification, error: verifyErr } = await db.from('verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (verifyErr || !verification) {
        return NextResponse.json({ error: 'Session expired. Please restart the process.' }, { status: 400 });
      }

      // Update password
      const passwordHash = await hashPassword(password);
      const { error: updateErr } = await db.from('users')
        .update({ password_hash: passwordHash })
        .eq('email', normalizedEmail);

      if (updateErr) {
        console.error('Password update error:', updateErr);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }

      // Cleanup
      await db.from('verification_codes').delete().eq('email', normalizedEmail);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Forgot password API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
