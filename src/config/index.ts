import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  ownerIds: (process.env.OWNER_IDS ?? process.env.PLATFORM_OWNER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  supportGuildId: process.env.SUPPORT_GUILD_ID ?? '',
  /** Puter auth token — preferred free OpenAI gateway (https://developer.puter.com/tutorials/puter-auth-token/) */
  puterAuthToken: process.env.PUTER_AUTH_TOKEN ?? '',
  /** Direct OpenAI key — optional fallback when Puter is unavailable */
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID ?? '',
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
  youtubeCookies: process.env.YOUTUBE_COOKIES ?? '',
  defaultPrefix: process.env.DEFAULT_PREFIX ?? ',',
  botName: 'Deelo',
  botColor: 0x5865f2,
  inviteUrl: (() => {
    const clientId = process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!clientId) return '';
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8866461766385655&integration_type=0&scope=bot`;
  })(),
};

export function validateConfig(): void {
  if (!config.token) {
    throw new Error('DISCORD_TOKEN is required. Copy .env.example to .env and set your token.');
  }
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. See .env.example');
  }
}
