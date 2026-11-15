import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const limitCheck = await enforceRateLimit(tenantId, 'read_list');
    if (limitCheck.limited && limitCheck.response) {
      return limitCheck.response;
    }

    const [latestMessagesRes, unlinkedMessagesRes, unreadCountsRes, unreadRawRes] = await Promise.all([
      db.from('conversations_view').select('*').eq('tenant_id', tenantId),
      db.from('messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('contact_id', null)
        .or('direction.eq.inbound,campaign_id.is.null')
        .order('created_at', { ascending: false })
        .limit(500),
      db.from('unread_counts_view').select('*').eq('tenant_id', tenantId),
      db.from('messages')
        .select('contact_id, phone_number')
        .eq('tenant_id', tenantId)
        .eq('direction', 'inbound')
        .eq('status', 'received')
    ]);

    if (latestMessagesRes.error) return NextResponse.json({ error: latestMessagesRes.error.message }, { status: 500 });
    
    const viewMessages = latestMessagesRes.data || [];
    const unlinkedMessages = unlinkedMessagesRes.data || [];

    const candidateContactIds = Array.from(new Set(viewMessages.map((m: any) => m.contact_id).filter(Boolean)));
    const unlinkedPhones = Array.from(new Set(unlinkedMessages.map((m: any) => m.phone_number).filter(Boolean)));
    const unlinkedCleanPhones = unlinkedPhones.map((p: string) => p.replace(/\D/g, '')).filter(Boolean);

    // Build contacts query covering both candidate contact IDs and unlinked phone numbers
    const phoneFilter = unlinkedCleanPhones.length > 0
      ? unlinkedCleanPhones.map((p: string) => `phone_number.eq.${p},phone_number.eq.+${p}`).join(',')
      : '';

    let contactsPromise: any;
    if (candidateContactIds.length > 0 && phoneFilter) {
      contactsPromise = db.from('contacts').select('*').eq('tenant_id', tenantId).or(`id.in.(${candidateContactIds.join(',')}),${phoneFilter}`);
    } else if (candidateContactIds.length > 0) {
      contactsPromise = db.from('contacts').select('*').eq('tenant_id', tenantId).in('id', candidateContactIds);
    } else if (phoneFilter) {
      contactsPromise = db.from('contacts').select('*').eq('tenant_id', tenantId).or(phoneFilter);
    } else {
      contactsPromise = Promise.resolve({ data: [], error: null });
    }

    const [contactsRes, activeInteractionsRes, assignmentsMap] = await Promise.all([
      contactsPromise,
      candidateContactIds.length > 0
        ? db.from('messages')
            .select('contact_id')
            .in('contact_id', candidateContactIds)
            .eq('tenant_id', tenantId)
            .or('direction.eq.inbound,campaign_id.is.null')
        : Promise.resolve({ data: [], error: null }),
      import('@/lib/server/teams').then(m => m.getConversationAssignmentsServer(tenantId, candidateContactIds)).catch(() => new Map())
    ]);

    if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });

    const contacts = contactsRes.data || [];
    const unreadCounts = unreadCountsRes.data || [];
    const unreadRaw = unreadRawRes.data || [];

    const activeContactIds = new Set<string>(
      (activeInteractionsRes.data || []).map((m: any) => m.contact_id)
    );

    // Map contacts by ID and by clean phone for fast lookup
    const contactMap = new Map<string, any>();
    const contactByPhone = new Map<string, any>();
    contacts.forEach((c: any) => {
      contactMap.set(c.id, c);
      if (c.phone_number) {
        const clean = c.phone_number.replace(/\D/g, '');
        if (clean) {
          contactByPhone.set(clean, c);
          contactByPhone.set(c.phone_number, c);
        }
      }
    });

    // Map unread counts by contact_id and by clean phone
    const unreadCountMap = new Map<string, number>();
    unreadCounts.forEach((u: any) => {
      if (u.contact_id) {
        unreadCountMap.set(u.contact_id, u.unread_count || 0);
      }
    });
    unreadRaw.forEach((m: any) => {
      if (m.contact_id) {
        if (!unreadCountMap.has(m.contact_id)) {
          unreadCountMap.set(m.contact_id, (unreadCountMap.get(m.contact_id) || 0) + 1);
        }
      } else if (m.phone_number) {
        const clean = m.phone_number.replace(/\D/g, '');
        if (clean) {
          unreadCountMap.set(clean, (unreadCountMap.get(clean) || 0) + 1);
        }
      }
    });

    // Track latest message and contact per conversation
    const convMap = new Map<string, { latestMessage: any; contact: any }>();

    // 1. Process viewMessages (for contacts with contact_id)
    viewMessages.forEach((m: any) => {
      if (!m.contact_id) return;
      if (!activeContactIds.has(m.contact_id)) return; // Exclude campaign-only broadcasts without replies

      const contact = contactMap.get(m.contact_id) || {
        id: m.contact_id,
        phone_number: m.phone_number || '',
        name: 'Client ' + m.contact_id.slice(-4)
      };

      convMap.set(m.contact_id, {
        latestMessage: m,
        contact
      });
    });

    // 2. Process unlinkedMessages (for unsaved senders and deleted contacts)
    unlinkedMessages.forEach((m: any) => {
      if (!m.phone_number) return;
      const cleanPhone = m.phone_number.replace(/\D/g, '');
      const existingContact = contactByPhone.get(cleanPhone) || (m.contact_id ? contactMap.get(m.contact_id) : null);

      if (existingContact) {
        const existing = convMap.get(existingContact.id);
        if (!existing) {
          convMap.set(existingContact.id, {
            latestMessage: m,
            contact: existingContact
          });
        } else if (new Date(m.created_at) > new Date(existing.latestMessage.created_at)) {
          existing.latestMessage = m;
        }
      } else {
        const convKey = cleanPhone || m.phone_number;
        const existing = convMap.get(convKey);
        if (!existing) {
          convMap.set(convKey, {
            latestMessage: m,
            contact: {
              id: convKey,
              phone_number: m.phone_number,
              name: m.phone_number,
              isSavedContact: false
            }
          });
        } else if (new Date(m.created_at) > new Date(existing.latestMessage.created_at)) {
          existing.latestMessage = m;
        }
      }
    });

    const visibleConversations = Array.from(convMap.values());

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const { hasWorkspacePermission, getUserTeamIdsServer, getEffectiveWorkspaceRole } = await import('@/lib/server/teams');
    const canViewInbox = await hasWorkspacePermission(userId, tenantId, 'inbox_view');
    if (!canViewInbox) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view inbox conversations.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    const role = await getEffectiveWorkspaceRole(userId, tenantId);
    const isWorkspaceAdmin = role === 'admin';
    let userTeamIds: string[] = [];
    if (!isWorkspaceAdmin) {
      userTeamIds = await getUserTeamIdsServer(userId, tenantId);
    }

    const { searchParams } = new URL(req.url);
    const requestedTeamId = searchParams.get('teamId');

    // If client requested a specific team filter, verify membership
    if (requestedTeamId) {
      if (!isWorkspaceAdmin && !userTeamIds.includes(requestedTeamId)) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this team.', code: 'PERMISSION_DENIED' }, { status: 403 });
      }
    }

    const conversations = visibleConversations
      .map(({ contact, latestMessage }: any) => {
        const cleanPhone = contact.phone_number ? contact.phone_number.replace(/\D/g, '') : '';
        const unreadCount = unreadCountMap.get(contact.id) || (cleanPhone ? unreadCountMap.get(cleanPhone) : 0) || 0;
        const assignment = assignmentsMap.get(contact.id) || (cleanPhone ? assignmentsMap.get(cleanPhone) : null) || null;
        return {
          contact,
          latestMessage,
          unreadCount,
          assignment
        };
      })
      .filter((conv: any) => {
        const a = conv.assignment;

        // If client requested a specific team, filter to that team
        if (requestedTeamId) {
          return a?.team_id === requestedTeamId;
        }

        // Workspace Admin can see all tenant conversations
        if (isWorkspaceAdmin) return true;

        // Team Member filtering:
        // 1. If assigned to a team:
        if (a && a.team_id) {
          const isAssignedToUser = a.assigned_user_id === userId;
          const isInAssignedTeam = userTeamIds.includes(a.team_id);
          // Member can see conversations of their authorized teams or directly assigned to them
          return isAssignedToUser || isInAssignedTeam;
        }

        // 2. If assigned directly to another agent with no team:
        if (a && a.assigned_user_id && !a.team_id) {
          return a.assigned_user_id === userId;
        }

        // 3. Unassigned queue (no team, no agent): accessible to member
        return true;
      })
      .sort((a: any, b: any) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime());

    return NextResponse.json(conversations);

  } catch (err: any) {
    console.error('Conversations Load Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load conversations' }, { status: 500 });
  }
}
