import { redirect } from 'next/navigation';
import { getAdminServer } from '@/lib/server/admin-auth';
import { AdminLayoutClient } from './AdminLayoutClient';

export const metadata = {
  title: 'Pingstack Admin Control Center',
  description: 'Private Founder & Administrator Command Center for Pingstack',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminServer();

  if (!admin) {
    redirect('/login');
  }

  return (
    <AdminLayoutClient admin={admin}>
      {children}
    </AdminLayoutClient>
  );
}
