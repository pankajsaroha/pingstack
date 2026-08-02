import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getTemplatesServer } from '@/lib/server/templates';
import TemplatesClient from './_components/TemplatesClient';

export default async function TemplatesPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  const [tenant, templates] = await Promise.all([
    getTenantServer(),
    getTemplatesServer(tenantId)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  return (
    <TemplatesClient
      tenant={tenant}
      initialTemplates={templates}
    />
  );
}
