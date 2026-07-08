import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDiscordClientId, oauthCallbackPath, resolveOAuthAppUrl } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = getDiscordClientId();
  resolveOAuthAppUrl(await headers()); // validate env is configured
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return') || '/dashboard';
  const redirectUri = encodeURIComponent(oauthCallbackPath());
  const scope = encodeURIComponent('identify guilds');
  const state = encodeURIComponent(returnTo);
  redirect(
    `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`,
  );
}
