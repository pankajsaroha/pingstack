import { redirect } from 'next/navigation';
import { getTenantServer } from '@/lib/server/tenant';
import { getCampaignsServer } from '@/lib/server/campaigns';
import { getTemplatesServer } from '@/lib/server/templates';
import { getGroupsServer } from '@/lib/server/groups';
import CampaignsClient from './_components/CampaignsClient';

export default async function CampaignsPage() {
  const tenant = await getTenantServer();

  if (!tenant) {
    redirect('/login');
  }

  const [campaigns, templates, groups] = await Promise.all([
    getCampaignsServer(tenant.id),
    getTemplatesServer(tenant.id),
    getGroupsServer(tenant.id)
  ]);

  return (
    <CampaignsClient
      tenant={tenant}
      planType={tenant.plan_type || 'starter'}
      initialCampaigns={campaigns}
      initialTemplates={templates}
      initialGroups={groups}
    />
  );
}
