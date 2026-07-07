import { redirect } from 'next/navigation';

export default function LegacyStaffUsersRedirect() {
  redirect('/staff/support/users');
}
