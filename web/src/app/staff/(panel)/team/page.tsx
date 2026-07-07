import { requireStaffPage } from '@/lib/staff-page';
import { StaffTeamManager } from '@/components/staff/team-manager';

export default async function StaffTeamPage() {
  await requireStaffPage('staff.manage');
  return <StaffTeamManager />;
}
