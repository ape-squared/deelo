import { requireStaffPage } from '@/lib/staff-page';
import { StaffGuildLookup } from '@/components/staff/guild-lookup';

export default async function SupportGuildsPage() {
  await requireStaffPage('guilds.read');
  return <StaffGuildLookup />;
}
