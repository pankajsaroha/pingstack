import { redirect } from 'next/navigation';
import { getTenantServer } from '@/lib/server/tenant';
import { getContactsServer } from '@/lib/server/contacts';
import { getTemplatesServer } from '@/lib/server/templates';
import ContactsClient from './_components/ContactsClient';

export default async function ContactsPage() {
  const tenant = await getTenantServer();

  if (!tenant) {
    redirect('/login');
  }

  const [contacts, templates] = await Promise.all([
    getContactsServer(tenant.id),
    getTemplatesServer(tenant.id)
  ]);

  return (
    <ContactsClient
      initialContacts={contacts}
      initialTemplates={templates}
    />
  );
}
