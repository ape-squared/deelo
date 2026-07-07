import { redirect } from 'next/navigation';

export default function StaffGuildsRedirect() {
  redirect('/admin/guild-lookup');
}
