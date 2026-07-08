import { redirect } from 'next/navigation';
import { getTenantServer } from '@/lib/server/tenant';
import { getTemplatesServer } from '@/lib/server/templates';
import TemplatesClient from './_components/TemplatesClient';

export default async function TemplatesPage() {
  const tenant = await getTenantServer();

  if (!tenant) {
    redirect('/login');
  }

  const templates = await getTemplatesServer(tenant.id);

  return (
    <TemplatesClient
      tenant={tenant}
      initialTemplates={templates}
    />
  );
}
