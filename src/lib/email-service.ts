import { Resend } from 'resend';

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY in environment variables');
  }
  return new Resend(apiKey);
};

export const sendVerificationOTP = async (email: string, code: string) => {
  const resend = getResend();
  
  return await resend.emails.send({
    from: 'PingStack Support <info@pingstack.in>',
    to: email,
    subject: `Your Verification Code: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px; border-radius: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">PingStack</h1>
          <p style="color: #616161; font-size: 14px;">Verify your email address</p>
        </div>
        <div style="background: #fcfcfc; border: 1px solid #f0f0f0; padding: 30px; border-radius: 12px; text-align: center;">
          <p style="margin-top: 0; color: #444;">Enter this code to complete your registration:</p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #000; margin: 20px 0;">${code}</div>
          <p style="font-size: 13px; color: #888;">This code will expire in 15 minutes.</p>
        </div>
        <p style="font-size: 12px; color: #aaa; margin-top: 40px; text-align: center;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    `
  });
};
