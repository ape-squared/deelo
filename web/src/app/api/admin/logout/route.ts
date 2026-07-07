import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/admin-session';
import { resolveAppUrl } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await clearAdminSession();
  return NextResponse.redirect(new URL('/admin/login', resolveAppUrl(req.headers)));
}
