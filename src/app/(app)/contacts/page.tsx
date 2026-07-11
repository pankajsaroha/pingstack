import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getContactsServer } from '@/lib/server/contacts';
import { getTemplatesServer } from '@/lib/server/templates';
import ContactsClient from './_components/ContactsClient';

export default async function ContactsPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  const [tenant, contacts, templates] = await Promise.all([
    getTenantServer(),
    getContactsServer(tenantId),
    getTemplatesServer(tenantId)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  return (
    <ContactsClient
      initialContacts={contacts}
      initialTemplates={templates}
    />
  );
}
