import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getConversationsServer } from '@/lib/server/chat';
import { getContactsServer } from '@/lib/server/contacts';
import { getTemplatesServer } from '@/lib/server/templates';
import InboxClient from './_components/InboxClient';

export default async function InboxPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  // Pre-fetch all layout states in parallel to prevent database query waterfalls
  const [tenant, conversations, contacts, templates] = await Promise.all([
    getTenantServer(),
    getConversationsServer(tenantId),
    getContactsServer(tenantId),
    getTemplatesServer(tenantId)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  return (
    <InboxClient
      initialConversations={conversations}
      initialContacts={contacts}
      initialTemplates={templates}
      tenant={tenant}
    />
  );
}
