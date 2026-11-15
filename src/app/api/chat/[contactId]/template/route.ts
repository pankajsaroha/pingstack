import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';
import { renderTemplateBody } from '@/lib/templates';
import { checkTemplateSendLimit, incrementTemplateSendUsage } from '@/lib/limits';

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { contactId } = await params;
  const body = await req.json();
  const { templateName, language, variables } = body;

  if (!templateName) return NextResponse.json({ error: 'Template name required' }, { status: 400 });

  try {
    // 0. Check daily template send limit
    const canSend = await checkTemplateSendLimit(tenantId, 1);
    if (!canSend) {
      return NextResponse.json({
        error: 'Daily template send limit reached for your plan. Please upgrade to Growth for 500 sends/day.',
        code: 'LIMIT_EXCEEDED'
      }, { status: 403 });
    }

    // 1. Get contact info (support UUID or phone number)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId);
    let contact: any = null;

    if (isUuid) {
      const { data } = await db.from('contacts')
        .select('id, name, phone_number')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      contact = data;
    }

    if (!contact) {
      const cleanId = contactId.replace(/\D/g, '');
      const { data } = await db.from('contacts')
        .select('id, name, phone_number')
        .eq('tenant_id', tenantId)
        .or(`phone_number.eq.${contactId},phone_number.eq.${cleanId},phone_number.eq.+${cleanId}`)
        .maybeSingle();
      contact = data;
    }

    const recipientPhone = contact?.phone_number || contactId;
    const recipientName = contact?.name || recipientPhone;
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Valid recipient phone number is required' }, { status: 400 });
    }

    // 2. Get the template content for the inbox record
    const { data: template } = await db.from('templates')
      .select('content')
      .eq('name', templateName)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    // 3. Resolve template body variables for exact inbox display
    const rawContent = template?.content || `[Template: ${templateName}]`;
    const resolvedContent = renderTemplateBody(rawContent, variables, {
      name: recipientName,
      phone: recipientPhone
    });

    // 4. Create the message record with the rendered content
    const { data: msg, error } = await db.from('messages').insert({
      tenant_id: tenantId,
      contact_id: contact?.id || null,
      phone_number: recipientPhone,
      direction: 'outbound',
      content: resolvedContent,
      message_type: 'template',
      variables: Array.isArray(variables) ? variables : (variables ? Object.values(variables) : []),
      status: 'pending'
    }).select().single();

    if (error) throw error;

    // 5. Format parameters for Meta WhatsApp payload
    const paramList: string[] = Array.isArray(variables)
      ? variables
      : (variables && typeof variables === 'object' ? Object.values(variables) : []);
    const metaParams = paramList.map(v => ({ type: 'text', text: String(v) }));
    const components = metaParams.length > 0 ? [{ type: 'body', parameters: metaParams }] : [];

    // 6. Queue the job
    console.log(`[Queue] Adding template message job to Redis for phone ${recipientPhone}...`);
    await messageQueue.add('send-whatsapp', {
      messageId: msg.id,
      phone: recipientPhone,
      templateId: templateName,
      templateLanguage: language || 'en_US',
      isDirectText: false,
      components,
      params: metaParams
    });

    await incrementTemplateSendUsage(tenantId, 1);

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    console.error('Send Template Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

