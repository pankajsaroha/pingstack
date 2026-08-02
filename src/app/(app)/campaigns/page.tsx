import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getCampaignsServer } from '@/lib/server/campaigns';
import { getTemplatesServer } from '@/lib/server/templates';
import { getGroupsServer } from '@/lib/server/groups';
import CampaignsClient from './_components/CampaignsClient';

export default async function CampaignsPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  // Fetch tenant, campaigns, templates, and groups in parallel to eliminate server-side database query waterfall
  const [tenant, campaigns, templates, groups] = await Promise.all([
    getTenantServer(),
    getCampaignsServer(tenantId),
    getTemplatesServer(tenantId),
    getGroupsServer(tenantId)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  return (
    <CampaignsClient
      tenant={tenant}
      planType={tenant.plan_type || 'starter'}
      initialCampaigns={campaigns || []}
      initialTemplates={templates || []}
      initialGroups={groups || []}
    />
  );
}
