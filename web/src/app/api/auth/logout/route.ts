import { NextResponse } from 'next/server';
import { clearDashboardSession } from '@/lib/session';

export async function POST() {
  await clearDashboardSession();
  return NextResponse.json({ ok: true });
}
