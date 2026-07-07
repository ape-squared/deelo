import { requireStaffPage } from '@/lib/staff-page';
import { StaffBotStatus } from '@/components/staff/bot-status';

export default async function DeveloperStatusPage() {
  await requireStaffPage('dev.tools');
  return <StaffBotStatus />;
}
