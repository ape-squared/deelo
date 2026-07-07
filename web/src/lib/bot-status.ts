import { DISCORD_API } from '@/lib/session';
import { getBotGuildIds } from '@/lib/discord-bot';

export interface BotStatus {
  online: boolean;
  latencyMs: number | null;
  guildCount: number;
  bot: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  } | null;
  shards: number | null;
  checkedAt: string;
  error?: string;
}

export interface ServiceStatus {
  id: string;
  label: string;
  status: 'operational' | 'degraded' | 'down';
  detail: string;
}

function botToken(): string | undefined {
  return process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
}

export async function getBotStatus(): Promise<BotStatus> {
  const checkedAt = new Date().toISOString();
  const token = botToken();

  if (!token) {
    return {
      online: false,
      latencyMs: null,
      guildCount: 0,
      bot: null,
      shards: null,
      checkedAt,
      error: 'Bot token not configured',
    };
  }

  const start = Date.now();
  try {
    const [meRes, gatewayRes, guildIds] = await Promise.all([
      fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bot ${token}` },
        cache: 'no-store',
      }),
      fetch(`${DISCORD_API}/gateway/bot`, {
        headers: { Authorization: `Bot ${token}` },
        cache: 'no-store',
      }).catch(() => null),
      getBotGuildIds(),
    ]);

    const latencyMs = Date.now() - start;

    if (!meRes.ok) {
      return {
        online: false,
        latencyMs,
        guildCount: guildIds.size,
        bot: null,
        shards: null,
        checkedAt,
        error: `Discord API returned ${meRes.status}`,
      };
    }

    const me = (await meRes.json()) as {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    };

    let shards: number | null = null;
    if (gatewayRes?.ok) {
      const gw = (await gatewayRes.json()) as { shards?: number };
      shards = gw.shards ?? null;
    }

    return {
      online: true,
      latencyMs,
      guildCount: guildIds.size,
      bot: {
        id: me.id,
        username: me.username,
        discriminator: me.discriminator,
        avatar: me.avatar,
      },
      shards,
      checkedAt,
    };
  } catch (err) {
    return {
      online: false,
      latencyMs: Date.now() - start,
      guildCount: 0,
      bot: null,
      shards: null,
      checkedAt,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getServiceStatuses(): Promise<ServiceStatus[]> {
  const token = botToken();
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  const [bot, dbOk] = await Promise.all([
    getBotStatus(),
    hasSupabase
      ? import('@/lib/supabase/admin').then(async ({ createAdminClient }) => {
          const db = createAdminClient();
          const { error } = await db.from('guilds').select('id', { count: 'exact', head: true });
          return !error;
        }).catch(() => false)
      : Promise.resolve(false),
  ]);

  return [
    {
      id: 'discord',
      label: 'Discord API',
      status: bot.online ? (bot.latencyMs && bot.latencyMs > 800 ? 'degraded' : 'operational') : 'down',
      detail: bot.online ? `${bot.latencyMs}ms latency` : (bot.error ?? 'Unreachable'),
    },
    {
      id: 'bot',
      label: 'Deelo Bot',
      status: bot.online ? 'operational' : 'down',
      detail: bot.online ? `Serving ${bot.guildCount.toLocaleString()} servers` : 'Offline or misconfigured',
    },
    {
      id: 'database',
      label: 'Database',
      status: dbOk ? 'operational' : (hasSupabase ? 'degraded' : 'down'),
      detail: dbOk ? 'Connected' : 'Connection issue',
    },
    {
      id: 'dashboard',
      label: 'Web Dashboard',
      status: 'operational',
      detail: 'deelo.bot',
    },
  ];
}
