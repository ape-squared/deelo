import { NextRequest, NextResponse } from 'next/server';
import { setDashboardSession } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateOfficialGuildCache } from '@/lib/official-guild';
import {
  exchangeDiscordOAuthCode,
  getOAuthRedirectUri,
  mapDiscordOAuthError,
} from '@/lib/discord-oauth';
import { resolveOAuthAppUrl } from '@/lib/runtime-env';
import { DISCORD_API } from '@/lib/discord-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const appUrl = resolveOAuthAppUrl(req.headers);
  const redirectUri = getOAuthRedirectUri(req.headers);
  const code = req.nextUrl.searchParams.get('code');

  if (!code) return NextResponse.redirect(new URL('/dashboard?error=no_code', appUrl));

  try {
    const tokenRes = await exchangeDiscordOAuthCode(code, redirectUri);

    if (!tokenRes.ok) {
      const errorCode = mapDiscordOAuthError(tokenRes.body);
      console.error('[discord/oauth] token exchange failed:', tokenRes.status, tokenRes.text, {
        redirectUri,
        error: tokenRes.body.error,
        description: tokenRes.body.error_description,
      });
      return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(errorCode)}`, appUrl));
    }

    const tokens = tokenRes.body as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

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

    invalidateOfficialGuildCache(user.id);

    const returnTo = req.nextUrl.searchParams.get('state');
    const safeReturn =
      returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';

    return NextResponse.redirect(new URL(safeReturn, appUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth failed';
    console.error('[discord/oauth] callback error:', message);
    const code = message.includes('DISCORD_CLIENT_SECRET') ? 'missing_secret' : 'server_config';
    return NextResponse.redirect(new URL(`/dashboard?error=${code}`, appUrl));
  }
}
