import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { recordWorkspaceHeartbeat, removeWorkspacePresence } from '@/lib/server/push-notifications';

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const tenantId = reqHeaders.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tabId, action } = body;

    if (!tabId) {
      return NextResponse.json({ error: 'Missing tabId' }, { status: 400 });
    }

    if (action === 'leave') {
      await removeWorkspacePresence(tenantId, tabId);
    } else {
      await recordWorkspaceHeartbeat(tenantId, tabId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Presence Heartbeat Error]:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
