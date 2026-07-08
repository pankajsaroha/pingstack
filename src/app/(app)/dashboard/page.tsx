import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');

  if (!tenantId) {
    redirect('/login');
  }

  // Fetch tenant and stats in parallel to eliminate server-side database query waterfall
  const [tenant, stats] = await Promise.all([
    getTenantServer(),
    getStatsServer(tenantId)
  ]);

  if (!tenant) {
    redirect('/login');
  }

  const initialStats = stats || INITIAL_STATS;

  return (
    <DashboardClient
      initialTenant={tenant}
      initialStats={initialStats}
    />
  );
}
