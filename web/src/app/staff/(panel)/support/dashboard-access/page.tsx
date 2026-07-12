import { requireStaffPage } from '@/lib/staff-page';
import { StaffDashboardAccessTool } from '@/components/staff/dashboard-access';

export default async function SupportDashboardAccessPage() {
  const staff = await requireStaffPage('guilds.dashboard');

  return <StaffDashboardAccessTool staffRole={staff.role} />;
}
