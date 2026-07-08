import { redirect } from 'next/navigation';
import { getTenantServer } from '@/lib/server/tenant';
import { getStatsServer } from '@/lib/server/stats';
import DashboardClient from './_components/DashboardClient';

const INITIAL_STATS = {
  conversations: 0,
  templatesApproved: 0,
  inboundMessages: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  totalContacts: 0,
  estimatedCostThisMonth: 0,
  estimatedCostSinceLastPayment: 0,
  lastMetaPaymentAt: null as string | null,
  metaBudgetLimit: 1000
};

export default async function DashboardPage() {
  const tenant = await getTenantServer();

  if (!tenant) {
    redirect('/login');
  }

  const stats = (await getStatsServer(tenant.id)) || INITIAL_STATS;

  return (
    <DashboardClient
      initialTenant={tenant}
      initialStats={stats}
    />
  );
}
