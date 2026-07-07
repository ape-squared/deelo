import { NextResponse } from 'next/server';
import { requirePlatformStaff } from '@/lib/platform-staff';

export async function GET() {
  const auth = await requirePlatformStaff('staff.read');
  if (auth.error) return auth.error;
  return NextResponse.json({ staff: auth.staff });
}
