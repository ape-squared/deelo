import { redirect } from 'next/navigation';

export default function StaffUsersRedirect() {
  redirect('/admin/users');
}
