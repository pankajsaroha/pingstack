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

export interface WorkspaceInvitationEmailParams {
  email: string;
  workspaceName: string;
  inviterName?: string;
  role: 'admin' | 'member';
  teams?: { name: string; color?: string }[];
  inviteUrl: string;
  expiresAt: string;
}

/**
 * Sends a branded workspace invitation email via Resend.
 * Returns { success, data, error } without throwing unhandled exceptions.
 */
export const sendWorkspaceInvitationEmail = async ({
  email,
  workspaceName,
  inviterName,
  role,
  teams = [],
  inviteUrl,
  expiresAt,
}: WorkspaceInvitationEmailParams): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const resend = getResend();
    const roleLabel = role === 'admin' ? 'Workspace Admin' : 'Team Member';
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const teamsHtml = teams.length > 0
      ? teams.map(t => `<span style="display:inline-block; padding:3px 8px; border-radius:6px; background-color:${t.color || '#4f46e5'}20; color:${t.color || '#4f46e5'}; font-size:11px; font-weight:700; margin-right:4px;">${t.name}</span>`).join(' ')
      : '<span style="color:#71717a; font-style:italic;">No team assigned yet (General workspace access)</span>';

    const inviterHeader = inviterName ? `${inviterName} has invited you` : 'You have been invited';

    const { data, error } = await resend.emails.send({
      from: 'PingStack <info@pingstack.in>',
      to: email,
      subject: `Invitation to join ${workspaceName} on PingStack`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; color: #18181b;">
          <div style="background-color: #09090b; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">PingStack</h1>
            <p style="color: #a1a1aa; font-size: 13px; margin: 6px 0 0 0;">WhatsApp Cloud Business Automation</p>
          </div>
          
          <div style="padding: 32px 24px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #18181b; margin: 0 0 12px 0;">
              ${inviterHeader} to join <strong>${workspaceName}</strong>
            </h2>
            <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0;">
              You have been granted access as a <strong>${roleLabel}</strong>. Collaborate with your team to broadcast WhatsApp campaigns, manage contacts, and reply to customer inquiries in a shared multi-agent inbox.
            </p>

            <div style="background-color: #f4f4f5; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #71717a; width: 35%;">Workspace:</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600;">${workspaceName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a;">Workspace Role:</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600;">${roleLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a;">Assigned Teams:</td>
                  <td style="padding: 6px 0;">${teamsHtml}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a;">Expires On:</td>
                  <td style="padding: 6px 0; color: #dc2626; font-weight: 600;">${formattedExpiry}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                Accept Invitation &rarr;
              </a>
            </div>

            <p style="font-size: 12px; color: #a1a1aa; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${inviteUrl}" style="color: #4f46e5; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>

          <div style="border-top: 1px solid #f4f4f5; background-color: #fafafa; padding: 20px 24px; text-align: center; font-size: 11px; color: #a1a1aa;">
            &copy; ${new Date().getFullYear()} PingStack. If you did not expect this invitation, you can safely ignore this email.
          </div>
        </div>
      `
    });

    if (error) {
      console.error('[sendWorkspaceInvitationEmail] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[sendWorkspaceInvitationEmail] Exception:', err);
    return { success: false, error: err?.message || 'Email dispatch failed' };
  }
};
