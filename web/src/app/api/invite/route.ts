import { NextRequest, NextResponse } from 'next/server';
import { buildInviteUrl } from '@/lib/invite';
import { getDiscordClientId } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guildId = req.nextUrl.searchParams.get('guild_id') ?? undefined;
  const url = buildInviteUrl(getDiscordClientId(), guildId);
  return NextResponse.redirect(url);
}
