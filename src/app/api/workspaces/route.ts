import { NextResponse } from 'next/server';
import { getUserWorkspacesServer } from '@/lib/server/teams';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await getUserWorkspacesServer(userId, tenantId || undefined);
    return NextResponse.json({ workspaces });
  } catch (err: any) {
    console.error('[GET /api/workspaces] error:', err);
    return NextResponse.json({ error: 'Failed to retrieve workspaces' }, { status: 500 });
  }
}
