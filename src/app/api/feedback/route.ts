import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dbAdmin } from '@/lib/db';
import { Resend } from 'resend';

// Initialize Resend lazily
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const tenantId = reqHeaders.get('x-tenant-id') || null;
    const userId = reqHeaders.get('x-user-id') || null;

    const body = await req.json();
    const { 
      type, 
      message, 
      priority = 'important', 
      email = null, 
      page = null, 
      canContact = false,
      userAgent = null 
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Feedback message is required' },
        { status: 400 }
      );
    }

    const payload = {
      tenant_id: tenantId,
      user_id: userId,
      type: type || 'general',
      message: message.trim(),
      priority: priority || 'important',
      email: email ? email.trim() : null,
      page: page || null,
      metadata: {
        can_contact: Boolean(canContact),
        user_agent: userAgent,
        submitted_at: new Date().toISOString()
      },
      status: 'NEW'
    };

    // 1. Save to Supabase
    if (dbAdmin) {
      const { error: dbError } = await dbAdmin
        .from('feedback')
        .insert([payload]);

      if (dbError) {
        console.warn('[Feedback API] DB insert warning:', dbError.message);
      }
    }

    console.log('[Feedback Collected]', JSON.stringify(payload, null, 2));

    // 2. Dispatch Email Alert to info@pingstack.in
    try {
      const resend = getResend();
      if (resend) {
        const typeLabels: Record<string, string> = {
          bug: "🐛 Something isn't working",
          feature: "✨ Feature Request",
          suggestion: "💡 Suggestion",
          general: "💬 General Feedback"
        };

        const typeLabel = typeLabels[payload.type] || payload.type.toUpperCase();
        const priorityLabel = (payload.priority || 'important').replace('_', ' ').toUpperCase();

        await resend.emails.send({
          from: 'PingStack Feedback <info@pingstack.in>',
          to: 'info@pingstack.in',
          subject: `[Pingstack Feedback] ${typeLabel} (${priorityLabel})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b; background: #ffffff;">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">New Customer Feedback</h2>
                <span style="background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">${payload.type}</span>
              </div>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #334155;">Customer Message:</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #0f172a;">${payload.message}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 120px; font-weight: 500;">Priority:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${priorityLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Page Context:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;"><code>${payload.page || 'Dashboard'}</code></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Customer Email:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${payload.email ? `<a href="mailto:${payload.email}" style="color: #4f46e5;">${payload.email}</a>` : 'Not provided (Anonymous)'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Tenant ID:</td>
                  <td style="padding: 6px 0; font-family: monospace; font-size: 11px; color: #64748b;">${payload.tenant_id || 'N/A'}</td>
                </tr>
              </table>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
                Submitted via Pingstack Global Floating UI &bull; ${new Date().toLocaleString()}
              </div>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.warn('[Feedback API] Email notification failed (non-blocking):', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback received and recorded successfully'
    });
  } catch (error: unknown) {
    console.error('[Feedback API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while saving feedback';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
