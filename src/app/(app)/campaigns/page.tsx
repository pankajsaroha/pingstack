import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getCampaignsServer } from '@/lib/server/campaigns';
import { getTemplatesServer } from '@/lib/server/templates';
import { getGroupsServer } from '@/lib/server/groups';
import { getContactsServer } from '@/lib/server/contacts';
import CampaignsClient from './_components/CampaignsClient';

export default async function CampaignsPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  // Fetch tenant, campaigns, templates, groups, and contacts in parallel
  const [tenant, campaigns, templates, groups, rawContacts] = await Promise.all([
    getTenantServer(),
    getCampaignsServer(tenantId),
    getTemplatesServer(tenantId, true),
    getGroupsServer(tenantId),
    getContactsServer(tenantId, 100)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  const contacts = Array.isArray(rawContacts) ? rawContacts : (rawContacts?.contacts || []);

  return (
    <CampaignsClient
      tenant={tenant}
      planType={tenant.plan_type || 'starter'}
      initialCampaigns={campaigns || []}
      initialTemplates={templates || []}
      initialGroups={groups || []}
      initialContacts={contacts || []}
    />
  );
}
