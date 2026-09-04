import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { PLANS, PLAN_CONFIGS, PlanType, getActivePlanType } from '@/lib/plans';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    // 1. Fetch tenant & joined WhatsApp account
    const { data: tenant, error: tenantErr } = await db
      .from('tenants')
      .select('*, whatsapp_accounts(*)')
      .eq('id', id)
      .maybeSingle();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const waAccount = Array.isArray(tenant.whatsapp_accounts) && tenant.whatsapp_accounts.length > 0
      ? tenant.whatsapp_accounts[0]
      : null;

    // 2. Fetch Users, Contacts, Templates, Campaigns, Messages counts in parallel
    const startOfToday = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();

    const [
      usersRes,
      contactsCountRes,
      groupsCountRes,
      templatesRes,
      campaignsRes,
      messagesSentRes,
      messagesDeliveredRes,
      messagesReadRes,
      messagesFailedRes,
      messagesTodayRes,
      auditLogsRes,
      recentMessagesRes,
    ] = await Promise.all([
      db.from('users').select('id, name, email, role, created_at').eq('tenant_id', id),
      db.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      db.from('groups').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      db.from('templates').select('id, name, status, created_at').eq('tenant_id', id),
      db.from('campaigns').select('id, name, status, scheduled_at, created_at').eq('tenant_id', id),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', id).in('status', ['delivered', 'read']),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('status', 'read'),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('status', 'failed'),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', id).gte('created_at', startOfToday),
      db.from('admin_audit_logs').select('*').eq('target_tenant_id', id).order('created_at', { ascending: false }).limit(20),
      db.from('messages').select('id, phone_number, status, content, created_at, error').eq('tenant_id', id).order('created_at', { ascending: false }).limit(10),
    ]);

    const activePlanType: PlanType = getActivePlanType(tenant.plan_type);
    const planLimits = PLANS[activePlanType] || PLANS.starter;
    const planConfig = PLAN_CONFIGS[activePlanType] || PLAN_CONFIGS.starter;

    const templates = templatesRes.data || [];
    const approvedTemplates = templates.filter((t: any) => t.status === 'APPROVED').length;
    const campaigns = campaignsRes.data || [];
    const completedCampaigns = campaigns.filter((c: any) => c.status === 'completed').length;
    const runningCampaigns = campaigns.filter((c: any) => c.status === 'running').length;

    // Timeline construction
    const timeline: any[] = [];

    // Add tenant creation
    timeline.push({
      id: `tenant-created-${tenant.id}`,
      type: 'account_created',
      title: 'Business account created',
      description: `Registered as ${tenant.name} on ${activePlanType.toUpperCase()} plan.`,
      timestamp: tenant.created_at,
    });

    // Add WhatsApp connection if present
    if (waAccount?.created_at) {
      timeline.push({
        id: `wa-connected-${waAccount.id}`,
        type: 'whatsapp_connected',
        title: 'WhatsApp Business API Connected',
        description: `Connected Phone ID: ${waAccount.phone_number_id} (${waAccount.status})`,
        timestamp: waAccount.created_at,
      });
    }

    // Add templates
    templates.forEach((t: any) => {
      timeline.push({
        id: `template-${t.id}`,
        type: 'template_created',
        title: `Template "${t.name}" created`,
        description: `Status: ${t.status}`,
        timestamp: t.created_at,
      });
    });

    // Add campaigns
    campaigns.forEach((c: any) => {
      timeline.push({
        id: `campaign-${c.id}`,
        type: 'campaign_created',
        title: `Campaign "${c.name}" ${c.status}`,
        description: `Campaign state: ${c.status}`,
        timestamp: c.created_at,
      });
    });

    // Add admin audit actions
    (auditLogsRes.data || []).forEach((a: any) => {
      timeline.push({
        id: `admin-audit-${a.id}`,
        type: 'admin_action',
        title: `Admin Action: ${a.action.replace(/_/g, ' ')}`,
        description: `By ${a.admin_email}. ${a.metadata?.note ? `Note: "${a.metadata.note}"` : ''}`,
        timestamp: a.created_at,
      });
    });

    // Sort timeline newest first
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const isConnected = waAccount && (waAccount.status === 'ACTIVE' || waAccount.status === 'CONNECTED');
    const isSuspended = tenant.subscription_status === 'suspended';

    let computedStatus = 'Active';
    if (isSuspended) computedStatus = 'Suspended';
    else if (!isConnected) computedStatus = 'Onboarding';

    return NextResponse.json({
      business: {
        id: tenant.id,
        publicId: tenant.public_id,
        name: tenant.name,
        industry: tenant.industry,
        country: tenant.country || 'IN',
        timezone: tenant.timezone || 'Asia/Calcutta',
        planType: activePlanType,
        subscriptionStatus: tenant.subscription_status || 'active',
        computedStatus,
        currentPeriodEnd: tenant.current_period_end,
        storageUsageBytes: tenant.storage_usage_bytes || 0,
        createdAt: tenant.created_at,
        lastUsageReset: tenant.last_usage_reset,
      },
      owner: (usersRes.data && usersRes.data[0]) || null,
      users: usersRes.data || [],
      whatsapp: waAccount
        ? {
            id: waAccount.id,
            status: waAccount.status,
            businessId: waAccount.business_id,
            phoneNumberId: waAccount.phone_number_id,
            provider: waAccount.provider,
            updatedAt: waAccount.updated_at,
            createdAt: waAccount.created_at,
          }
        : null,
      usage: {
        contacts: contactsCountRes.count || 0,
        contactsLimit: planLimits.maxContacts,
        groups: groupsCountRes.count || 0,
        templates: templates.length,
        templatesApproved: approvedTemplates,
        templatesLimit: planLimits.maxSavedTemplates,
        campaigns: campaigns.length,
        campaignsRunning: runningCampaigns,
        campaignsCompleted: completedCampaigns,
        messagesSent: messagesSentRes.count || 0,
        messagesDelivered: messagesDeliveredRes.count || 0,
        messagesRead: messagesReadRes.count || 0,
        messagesFailed: messagesFailedRes.count || 0,
        messagesToday: messagesTodayRes.count || 0,
        dailyTemplateLimit: planLimits.templateSendsPerDay,
        storageMb: Math.round(((tenant.storage_usage_bytes || 0) / (1024 * 1024)) * 100) / 100,
        storageLimitMb: planLimits.maxStorageMb,
      },
      planConfig: {
        ...planConfig,
        limits: planLimits,
      },
      recentMessages: recentMessagesRes.data || [],
      timeline: timeline.slice(0, 30),
      adminAuditLogs: auditLogsRes.data || [],
    });
  } catch (err: any) {
    console.error('[Admin Business Detail API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch business details' }, { status: 500 });
  }
}
