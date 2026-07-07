import { NextResponse } from 'next/server';
import { getBotStatus, getServiceStatuses } from '@/lib/bot-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [bot, services] = await Promise.all([getBotStatus(), getServiceStatuses()]);

  const overall = services.some((s) => s.status === 'down')
    ? 'down'
    : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'operational';

  return NextResponse.json({
    status: overall,
    bot,
    services,
    uptime: bot.online ? 'Online' : 'Offline',
  });
}
