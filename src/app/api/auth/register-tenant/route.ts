import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/hash';
import { generatePublicId } from '@/lib/utils';
import { sendVerificationOTP } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { step = 'INITIATE', email } = body;

    if (step === 'INITIATE') {
      const { tenantName, userName, password } = body;

      if (!tenantName || !userName || !email || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if user exists
      const { data: existingUser } = await db.from('users').select('id').eq('email', email).single();
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // Hash password BEFORE storing it in verification table for security
      const passwordHash = await hashPassword(password);

      // Store in verification_codes
      const { error: otpErr } = await db.from('verification_codes').insert({
        email,
        code: otp,
        expires_at: expiresAt.toISOString(),
        payload: { tenantName, userName, passwordHash }
      });

      if (otpErr) {
        console.error('OTP DB Error:', otpErr);
        return NextResponse.json({ error: 'Failed to initiate verification' }, { status: 500 });
      }

      // Send Email
      const { error: emailErr } = await sendVerificationOTP(email, otp);
      
      if (emailErr) {
        console.error('Resend API Error:', emailErr);
        // Delete the code so the user can retry once the email setup is fixed
        await db.from('verification_codes').delete().eq('email', email).eq('code', otp);
        return NextResponse.json({ 
          error: `Email delivery failed: ${emailErr.message}. Ensure your Resend domain is verified or send to your registered Resend email.` 
        }, { status: 500 });
      }

      return NextResponse.json({ status: 'OTP_SENT' });
    }

    if (step === 'VERIFY') {
      const { code } = body;

      if (!email || !code) {
        return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
      }

      // Check OTP from DB
      const { data: verification, error: verifyErr } = await db.from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyErr || !verification) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }

      const { tenantName, userName, passwordHash } = verification.payload;

      // START ACTUAL REGISTRATION
      const publicId = generatePublicId('t');
      const { data: tenant, error: tenantErr } = await db.from('tenants')
        .insert({ name: tenantName, public_id: publicId })
        .select('id').single();

      if (tenantErr || !tenant) {
        console.error(tenantErr);
        return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
      }

      const { data: user, error: userErr } = await db.from('users')
        .insert({
          tenant_id: tenant.id,
          name: userName,
          email,
          password_hash: passwordHash,
          role: 'admin'
        }).select('id, role, tenant_id').single();

      if (userErr || !user) {
        console.error(userErr);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      // Cleanup codes for this email
      await db.from('verification_codes').delete().eq('email', email);

      const token = await signToken({
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role
      });

      return NextResponse.json({ token, tenantId: publicId });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
