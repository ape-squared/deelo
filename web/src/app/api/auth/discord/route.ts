import { redirect } from 'next/navigation';
import { getAppUrl, getDiscordClientId } from '@/lib/discord-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = getDiscordClientId();
  const redirectUri = encodeURIComponent(`${getAppUrl()}/api/auth/discord/callback`);
  const scope = encodeURIComponent('identify guilds');
  redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
}
