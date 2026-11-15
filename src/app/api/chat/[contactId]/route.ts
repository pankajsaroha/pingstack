import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!userId) return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { contactId } = await params;

  const { hasWorkspacePermission, getUserTeamIdsServer, getEffectiveWorkspaceRole } = await import('@/lib/server/teams');
  const canViewInbox = await hasWorkspacePermission(userId, tenantId, 'inbox_view');
  if (!canViewInbox) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to view conversations.', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const effectiveRole = await getEffectiveWorkspaceRole(userId, tenantId);
  const isWorkspaceAdmin = effectiveRole === 'admin';
  if (!isWorkspaceAdmin) {
    const { data: assignment } = await db.from('conversation_assignments').select('team_id, assigned_user_id').eq('tenant_id', tenantId).eq('contact_id', contactId).maybeSingle();
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

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const before = searchParams.get('before');

  // Resolve contact by ID or phone number
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId);
  let contact: any = null;

  if (isUuid) {
    const { data } = await db
      .from('contacts')
      .select('id, phone_number')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    contact = data;
  }

  if (!contact) {
    const cleanId = contactId.replace(/\D/g, '');
    const { data } = await db
      .from('contacts')
      .select('id, phone_number')
      .eq('tenant_id', tenantId)
      .or(`phone_number.eq.${contactId},phone_number.eq.${cleanId},phone_number.eq.+${cleanId}`)
      .maybeSingle();
    contact = data;
  }

  const phoneVariants: string[] = [];
  const targetPhone = contact?.phone_number || contactId;
  if (targetPhone) {
    const raw = String(targetPhone).trim();
    const clean = raw.replace(/\D/g, '');
    if (raw) phoneVariants.push(raw);
    if (clean && clean !== raw) phoneVariants.push(clean);
    if (clean) phoneVariants.push(`+${clean}`);
  }

  let query = db.from('messages')
    .select('*')
    .eq('tenant_id', tenantId);

  const orConditions: string[] = [];
  if (contact?.id) {
    orConditions.push(`contact_id.eq.${contact.id}`);
  }
  if (isUuid && contactId !== contact?.id) {
    orConditions.push(`contact_id.eq.${contactId}`);
  }
  phoneVariants.forEach((p) => {
    orConditions.push(`phone_number.eq.${p}`);
  });

  if (orConditions.length > 0) {
    const uniqueConditions = Array.from(new Set(orConditions));
    query = query.or(uniqueConditions.join(','));
  } else {
    query = query.eq('contact_id', contactId);
  }

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-heal unlinked campaign messages matching this contact in the background
  if (contact && data && data.length > 0) {
    const unlinkedIds = data.filter((m: any) => !m.contact_id).map((m: any) => m.id);
    if (unlinkedIds.length > 0) {
      void db.from('messages').update({ contact_id: contact.id }).in('id', unlinkedIds).then(() => {}, () => {});
    }
  }

  // Return reversed to maintain chronological order in UI
  return NextResponse.json(data?.reverse() || []);
}

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!userId) return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });

  const { contactId } = await params;
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { hasWorkspacePermission, getUserTeamIdsServer, getEffectiveWorkspaceRole } = await import('@/lib/server/teams');
  const canReply = await hasWorkspacePermission(userId, tenantId, 'inbox_reply');
  if (!canReply) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to reply to conversations.', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const effectiveRole = await getEffectiveWorkspaceRole(userId, tenantId);
  const isWorkspaceAdmin = effectiveRole === 'admin';
  if (!isWorkspaceAdmin) {
    const { data: assignment } = await db.from('conversation_assignments').select('team_id, assigned_user_id').eq('tenant_id', tenantId).eq('contact_id', contactId).maybeSingle();
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

  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: 'Message content required' }, { status: 400 });

  // Resolve contact by UUID or phone
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

  // WHATSAPP 24-HOUR WINDOW ENFORCEMENT
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
  const windowLimit = 24 * 60 * 60 * 1000; // 24 hours in ms

  if (!lastReceived) {
    return NextResponse.json({ 
      error: 'First-time Engagement: You must send an approved WhatsApp Template to initiate a conversation with this contact.',
      code: 'WINDOW_NEVER_OPENED'
    }, { status: 403 });
  }

  const lastReceivedDate = new Date(lastReceived);
  const timeSinceLastMessage = now.getTime() - lastReceivedDate.getTime();

  if (timeSinceLastMessage > windowLimit) {
    return NextResponse.json({ 
      error: '24-Hour Window Closed: It\'s been over 24 hours since the customer last messaged you. Please send an approved Template to re-open the session.',
      code: 'WINDOW_CLOSED'
    }, { status: 403 });
  }

  const insertData = {
    tenant_id: tenantId,
    contact_id: contact?.id || null,
    phone_number: recipientPhone,
    direction: 'outbound',
    content: content,
    status: 'pending',
    message_type: 'text'
  };

  let { data: msg, error } = await db.from('messages').insert(insertData).select().single();

  if (error && error.message.includes('message_type')) {
    const { message_type, ...fallback } = insertData;
    const { data: retryData, error: retryErr } = await db.from('messages').insert(fallback).select().single();
    msg = retryData;
    error = retryErr;
  }

  if (error || !msg) return NextResponse.json({ error: 'Failed' }, { status: 500 });

  const { messageQueue } = await import('@/lib/queue');
  console.log(`[Queue] Adding direct message job to Redis for phone ${recipientPhone}...`);
  await messageQueue.add('send-whatsapp', {
    messageId: msg.id,
    phone: recipientPhone,
    isDirectText: true,
    textContent: content
  });
  console.log(`✅ [Queue] Successfully pushed direct message to Redis.`);

  return NextResponse.json(msg);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!userId) return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { contactId } = await params;

  const { hasWorkspacePermission, getUserTeamIdsServer, getEffectiveWorkspaceRole } = await import('@/lib/server/teams');
  const canManageInbox = await hasWorkspacePermission(userId, tenantId, 'inbox_reply');
  if (!canManageInbox) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to delete conversations.', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const effectiveRole = await getEffectiveWorkspaceRole(userId, tenantId);
  const isWorkspaceAdmin = effectiveRole === 'admin';
  if (!isWorkspaceAdmin) {
    const { data: assignment } = await db.from('conversation_assignments').select('team_id, assigned_user_id').eq('tenant_id', tenantId).eq('contact_id', contactId).maybeSingle();
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

  try {
    const cleanId = contactId.replace(/\D/g, '');
    const phoneVars = Array.from(new Set([contactId, cleanId, `+${cleanId}`].filter(Boolean)));
    const orConditions = [`contact_id.eq.${contactId}`, ...phoneVars.map((p) => `phone_number.eq.${p}`)];

    const { error } = await db
      .from('messages')
      .delete()
      .eq('tenant_id', tenantId)
      .or(orConditions.join(','));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Conversation Error:', err);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}

