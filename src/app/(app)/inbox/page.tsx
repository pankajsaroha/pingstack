import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantServer } from '@/lib/server/tenant';
import { getConversationsServer, getInitialMessagesServer } from '@/lib/server/chat';
import InboxClient from './_components/InboxClient';

export default async function InboxPage() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');
  const userId = reqHeaders.get('x-user-id');

  if (!tenantId) {
    redirect('/login');
  }

  // Fast-Path: Resolve authenticated tenant and authorized conversations in parallel
  const [tenant, conversations] = await Promise.all([
    getTenantServer(),
    getConversationsServer(tenantId, userId || undefined),
  ]);

  if (!tenant) {
    redirect('/login');
  }

  // Pre-load first page of messages for initial selected conversation so chat renders with list
  const firstContactId = conversations.length > 0 ? conversations[0].contact.id : null;
  const initialMessages = firstContactId
    ? await getInitialMessagesServer(tenantId, firstContactId, 20)
    : [];

  return (
    <InboxClient
      initialConversations={conversations}
      initialMessages={initialMessages}
      initialContacts={[]}
      initialTemplates={[]}
      initialTeams={[]}
      initialMembers={[]}
      tenant={tenant}
    />
  );
}
