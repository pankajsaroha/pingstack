import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';
import { PLANS, PlanType, getActivePlanType } from '@/lib/plans';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { contactId: rawId } = await params;
  const contactId = rawId?.trim();
  const url = new URL(req.url);
  const messageId = url.searchParams.get('messageId');

  if (!contactId || !messageId) {
    return NextResponse.json({ error: 'Missing contactId or messageId' }, { status: 400 });
  }

  try {
    // 1. Authorization: Verify inbox_view permission
    const { hasWorkspacePermission, getUserTeamIdsServer, getEffectiveWorkspaceRole } = await import('@/lib/server/teams');
    const canViewInbox = await hasWorkspacePermission(userId, tenantId, 'inbox_view');
    if (!canViewInbox) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view conversation attachments.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    // 2. Authorization: Verify Conversation Access
    const effectiveRole = await getEffectiveWorkspaceRole(userId, tenantId);
    const isWorkspaceAdmin = effectiveRole === 'admin';
    if (!isWorkspaceAdmin) {
      const { data: assignment } = await db
        .from('conversation_assignments')
        .select('team_id, assigned_user_id')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (assignment) {
        const userTeams = await getUserTeamIdsServer(userId, tenantId);
        const isAssignedDirectly = assignment.assigned_user_id === userId;
        const isInAssignedTeam = assignment.team_id ? userTeams.includes(assignment.team_id) : false;

        if (assignment.team_id && !isInAssignedTeam && !isAssignedDirectly) {
          return NextResponse.json({ error: 'Forbidden: You do not have access to this conversation.', code: 'PERMISSION_DENIED' }, { status: 403 });
        }
        if (assignment.assigned_user_id && !assignment.team_id && !isAssignedDirectly) {
          return NextResponse.json({ error: 'Forbidden: You do not have access to this conversation.', code: 'PERMISSION_DENIED' }, { status: 403 });
        }
      }
    }

    // 3. Locate message attachment
    const cleanId = contactId.replace(/\D/g, '');
    const phoneVars = Array.from(new Set([contactId, cleanId, `+${cleanId}`].filter(Boolean)));
    const orConditions = [`contact_id.eq.${contactId}`, ...phoneVars.map((p) => `phone_number.eq.${p}`)];

    const { data: message, error: msgError } = await db
      .from('messages')
      .select('id, media_path, message_type, content')
      .eq('id', messageId)
      .eq('tenant_id', tenantId)
      .or(orConditions.join(','))
      .maybeSingle();

    if (msgError || !message || !message.media_path) {
      return NextResponse.json({ error: 'Attachment not found or unavailable' }, { status: 404 });
    }

    // 4. Generate 1-hour signed URL from private storage bucket
    const { data: signedData, error: signedError } = await db.storage
      .from('chat-media')
      .createSignedUrl(message.media_path, 3600);

    if (signedError || !signedData?.signedUrl) {
      console.error('[Attachment API] Failed to create signed URL:', signedError);
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    // If browser requested direct redirection, redirect to signed URL
    const acceptHeader = req.headers.get('accept') || '';
    if (url.searchParams.has('download') || acceptHeader.includes('text/html')) {
      return NextResponse.redirect(signedData.signedUrl, 307);
    }

    return NextResponse.json({
      success: true,
      url: signedData.signedUrl,
      fileName: message.media_path.split('/').pop()?.replace(/^\d+_/, ''),
      messageType: message.message_type
    });
  } catch (err: any) {
    console.error('[Attachment GET API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}


export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { contactId: rawId } = await params;
  const contactId = rawId?.trim();
  
  try {
    const limitCheck = await enforceRateLimit(tenantId, 'file_upload');
    if (limitCheck.limited && limitCheck.response) {
      return limitCheck.response;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string;
    const fileName = formData.get('fileName') as string;
    const caption = formData.get('caption') as string || '';

    if (!file || !mediaType) {
      return NextResponse.json({ error: 'Missing file or media details' }, { status: 400 });
    }

    const fileSize = file.size;

    // 1. Get Tenant and Plan
    const { data: tenant, error: tError } = await db.from('tenants')
      .select('id, plan_type, storage_usage_bytes')
      .eq('id', tenantId)
      .single();

    if (tError || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const planLimits = PLANS[getActivePlanType(tenant.plan_type)];
    const currentUsageBytes = Number(tenant.storage_usage_bytes || 0);
    const maxSizeBytes = planLimits.maxStorageMb * 1024 * 1024;

    // 2. Check Plan Limits
    const maxFileBytes = planLimits.maxFileSizeMb * 1024 * 1024;
    if (fileSize > maxFileBytes) {
      return NextResponse.json({ 
        error: `File too large. Your plan allows up to ${planLimits.maxFileSizeMb}MB per file.` 
      }, { status: 413 });
    }

    if (currentUsageBytes + fileSize > maxSizeBytes) {
      return NextResponse.json({ 
        error: `Storage quota exceeded. You have ${Math.round(currentUsageBytes / 1024 / 1024)}MB / ${planLimits.maxStorageMb}MB used.` 
      }, { status: 403 });
    }

    // 3. Upload to Supabase Storage (Server-Side)
    const storageFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `${tenant.id}/${storageFileName}`;
    
    const { error: uploadError } = await db.storage
      .from('chat-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 4. Resolve contact and verify 24h WhatsApp window
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId);
    let contact: any = null;

    if (isUuid) {
      const { data } = await db.from('contacts')
        .select('id, phone_number, last_received_at')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      contact = data;
    }

    if (!contact) {
      const cleanId = contactId.replace(/\D/g, '');
      const { data } = await db.from('contacts')
        .select('id, phone_number, last_received_at')
        .eq('tenant_id', tenantId)
        .or(`phone_number.eq.${contactId},phone_number.eq.${cleanId},phone_number.eq.+${cleanId}`)
        .maybeSingle();
      contact = data;
    }

    const recipientPhone = contact?.phone_number || contactId;
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Valid recipient phone number is required' }, { status: 400 });
    }

    // Check latest inbound message from messages table for ground truth
    const phoneVariants = Array.from(new Set([recipientPhone, cleanPhone, `+${cleanPhone}`]));
    let inboundCheck = db.from('messages')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .eq('direction', 'inbound');

    if (contact?.id) {
      const orConds = [`contact_id.eq.${contact.id}`, ...phoneVariants.map((p) => `phone_number.eq.${p}`)];
      inboundCheck = inboundCheck.or(orConds.join(','));
    } else {
      inboundCheck = inboundCheck.in('phone_number', phoneVariants);
    }

    const { data: latestInboundMsg } = await inboundCheck
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastReceived = latestInboundMsg?.created_at || contact?.last_received_at;
    const now = new Date();
    const isWindowClosed = !lastReceived || (now.getTime() - new Date(lastReceived).getTime() > 24 * 60 * 60 * 1000);

    if (isWindowClosed) {
      return NextResponse.json({ 
        error: 'The 24-hour window for free-form messages is closed. Please send a template message first.',
        code: 'WINDOW_CLOSED'
      }, { status: 403 });
    }

    // 5. Create message record
    const { data: msg, error: mError } = await db.from('messages').insert({
      tenant_id: tenantId,
      contact_id: contact?.id || null,
      phone_number: recipientPhone,
      direction: 'outbound',
      content: caption || '',
      message_type: mediaType,
      media_path: filePath,
      media_size_bytes: fileSize,
      status: 'pending'
    }).select().single();

    if (mError) throw mError;

    // 6. Update tenant storage tally
    await db.from('tenants')
      .update({ storage_usage_bytes: currentUsageBytes + fileSize })
      .eq('id', tenantId);

    // 7. Queue the job
    await messageQueue.add('send-whatsapp', {
      messageId: msg.id,
      phone: recipientPhone,
      isMedia: true,
      mediaType,
      mediaPath: filePath,
      caption: caption,
      fileName: fileName
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    console.error('Attachment Controller Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
