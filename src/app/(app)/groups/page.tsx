import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getGroupsServer } from '@/lib/server/groups';
import GroupsClient from './_components/GroupsClient';

export default async function GroupsPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  const [tenant, groups] = await Promise.all([
    getTenantServer(),
    getGroupsServer(tenantId)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  return (
    <GroupsClient
      initialGroups={groups}
    />
  );
}
