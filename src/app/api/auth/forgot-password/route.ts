import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { sendVerificationOTP } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { step = 'INITIATE', email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (step === 'INITIATE') {
      const { data: user } = await db.from('users').select('id, name').eq('email', email).single();

      if (!user) {
        return NextResponse.json({ error: 'Email address not found. Please register first.' }, { status: 404 });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // Store in verification_codes
      await db.from('verification_codes').insert({
        email,
        code: otp,
        expires_at: expiresAt.toISOString(),
        payload: { type: 'PASSWORD_RESET' }
      });

      // Send Email
      await sendVerificationOTP(email, otp);

      return NextResponse.json({ status: 'OTP_SENT' });
    }

    if (step === 'VERIFY') {
      const { code } = body;
      if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

      const { data: verification, error: verifyErr } = await db.from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

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
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (verifyErr || !verification) {
        return NextResponse.json({ error: 'Session expired. Please restart the process.' }, { status: 400 });
      }

      // Update password
      const passwordHash = await hashPassword(password);
      const { error: updateErr } = await db.from('users')
        .update({ password_hash: passwordHash })
        .eq('email', email);

      if (updateErr) {
        console.error('Password update error:', updateErr);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }

      // Cleanup
      await db.from('verification_codes').delete().eq('email', email);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
