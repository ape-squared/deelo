import { NextRequest, NextResponse } from 'next/server';
import { setDashboardSession, DISCORD_API } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDiscordClientId, getDiscordClientSecret, resolveAppUrl } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const appUrl = resolveAppUrl(req.headers);
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/dashboard?error=no_code', appUrl));

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getDiscordClientId(),
      client_secret: getDiscordClientSecret(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/auth/discord/callback`,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(new URL('/dashboard?error=token', appUrl));
  const tokens = (await tokenRes.json()) as { access_token: string; refresh_token: string; expires_in: number };

  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return NextResponse.redirect(new URL('/dashboard?error=user', appUrl));
  const user = (await userRes.json()) as { id: string; username: string; avatar: string | null; email?: string };

  const { error: dbError } = await createAdminClient().from('dashboard_users').upsert({
    discord_id: user.id,
    username: user.username,
    avatar: user.avatar,
    email: user.email ?? null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    last_login: new Date().toISOString(),
  });
  if (dbError) console.error('dashboard_users upsert failed:', dbError);

  await setDashboardSession({
    discordId: user.id,
    username: user.username,
    avatar: user.avatar,
  });

  const returnTo = req.nextUrl.searchParams.get('state');
  const safeReturn =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';

  return NextResponse.redirect(new URL(safeReturn, appUrl));
}
