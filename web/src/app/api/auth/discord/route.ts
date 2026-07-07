import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDiscordClientId, resolveAppUrl } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = getDiscordClientId();
  const appUrl = resolveAppUrl(await headers());
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return') || '/dashboard';
  const redirectUri = encodeURIComponent(`${appUrl}/api/auth/discord/callback`);
  const scope = encodeURIComponent('identify guilds');
  const state = encodeURIComponent(returnTo);
  redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`);
}
