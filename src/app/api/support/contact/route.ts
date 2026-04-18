import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend lazily to avoid crashing if the key is missing from the environment
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY in environment variables');
  }
  return new Resend(apiKey);
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Check for API key before processing
    let resend;
    try {
      resend = getResend();
    } catch (err) {
      console.error('Configuration error:', err);
      // We still try to save to DB even if email is broken, but we'll return an error to the user
      // so they know the email part failed.
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Save to Database
    const { error: dbError } = await supabase
      .from('support_tickets')
      .insert([
        { name, email, subject, message, status: 'CREATED' }
      ]);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save inquiry to database' },
        { status: 500 }
      );
    }

    // 2. Send Email via Resend
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured. Please add RESEND_API_KEY to .env.local' },
        { status: 503 }
      );
    }

    try {
      await resend.emails.send({
        from: 'PingStack Support <onboarding@resend.dev>', // Resend default for unverified domains
        to: 'info@pingstack.in',
        subject: `New Support Inquiry: ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #1a1a1a;">New Support Message</h2>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px;">
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p style="font-size: 12px; color: #888; margin-top: 20px;">
              This inquiry was sent from the PingStack Documentation/Support Center.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      // We don't fail the whole request if email fails, as long as DB saved the data
      console.error('Email sending error:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
