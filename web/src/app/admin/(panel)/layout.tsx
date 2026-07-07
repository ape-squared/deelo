import { redirect } from 'next/navigation';
import { getPlatformOperator } from '@/lib/platform-operator';
import { AdminShell } from '@/components/admin/shell';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const operator = await getPlatformOperator();
  if (!operator) redirect('/admin/login');

  return <AdminShell operator={operator}>{children}</AdminShell>;
}
