import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';

interface TimeSeriesRow {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  inbound: number;
}

interface FailureReason {
  code: string;
  title: string;
  count: number;
  percentage: number;
  explanation: string;
  recommendation: string;
}

interface TemplatePerformanceRow {
  templateName: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
}

interface TeamConversationRow {
  teamId: string;
  teamName: string;
  color: string;
  count: number;
  percentage: number;
}

interface TeamMessageActivityRow {
  teamId: string;
  teamName: string;
  color: string;
  inbound: number;
  outbound: number;
  total: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
}

interface TeamResponsePerformanceRow {
  teamId: string;
  teamName: string;
  color: string;
  respondedCount: number;
  unansweredCount: number;
  averageResponseMinutes: number | null;
  medianResponseMinutes: number | null;
  firstResponseMinutes: number | null;
}

interface MemberActivityRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  teamNames: string[];
  assignedConversations: number;
  outboundReplies: number;
  medianResponseMinutes: number | null;
  unansweredCount: number;
}

// Format ISO date to YYYY-MM-DD in workspace timezone
function getZonedDateKey(isoDate: string, timezone: string): string {
  try {
    const d = new Date(isoDate);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch {
    return isoDate.slice(0, 10);
  }
}

// Format ISO date to 0..23 hour in workspace timezone
function getZonedHour(isoDate: string, timezone: string): number {
  try {
    const d = new Date(isoDate);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const hourPart = parts.find(p => p.type === 'hour');
    const h = hourPart ? parseInt(hourPart.value, 10) : d.getUTCHours();
    return isNaN(h) ? d.getUTCHours() : (h === 24 ? 0 : h);
  } catch {
    return new Date(isoDate).getUTCHours();
  }
}

// Generate hour labels (e.g. "12 AM", "1 AM", ..., "12 PM", "11 PM")
function getHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// Categorize and resolve message failure error strings deterministically
function categorizeFailureReason(rawError: string | null): { code: string; title: string; explanation: string; recommendation: string } {
  const err = (rawError || '').toLowerCase();

  if (err.includes('131049') || err.includes('ecosystem health')) {
    return {
      code: '131049',
      title: 'Meta Ecosystem Health Protection',
      explanation: 'Meta blocked message delivery to protect user engagement due to recipient marketing frequency capping or sandbox restrictions.',
      recommendation: 'Target engaged contacts who regularly interact with your WhatsApp messages, or reduce marketing frequency.'
    };
  }

  if (err.includes('131026') || err.includes('undeliverable') || err.includes('not on whatsapp')) {
    return {
      code: '131026',
      title: 'Recipient Undeliverable / Inactive',
      explanation: 'Recipient phone number is invalid, inactive, or not registered on WhatsApp.',
      recommendation: 'Verify phone number country codes and remove dormant numbers from contact lists.'
    };
  }

  if (err.includes('133010') || err.includes('not registered') || err.includes('phone number not registered')) {
    return {
      code: '133010',
      title: 'Sender Phone Not Registered',
      explanation: 'The sender phone number certificate is not active or verified with Meta Cloud API.',
      recommendation: 'Click "Register Number" on your Dashboard or verify the 6-digit registration PIN in Meta Business Manager.'
    };
  }

  if (err.includes('131031') || err.includes('131042') || err.includes('payment') || err.includes('eligibility')) {
    return {
      code: '131031',
      title: 'Meta Payment Method Required',
      explanation: 'Meta Cloud API requires a valid payment method attached to your WhatsApp Business Account (WABA).',
      recommendation: 'Attach a credit/debit card to your WABA in Meta Business Manager (WhatsApp Accounts → Payment Methods).'
    };
  }

  if (err.includes('130429') || err.includes('rate limit') || err.includes('80007') || err.includes('throughput')) {
    return {
      code: '130429',
      title: 'Meta Messaging Rate Limit',
      explanation: 'Message dispatch exceeded Meta Cloud API tier throughput or concurrency limit.',
      recommendation: 'PingStack automatically queues and paces campaign batches. Tier limits increase automatically with positive quality rating.'
    };
  }

  if (err.includes('window_closed') || err.includes('24-hour window') || err.includes('over 24 hours')) {
    return {
      code: 'WINDOW_CLOSED',
      title: '24-Hour Customer Care Window Closed',
      explanation: 'It has been over 24 hours since the customer last sent an inbound message.',
      recommendation: 'Send an approved Meta Template to re-open the conversation window.'
    };
  }

  if (err.includes('missing credentials') || err.includes('unauthorized') || err.includes('invalid access token') || err.includes('error 190')) {
    return {
      code: '190',
      title: 'Authentication / Token Expired',
      explanation: 'Meta System User access token has expired or permissions have been revoked.',
      recommendation: 'Re-authenticate with Meta Embedded Signup or refresh your access token in Dashboard.'
    };
  }

  if (err.includes('network') || err.includes('timeout') || err.includes('500') || err.includes('503')) {
    return {
      code: 'NETWORK_ERROR',
      title: 'Transient Network / Provider Error',
      explanation: 'Temporary network glitch or Meta Graph API outage.',
      recommendation: 'PingStack automatic retry handling retries transient errors safely.'
    };
  }

  return {
    code: 'GENERIC_FAILURE',
    title: 'Other Dispatch Failure',
    explanation: rawError || 'Message failed during dispatch or transmission.',
    recommendation: 'Review specific error details or contact PingStack support if persistent.'
  };
}

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    // 1. Authorize Pro plan access
    const allowed = await isFeatureAllowed(tenantId, 'advanced_analytics');
    if (!allowed) {
      return NextResponse.json({
        error: 'Advanced Analytics & Reporting is a Pro-exclusive feature. Please upgrade to Pro for deep messaging analytics.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    // 2. Fetch tenant for timezone setting
    const { data: tenant } = await db
      .from('tenants')
      .select('id, name, timezone, plan')
      .eq('id', tenantId)
      .maybeSingle();

    const workspaceTimezone = tenant?.timezone || 'Asia/Kolkata';

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';
    const customStart = url.searchParams.get('startDate');
    const customEnd = url.searchParams.get('endDate');
    const teamFilter = url.searchParams.get('teamId') || 'all';
    const memberFilter = url.searchParams.get('memberId') || 'all';
    const isCsvExport = url.searchParams.get('export') === 'csv';

    // 3. Determine precise Date Range in Workspace Timezone
    let startDate: Date;
    let endDate: Date = new Date();

    if (range === 'today') {
      const nowZoned = getZonedDateKey(endDate.toISOString(), workspaceTimezone);
      startDate = new Date(`${nowZoned}T00:00:00.000Z`);
    } else if (range === '7d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '90d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
    } else if (range === 'custom' && customStart) {
      startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        if (customEnd.length === 10) {
          endDate.setHours(23, 59, 59, 999);
        }
      }
    } else {
      // Default 30d
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // 4. Fetch Teams, Members, & Conversation Assignments in Parallel
    const [
      campaignsRes,
      templatesRes,
      teamsRes,
      teamMembersRes,
      usersRes,
      assignmentsRes
    ] = await Promise.all([
      db.from('campaigns')
        .select('id, name, template_id, status, created_at')
        .eq('tenant_id', tenantId),
      db.from('templates')
        .select('id, name, status, category')
        .eq('tenant_id', tenantId),
      db.from('teams')
        .select('id, name, color, is_active, created_at')
        .eq('tenant_id', tenantId),
      db.from('team_members')
        .select('team_id, user_id')
        .eq('tenant_id', tenantId),
      db.from('users')
        .select('id, name, email, role, workspace_role')
        .eq('tenant_id', tenantId),
      db.from('conversation_assignments')
        .select('contact_id, team_id, assigned_user_id, status, created_at, updated_at')
        .eq('tenant_id', tenantId)
    ]);

    const campaigns = campaignsRes.data || [];
    const templates = templatesRes.data || [];
    const teams = teamsRes.data || [];
    const teamMembers = teamMembersRes.data || [];
    const users = usersRes.data || [];
    const assignments = assignmentsRes.data || [];

    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    const templateMap = new Map(templates.map(t => [t.id, t]));
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const userMap = new Map(users.map(u => [u.id, u]));

    // Map Contact Assignments: contact_id -> { team_id, assigned_user_id, status }
    const contactAssignmentMap = new Map(assignments.map(a => [a.contact_id, a]));

    // Map User Teams: user_id -> Set of team_names
    const userTeamsMap = new Map<string, string[]>();
    teamMembers.forEach((tm: any) => {
      const t = teamMap.get(tm.team_id);
      if (t) {
        if (!userTeamsMap.has(tm.user_id)) userTeamsMap.set(tm.user_id, []);
        userTeamsMap.get(tm.user_id)!.push(t.name);
      }
    });

    // 5. Fetch messages in date range for this tenant in chunks
    let messages: any[] = [];
    let from = 0;
    const CHUNK_SIZE = 1000;

    while (true) {
      const { data: chunk, error: mErr } = await db
        .from('messages')
        .select('id, direction, status, created_at, campaign_id, contact_id, error, content, message_type')
        .eq('tenant_id', tenantId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .range(from, from + CHUNK_SIZE - 1);

      if (mErr) throw mErr;
      if (!chunk || chunk.length === 0) break;
      messages.push(...chunk);
      if (chunk.length < CHUNK_SIZE) break;
      from += CHUNK_SIZE;
    }

    // Filter messages if teamFilter or memberFilter is active
    let filteredMessages = messages;
    if (teamFilter !== 'all') {
      filteredMessages = filteredMessages.filter(msg => {
        if (!msg.contact_id) return false;
        const assign = contactAssignmentMap.get(msg.contact_id);
        return assign?.team_id === teamFilter;
      });
    }
    if (memberFilter !== 'all') {
      filteredMessages = filteredMessages.filter(msg => {
        if (!msg.contact_id) return false;
        const assign = contactAssignmentMap.get(msg.contact_id);
        return assign?.assigned_user_id === memberFilter;
      });
    }

    // 6. Initialize Continuous Zero-Filled Time Series
    const timeSeriesMap: Record<string, TimeSeriesRow> = {};
    const startKey = getZonedDateKey(startIso, workspaceTimezone);
    const endKey = getZonedDateKey(endIso, workspaceTimezone);

    const currDate = new Date(startDate);
    while (currDate <= endDate) {
      const dKey = getZonedDateKey(currDate.toISOString(), workspaceTimezone);
      if (!timeSeriesMap[dKey]) {
        timeSeriesMap[dKey] = { date: dKey, sent: 0, delivered: 0, read: 0, failed: 0, inbound: 0 };
      }
      currDate.setDate(currDate.getDate() + 1);
    }
    if (!timeSeriesMap[endKey]) {
      timeSeriesMap[endKey] = { date: endKey, sent: 0, delivered: 0, read: 0, failed: 0, inbound: 0 };
    }

    // 7. Initialize 24-Hour Activity Map (Workspace Timezone)
    const hourlyDistribution: Array<{ hour: number; label: string; count: number; inbound: number; outbound: number }> = [];
    for (let h = 0; h < 24; h++) {
      hourlyDistribution.push({
        hour: h,
        label: getHourLabel(h),
        count: 0,
        inbound: 0,
        outbound: 0
      });
    }

    // 8. Aggregation Variables
    let sentCount = 0;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;
    let inboundCount = 0;

    const failureReasonMap: Record<string, { count: number; info: { code: string; title: string; explanation: string; recommendation: string } }> = {};
    const templateStatsMap: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};
    const campaignStatsMap: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};

    // Group messages by contact_id
    const contactThreads: Record<string, any[]> = {};

    // Team message activity accumulator: teamId -> metrics
    const teamMsgStatsMap = new Map<string, { inbound: number; outbound: number; delivered: number; read: number; failed: number }>();
    teams.forEach(t => {
      teamMsgStatsMap.set(t.id, { inbound: 0, outbound: 0, delivered: 0, read: 0, failed: 0 });
    });
    // Unassigned team key
    teamMsgStatsMap.set('unassigned', { inbound: 0, outbound: 0, delivered: 0, read: 0, failed: 0 });

    // Member message activity accumulator: userId -> { outbound: number, responseTimes: number[], unanswered: number }
    const memberMsgStatsMap = new Map<string, { outbound: number; responseTimes: number[]; unanswered: number; assignedConvs: Set<string> }>();
    users.forEach(u => {
      memberMsgStatsMap.set(u.id, { outbound: 0, responseTimes: [], unanswered: 0, assignedConvs: new Set() });
    });

    filteredMessages.forEach((msg) => {
      const dateKey = getZonedDateKey(msg.created_at, workspaceTimezone);
      if (!timeSeriesMap[dateKey]) {
        timeSeriesMap[dateKey] = { date: dateKey, sent: 0, delivered: 0, read: 0, failed: 0, inbound: 0 };
      }

      const msgHour = getZonedHour(msg.created_at, workspaceTimezone);
      if (hourlyDistribution[msgHour]) {
        hourlyDistribution[msgHour].count++;
        if (msg.direction === 'inbound') {
          hourlyDistribution[msgHour].inbound++;
        } else {
          hourlyDistribution[msgHour].outbound++;
        }
      }

      // Track thread for response time calculation
      if (msg.contact_id) {
        if (!contactThreads[msg.contact_id]) contactThreads[msg.contact_id] = [];
        contactThreads[msg.contact_id].push(msg);

        // Attribution to Team
        const assign = contactAssignmentMap.get(msg.contact_id);
        const assignedTeamId = assign?.team_id || 'unassigned';
        const teamStats = teamMsgStatsMap.get(assignedTeamId);

        if (teamStats) {
          if (msg.direction === 'inbound') {
            teamStats.inbound++;
          } else {
            teamStats.outbound++;
            if (msg.status === 'delivered' || msg.status === 'read') teamStats.delivered++;
            if (msg.status === 'read') teamStats.read++;
            if (msg.status === 'failed') teamStats.failed++;
          }
        }

        // Attribution to Member
        if (assign?.assigned_user_id) {
          const mStats = memberMsgStatsMap.get(assign.assigned_user_id);
          if (mStats) {
            mStats.assignedConvs.add(msg.contact_id);
            if (msg.direction === 'outbound') {
              mStats.outbound++;
            }
          }
        }
      }

      if (msg.direction === 'inbound') {
        inboundCount++;
        timeSeriesMap[dateKey].inbound++;
      } else {
        // Outbound
        sentCount++;
        timeSeriesMap[dateKey].sent++;

        if (msg.status === 'delivered') {
          deliveredCount++;
          timeSeriesMap[dateKey].delivered++;
        } else if (msg.status === 'read') {
          deliveredCount++;
          readCount++;
          timeSeriesMap[dateKey].delivered++;
          timeSeriesMap[dateKey].read++;
        } else if (msg.status === 'failed') {
          failedCount++;
          timeSeriesMap[dateKey].failed++;

          const reason = categorizeFailureReason(msg.error);
          if (!failureReasonMap[reason.code]) {
            failureReasonMap[reason.code] = { count: 0, info: reason };
          }
          failureReasonMap[reason.code].count++;
        }

        // Campaign Attribution
        if (msg.campaign_id) {
          if (!campaignStatsMap[msg.campaign_id]) {
            campaignStatsMap[msg.campaign_id] = { sent: 0, delivered: 0, read: 0, failed: 0 };
          }
          campaignStatsMap[msg.campaign_id].sent++;
          if (msg.status === 'delivered' || msg.status === 'read') campaignStatsMap[msg.campaign_id].delivered++;
          if (msg.status === 'read') campaignStatsMap[msg.campaign_id].read++;
          if (msg.status === 'failed') campaignStatsMap[msg.campaign_id].failed++;

          const camp = campaignMap.get(msg.campaign_id);
          const tName = camp ? (templateMap.get(camp.template_id)?.name || camp.name) : 'Campaign Template';
          if (!templateStatsMap[tName]) {
            templateStatsMap[tName] = { sent: 0, delivered: 0, read: 0, failed: 0 };
          }
          templateStatsMap[tName].sent++;
          if (msg.status === 'delivered' || msg.status === 'read') templateStatsMap[tName].delivered++;
          if (msg.status === 'read') templateStatsMap[tName].read++;
          if (msg.status === 'failed') templateStatsMap[tName].failed++;
        }
      }
    });

    // 9. Compute Response Time Analytics & Per-Team / Per-Member Response Stats
    const responseTimesMinutes: number[] = [];
    const firstResponseTimesMinutes: number[] = [];
    let unansweredConversationsCount = 0;
    let activeConversationsCount = 0;

    const teamResponseMap = new Map<string, { responseTimes: number[]; firstResponses: number[]; unanswered: number; responded: number }>();
    teams.forEach(t => teamResponseMap.set(t.id, { responseTimes: [], firstResponses: [], unanswered: 0, responded: 0 }));
    teamResponseMap.set('unassigned', { responseTimes: [], firstResponses: [], unanswered: 0, responded: 0 });

    Object.entries(contactThreads).forEach(([contactId, thread]) => {
      if (thread.length === 0) return;
      activeConversationsCount++;

      const assign = contactAssignmentMap.get(contactId);
      const teamIdKey = assign?.team_id || 'unassigned';
      const teamResp = teamResponseMap.get(teamIdKey);
      const assignedUserId = assign?.assigned_user_id;
      const memberResp = assignedUserId ? memberMsgStatsMap.get(assignedUserId) : null;

      // Check if thread's latest message is unanswered inbound
      const lastMsg = thread[thread.length - 1];
      const isUnanswered = lastMsg.direction === 'inbound';
      if (isUnanswered) {
        unansweredConversationsCount++;
        if (teamResp) teamResp.unanswered++;
        if (memberResp) memberResp.unanswered++;
      }

      // Calculate response times between consecutive inbound -> outbound pairs
      let pendingInboundAt: number | null = null;
      let firstResponseRecordedForThread = false;

      for (const m of thread) {
        const mTime = new Date(m.created_at).getTime();
        if (m.direction === 'inbound') {
          if (pendingInboundAt === null) {
            pendingInboundAt = mTime;
          }
        } else if (m.direction === 'outbound' && pendingInboundAt !== null) {
          const diffMin = Math.max(0, (mTime - pendingInboundAt) / (1000 * 60));
          responseTimesMinutes.push(diffMin);
          if (teamResp) {
            teamResp.responseTimes.push(diffMin);
            teamResp.responded++;
          }
          if (memberResp) {
            memberResp.responseTimes.push(diffMin);
          }

          if (!firstResponseRecordedForThread) {
            firstResponseTimesMinutes.push(diffMin);
            if (teamResp) teamResp.firstResponses.push(diffMin);
            firstResponseRecordedForThread = true;
          }
          pendingInboundAt = null;
        }
      }
    });

    const averageResponseMinutes = responseTimesMinutes.length > 0
      ? Number((responseTimesMinutes.reduce((a, b) => a + b, 0) / responseTimesMinutes.length).toFixed(1))
      : null;

    const medianResponseMinutes = responseTimesMinutes.length > 0
      ? Number(responseTimesMinutes.sort((a, b) => a - b)[Math.floor(responseTimesMinutes.length / 2)].toFixed(1))
      : null;

    const firstResponseMinutes = firstResponseTimesMinutes.length > 0
      ? Number(firstResponseTimesMinutes.sort((a, b) => a - b)[Math.floor(firstResponseTimesMinutes.length / 2)].toFixed(1))
      : null;

    // 10. Compute Team Analytics Breakdowns
    // A. Conversations by Team
    const activeContactIds = Object.keys(contactThreads);
    const teamConversationCounts = new Map<string, number>();
    teams.forEach(t => teamConversationCounts.set(t.id, 0));
    teamConversationCounts.set('unassigned', 0);

    let assignedConversationsCount = 0;
    let unassignedConversationsCount = 0;

    activeContactIds.forEach(cId => {
      const assign = contactAssignmentMap.get(cId);
      if (assign?.team_id && teamMap.has(assign.team_id)) {
        teamConversationCounts.set(assign.team_id, (teamConversationCounts.get(assign.team_id) || 0) + 1);
        assignedConversationsCount++;
      } else if (assign?.assigned_user_id) {
        assignedConversationsCount++;
        teamConversationCounts.set('unassigned', (teamConversationCounts.get('unassigned') || 0) + 1);
      } else {
        unassignedConversationsCount++;
        teamConversationCounts.set('unassigned', (teamConversationCounts.get('unassigned') || 0) + 1);
      }
    });

    const totalActiveConvs = activeContactIds.length;
    const assignmentRate = totalActiveConvs > 0
      ? Number(((assignedConversationsCount / totalActiveConvs) * 100).toFixed(1))
      : 0;

    const conversationsByTeam: TeamConversationRow[] = teams
      .map(t => {
        const count = teamConversationCounts.get(t.id) || 0;
        return {
          teamId: t.id,
          teamName: t.name,
          color: t.color || '#4F46E5',
          count,
          percentage: totalActiveConvs > 0 ? Number(((count / totalActiveConvs) * 100).toFixed(1)) : 0
        };
      })
      .concat([
        {
          teamId: 'unassigned',
          teamName: 'Unassigned Queue',
          color: '#9CA3AF',
          count: teamConversationCounts.get('unassigned') || 0,
          percentage: totalActiveConvs > 0 ? Number((((teamConversationCounts.get('unassigned') || 0) / totalActiveConvs) * 100).toFixed(1)) : 0
        }
      ])
      .sort((a, b) => b.count - a.count);

    // B. Team Message Activity & Delivery
    const teamMessageActivity: TeamMessageActivityRow[] = teams
      .map(t => {
        const s = teamMsgStatsMap.get(t.id) || { inbound: 0, outbound: 0, delivered: 0, read: 0, failed: 0 };
        const total = s.inbound + s.outbound;
        return {
          teamId: t.id,
          teamName: t.name,
          color: t.color || '#4F46E5',
          inbound: s.inbound,
          outbound: s.outbound,
          total,
          delivered: s.delivered,
          read: s.read,
          failed: s.failed,
          deliveryRate: s.outbound > 0 ? Number(((s.delivered / s.outbound) * 100).toFixed(1)) : 0,
          readRate: s.delivered > 0 ? Number(((s.read / s.delivered) * 100).toFixed(1)) : 0
        };
      })
      .concat([
        {
          teamId: 'unassigned',
          teamName: 'Unassigned Queue',
          color: '#9CA3AF',
          inbound: teamMsgStatsMap.get('unassigned')?.inbound || 0,
          outbound: teamMsgStatsMap.get('unassigned')?.outbound || 0,
          total: (teamMsgStatsMap.get('unassigned')?.inbound || 0) + (teamMsgStatsMap.get('unassigned')?.outbound || 0),
          delivered: teamMsgStatsMap.get('unassigned')?.delivered || 0,
          read: teamMsgStatsMap.get('unassigned')?.read || 0,
          failed: teamMsgStatsMap.get('unassigned')?.failed || 0,
          deliveryRate: (teamMsgStatsMap.get('unassigned')?.outbound || 0) > 0 ? Number((((teamMsgStatsMap.get('unassigned')?.delivered || 0) / (teamMsgStatsMap.get('unassigned')?.outbound || 1)) * 100).toFixed(1)) : 0,
          readRate: (teamMsgStatsMap.get('unassigned')?.delivered || 0) > 0 ? Number((((teamMsgStatsMap.get('unassigned')?.read || 0) / (teamMsgStatsMap.get('unassigned')?.delivered || 1)) * 100).toFixed(1)) : 0
        }
      ])
      .filter(t => t.total > 0 || t.teamId !== 'unassigned')
      .sort((a, b) => b.total - a.total);

    // C. Team Response Performance
    const teamResponsePerformance: TeamResponsePerformanceRow[] = teams
      .map(t => {
        const r = teamResponseMap.get(t.id) || { responseTimes: [], firstResponses: [], unanswered: 0, responded: 0 };
        const avg = r.responseTimes.length > 0 ? Number((r.responseTimes.reduce((a, b) => a + b, 0) / r.responseTimes.length).toFixed(1)) : null;
        const med = r.responseTimes.length > 0 ? Number(r.responseTimes.sort((a, b) => a - b)[Math.floor(r.responseTimes.length / 2)].toFixed(1)) : null;
        const first = r.firstResponses.length > 0 ? Number(r.firstResponses.sort((a, b) => a - b)[Math.floor(r.firstResponses.length / 2)].toFixed(1)) : null;

        return {
          teamId: t.id,
          teamName: t.name,
          color: t.color || '#4F46E5',
          respondedCount: r.responded,
          unansweredCount: r.unanswered,
          averageResponseMinutes: avg,
          medianResponseMinutes: med,
          firstResponseMinutes: first
        };
      })
      .sort((a, b) => b.respondedCount - a.respondedCount);

    // D. Member Activity Table
    const memberActivity: MemberActivityRow[] = users
      .map(u => {
        const s = memberMsgStatsMap.get(u.id);
        const assignedCount = s ? s.assignedConvs.size : 0;
        const outbound = s ? s.outbound : 0;
        const med = s && s.responseTimes.length > 0 ? Number(s.responseTimes.sort((a, b) => a - b)[Math.floor(s.responseTimes.length / 2)].toFixed(1)) : null;
        const unanswered = s ? s.unanswered : 0;

        return {
          userId: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.workspace_role === 'admin' ? 'Workspace Admin' : 'Team Member',
          teamNames: userTeamsMap.get(u.id) || ['No Team'],
          assignedConversations: assignedCount,
          outboundReplies: outbound,
          medianResponseMinutes: med,
          unansweredCount: unanswered
        };
      })
      .sort((a, b) => b.assignedConversations - a.assignedConversations);

    // 11. Format Top Failure Reasons
    const topFailureReasons: FailureReason[] = Object.values(failureReasonMap)
      .map(({ count, info }) => ({
        code: info.code,
        title: info.title,
        count,
        percentage: failedCount > 0 ? Number(((count / failedCount) * 100).toFixed(1)) : 0,
        explanation: info.explanation,
        recommendation: info.recommendation
      }))
      .sort((a, b) => b.count - a.count);

    // 12. Format Template Performance
    const templatePerformance: TemplatePerformanceRow[] = Object.entries(templateStatsMap)
      .map(([name, stats]) => ({
        templateName: name,
        sent: stats.sent,
        delivered: stats.delivered,
        read: stats.read,
        failed: stats.failed,
        deliveryRate: stats.sent > 0 ? Number(((stats.delivered / stats.sent) * 100).toFixed(1)) : 0,
        readRate: stats.delivered > 0 ? Number(((stats.read / stats.delivered) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.sent - a.sent);

    // 13. Format Campaign Comparison
    const campaignComparison = (campaigns || [])
      .map((c) => {
        const stats = campaignStatsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 };
        return {
          id: c.id,
          name: c.name,
          createdAt: c.created_at,
          status: c.status,
          sent: stats.sent,
          delivered: stats.delivered,
          read: stats.read,
          failed: stats.failed,
          deliveryRate: stats.sent > 0 ? Number(((stats.delivered / stats.sent) * 100).toFixed(1)) : 0,
          readRate: stats.delivered > 0 ? Number(((stats.read / stats.delivered) * 100).toFixed(1)) : 0
        };
      })
      .filter(c => c.sent > 0 || c.status === 'completed' || c.status === 'running')
      .sort((a, b) => b.sent - a.sent);

    // 14. High Level Rates
    const deliveryRate = sentCount > 0 ? Number(((deliveredCount / sentCount) * 100).toFixed(1)) : 0;
    const readRate = deliveredCount > 0 ? Number(((readCount / deliveredCount) * 100).toFixed(1)) : 0;
    const failureRate = sentCount > 0 ? Number(((failedCount / sentCount) * 100).toFixed(1)) : 0;
    const responseRate = sentCount > 0 ? Number(((inboundCount / sentCount) * 100).toFixed(1)) : 0;

    const timeSeries = Object.values(timeSeriesMap).sort((a, b) => a.date.localeCompare(b.date));

    // 15. Handle CSV Export
    if (isCsvExport) {
      const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const csvLines: string[] = [
        'PINGSTACK PRO ADVANCED ANALYTICS & TEAMS REPORT',
        [`Generated At: ${new Date().toISOString()}`, `Timezone: ${workspaceTimezone}`, `Range: ${range}`, `Team Filter: ${teamFilter}`].map(escapeCsv).join(','),
        '',
        'SUMMARY TOTALS',
        ['Total Dispatched', 'Delivered', 'Read / Opened', 'Failed', 'Inbound Received', 'Delivery Rate %', 'Read Rate %', 'Failure Rate %', 'Inbound Ratio %'].map(escapeCsv).join(','),
        [sentCount, deliveredCount, readCount, failedCount, inboundCount, `${deliveryRate}%`, `${readRate}%`, `${failureRate}%`, `${responseRate}%`].map(escapeCsv).join(','),
        '',
        'TEAMS & CONVERSATION ASSIGNMENT OVERVIEW',
        ['Active Teams', 'Active Members', 'Total Active Conversations', 'Assigned Conversations', 'Unassigned Conversations', 'Assignment Rate %'].map(escapeCsv).join(','),
        [teams.filter(t => t.is_active).length, users.length, totalActiveConvs, assignedConversationsCount, unassignedConversationsCount, `${assignmentRate}%`].map(escapeCsv).join(','),
        '',
        'CONVERSATIONS BY TEAM',
        ['Team Name', 'Active Conversations', 'Share %'].map(escapeCsv).join(','),
        ...conversationsByTeam.map(t => [t.teamName, t.count, `${t.percentage}%`].map(escapeCsv).join(',')),
        '',
        'TEAM MESSAGE ACTIVITY',
        ['Team Name', 'Inbound', 'Outbound', 'Total Messages', 'Delivered', 'Read', 'Failed', 'Delivery Rate %', 'Read Rate %'].map(escapeCsv).join(','),
        ...teamMessageActivity.map(t => [t.teamName, t.inbound, t.outbound, t.total, t.delivered, t.read, t.failed, `${t.deliveryRate}%`, `${t.readRate}%`].map(escapeCsv).join(',')),
        '',
        'MEMBER ACTIVITY',
        ['Member Name', 'Email', 'Role', 'Teams', 'Assigned Conversations', 'Outbound Responses', 'Median Response (min)', 'Unanswered Inquiries'].map(escapeCsv).join(','),
        ...memberActivity.map(m => [m.name, m.email, m.role, m.teamNames.join('; '), m.assignedConversations, m.outboundReplies, m.medianResponseMinutes ?? 'N/A', m.unansweredCount].map(escapeCsv).join(',')),
        '',
        'DAILY MESSAGING ACTIVITY',
        ['Date', 'Sent', 'Delivered', 'Read', 'Failed', 'Inbound Received'].map(escapeCsv).join(','),
        ...timeSeries.map((row) => [
          row.date,
          row.sent,
          row.delivered,
          row.read,
          row.failed,
          row.inbound
        ].map(escapeCsv).join(',')),
        '',
        'TOP MESSAGE FAILURE REASONS',
        ['Error Code', 'Reason', 'Failed Messages', 'Percentage %', 'Troubleshooting Recommendation'].map(escapeCsv).join(','),
        ...topFailureReasons.map((f) => [
          f.code,
          f.title,
          f.count,
          `${f.percentage}%`,
          f.recommendation
        ].map(escapeCsv).join(',')),
        '',
        'TEMPLATE PERFORMANCE',
        ['Template Name', 'Sent', 'Delivered', 'Read', 'Failed', 'Delivery Rate %', 'Read Rate %'].map(escapeCsv).join(','),
        ...templatePerformance.map((t) => [
          t.templateName,
          t.sent,
          t.delivered,
          t.read,
          t.failed,
          `${t.deliveryRate}%`,
          `${t.readRate}%`
        ].map(escapeCsv).join(',')),
        '',
        'CAMPAIGN PERFORMANCE',
        ['Campaign Name', 'Created At', 'Status', 'Sent', 'Delivered', 'Read', 'Failed', 'Delivery Rate %', 'Read Rate %'].map(escapeCsv).join(','),
        ...campaignComparison.map((c) => [
          c.name,
          new Date(c.createdAt).toLocaleDateString(),
          c.status,
          c.sent,
          c.delivered,
          c.read,
          c.failed,
          `${c.deliveryRate}%`,
          `${c.readRate}%`
        ].map(escapeCsv).join(','))
      ];

      return new Response(csvLines.join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="pingstack_analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv"`
        }
      });
    }

    return NextResponse.json({
      range,
      startDate: startIso,
      endDate: endIso,
      timezone: workspaceTimezone,
      totals: {
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
        inbound: inboundCount,
        deliveryRate,
        readRate,
        failureRate,
        responseRate,
      },
      responseMetrics: {
        activeConversations: activeConversationsCount,
        unansweredConversations: unansweredConversationsCount,
        averageResponseMinutes,
        medianResponseMinutes,
        firstResponseMinutes
      },
      teamOverview: {
        activeTeamsCount: teams.filter(t => t.is_active).length,
        activeMembersCount: users.length,
        totalConversationsInPeriod: totalActiveConvs,
        assignedConversationsCount,
        unassignedConversationsCount,
        assignmentRate
      },
      teams: teams.map(t => ({ id: t.id, name: t.name, color: t.color || '#4F46E5' })),
      conversationsByTeam,
      teamMessageActivity,
      teamResponsePerformance,
      memberActivity,
      timeSeries,
      hourlyDistribution,
      topFailureReasons,
      templatePerformance,
      campaignComparison,
    });
  } catch (err: any) {
    console.error('[Advanced Analytics API Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
