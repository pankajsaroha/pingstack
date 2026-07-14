import { redirect } from 'next/navigation';
import { getTenantServer } from '@/lib/server/tenant';
import ClientLayout from './ClientLayout';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantServer();

  if (!tenant) {
    redirect('/login');
  }

  return (
    <ClientLayout tenant={tenant}>
      {children}
    </ClientLayout>
  );
}
