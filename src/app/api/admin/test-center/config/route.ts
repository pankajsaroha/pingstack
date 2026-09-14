import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { getTestEnvironmentConfig, saveTestEnvironmentConfig } from '@/lib/server/admin-tests/provider-tests';
import { dbAdmin as db } from '@/lib/db';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;

  try {
    const config = await getTestEnvironmentConfig();

    // Fetch list of all workspaces and their WhatsApp connection status for selection
    let availableWorkspaces: Array<{ id: string; name: string; hasWaAccount: boolean; displayPhone?: string }> = [];

    if (db) {
      try {
        const { data: tenants } = await db
          .from('tenants')
          .select('id, name')
          .order('name', { ascending: true })
          .limit(100);

        const { data: waAccounts } = await db
          .from('whatsapp_accounts')
          .select('tenant_id, display_phone_number, status');

        const waMap = new Map<string, { status: string; displayPhone?: string }>();
        waAccounts?.forEach((w: any) => {
          waMap.set(w.tenant_id, { status: w.status, displayPhone: w.display_phone_number });
        });

        availableWorkspaces = (tenants || []).map((t: any) => {
          const wa = waMap.get(t.id);
          return {
            id: t.id,
            name: t.name,
            hasWaAccount: wa?.status === 'ACTIVE' || wa?.status === 'CONNECTED',
            displayPhone: wa?.displayPhone,
          };
        });
      } catch (dbErr) {
        console.warn('[Test Center Config GET] Workspaces list query error:', dbErr);
      }
    }

    return NextResponse.json({
      config,
      availableWorkspaces,
    });
  } catch (err: any) {
    console.error('[Admin Test Config GET] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch test configuration' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { workspaceId, recipientPhone, notes } = body;

    let workspaceName = '';
    let wabaId = '';
    let senderPhone = '';
    let isVerified = false;

    if (workspaceId && db) {
      const { data: tenant } = await db
        .from('tenants')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle();

      workspaceName = tenant?.name || '';

      const { data: waAccount } = await db
        .from('whatsapp_accounts')
        .select('business_id, display_phone_number, status')
        .eq('tenant_id', workspaceId)
        .maybeSingle();

      wabaId = waAccount?.business_id || '';
      senderPhone = waAccount?.display_phone_number || '';
      isVerified = waAccount?.status === 'ACTIVE' || waAccount?.status === 'CONNECTED';
    }

    const saved = await saveTestEnvironmentConfig({
      workspaceId,
      workspaceName,
      wabaId,
      senderPhone,
      recipientPhone,
      isVerified,
      notes,
    });

    return NextResponse.json({
      success: true,
      config: saved,
    });
  } catch (err: any) {
    console.error('[Admin Test Config POST] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save test configuration' }, { status: 500 });
  }
}
