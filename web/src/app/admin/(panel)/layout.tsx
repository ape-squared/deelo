import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin';
import { AdminShell } from '@/components/admin/shell';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  return (
    <AdminShell email={admin.email} role={admin.role}>
      {children}
    </AdminShell>
  );
}
