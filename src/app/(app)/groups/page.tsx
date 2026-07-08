import { redirect } from 'next/navigation';
import { getTenantServer } from '@/lib/server/tenant';
import { getGroupsServer } from '@/lib/server/groups';
import GroupsClient from './_components/GroupsClient';

export default async function GroupsPage() {
  const tenant = await getTenantServer();

  if (!tenant) {
    redirect('/login');
  }

  const groups = await getGroupsServer(tenant.id);

  return (
    <GroupsClient
      initialGroups={groups}
    />
  );
}
