import { NextRequest, NextResponse } from 'next/server';
import { buildInviteUrl } from '@/lib/invite';
import { getDiscordClientId } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guildId = req.nextUrl.searchParams.get('guild_id') ?? undefined;
  const url = buildInviteUrl(getDiscordClientId(), guildId);
  const res = NextResponse.redirect(url);
  // Preserve UTM params in a cookie for post-invite attribution (optional analytics)
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    .map((k) => (req.nextUrl.searchParams.get(k) ? `${k}=${req.nextUrl.searchParams.get(k)}` : ''))
    .filter(Boolean)
    .join('&');
  if (utm) {
    res.cookies.set('deelo_utm', utm, { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });
  }
  return res;
}
