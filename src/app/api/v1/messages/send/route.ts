import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiKey } from '@/lib/api-auth';
import { messageQueue } from '@/lib/queue';
import { checkLimit, incrementUsage } from '@/lib/limits';
import { enforceRateLimit } from '@/lib/rate-limit';

type SendRequestBody = {
  to?: string;
  template?: string;
  language?: string;
  parameters?: string[];
};

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const tenantId = await authenticateApiKey(authHeader);

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or missing API key' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  try {
    // Enforce API Rate limit
    const limitCheck = await enforceRateLimit(tenantId, 'send_message');
    if (limitCheck.limited && limitCheck.response) {
      return limitCheck.response;
    }

    const body = (await req.json()) as SendRequestBody;
    const { to, template: templateName, language = 'en_US', parameters = [] } = body;

    // Check if the Meta connection is active
    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('status')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const isSandbox = !whatsappAccount || whatsappAccount.status !== 'ACTIVE';

    // Validate inputs
    if (!to || !templateName) {
      return NextResponse.json({ error: 'Missing parameters. "to" (phone number) and "template" (template name) are required.' }, { status: 400 });
    }

    // Normalize phone number (digits only)
    const normalizedPhone = String(to).replace(/\D/g, '');
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number format. Provide a valid mobile number with country code.' }, { status: 400 });
    }

    // Check plan campaigns limit
    const canSend = await checkLimit(tenantId, 'campaigns');
    if (!canSend) {
      return NextResponse.json({ error: 'Upgrade required. Daily campaign/outbound limits reached.' }, { status: 403 });
    }

    // Lookup Template by name and tenant_id
    const { data: template, error: tErr } = await db
      .from('templates')
      .select('id, name, language, content, status')
      .eq('name', templateName)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!template) {
      return NextResponse.json({ error: `Template '${templateName}' not found in your account.` }, { status: 404 });
    }
    
    // In live mode, we only allow APPROVED templates. In sandbox, we allow testing with pending/drafts as well
    if (!isSandbox && template.status !== 'APPROVED') {
      return NextResponse.json({ error: `Template '${templateName}' is currently '${template.status}'. Messages can only be sent using APPROVED templates.` }, { status: 400 });
    }

    // Lookup or register contact dynamically
    let contactId: string;
    const { data: existingContact } = await db
      .from('contacts')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create contact on the fly
      const { data: newContact, error: cErr } = await db
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          name: `API Client (${normalizedPhone})`,
          phone_number: normalizedPhone
        })
        .select('id')
        .single();

      if (cErr || !newContact) {
        throw new Error(`Failed to auto-register contact: ${cErr?.message}`);
      }
      contactId = newContact.id;
    }

    // Prepare outbound message
    const messageInsert: any = {
      tenant_id: tenantId,
      contact_id: contactId,
      phone_number: normalizedPhone,
      status: isSandbox ? 'sandbox' : 'pending',
      content: template.content,
      direction: 'outbound',
      message_type: 'template',
      variables: parameters
    };

    let { data: msg, error: mErr } = await db
      .from('messages')
      .insert(messageInsert)
      .select('id')
      .single();

    // Fallback if column message_type is missing in legacy schema
    if (mErr && mErr.message.includes('message_type')) {
      const { message_type, ...fallback } = messageInsert;
      const { data: retryData, error: retryErr } = await db
        .from('messages')
        .insert(fallback)
        .select('id')
        .single();
      msg = retryData;
      mErr = retryErr;
    }

    if (mErr || !msg) {
      throw new Error(`Failed to create outbound message: ${mErr?.message}`);
    }

    await incrementUsage(tenantId, 'campaigns');

    if (isSandbox) {
      return NextResponse.json({
        success: true,
        message_id: msg.id,
        status: 'sandbox_delivered',
        note: 'Sandbox Mode: This message was mock-delivered because your Meta WhatsApp Account setup is pending.'
      });
    }

    // Queue sending job to Redis via BullMQ queue (Live Mode only)
    await messageQueue.add('send-whatsapp', {
      messageId: msg.id,
      phone: normalizedPhone,
      templateId: template.name,
      templateLanguage: template.language || language,
      params: parameters.map(p => ({ type: 'text', text: String(p) })),
      isDirectText: false
    });

    return NextResponse.json({
      success: true,
      message_id: msg.id,
      status: 'queued'
    });

  } catch (err: any) {
    console.error('[API Messages Send] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
