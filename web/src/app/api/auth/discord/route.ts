import { redirect } from 'next/navigation';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`);
  const scope = encodeURIComponent('identify guilds');
  redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`);
}
