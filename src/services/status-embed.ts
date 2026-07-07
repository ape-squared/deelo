import { EmbedBuilder, type Client, type TextChannel, ChannelType } from 'discord.js';
import { config } from '../config';
import { fetchAppJson, probeAppReachable, primaryAppUrl } from '../lib/app-urls';

const STATUS_TITLE = 'Deelo System Status';
const REFRESH_MS = 5 * 60 * 1000;

type OverallStatus = 'operational' | 'degraded' | 'down';

interface StatusApiPayload {
  status: OverallStatus;
  bot: {
    online: boolean;
    latencyMs: number | null;
    guildCount: number;
    shards: number | null;
    checkedAt: string;
    error?: string;
  };
  services: Array<{
    label: string;
    status: OverallStatus;
    detail: string;
  }>;
}

const STATUS_EMOJI: Record<OverallStatus, string> = {
  operational: '🟢',
  degraded: '🟡',
  down: '🔴',
};

const STATUS_COLOR: Record<OverallStatus, number> = {
  operational: 0x22c55e,
  degraded: 0xf59e0b,
  down: 0xed4245,
};

let statusMessageId: string | null = process.env.STATUS_MESSAGE_ID ?? null;

async function fetchStatusApi(): Promise<StatusApiPayload | null> {
  return fetchAppJson<StatusApiPayload>('/api/status');
}

async function buildLocalStatus(client: Client): Promise<StatusApiPayload> {
  const { testConnection } = await import('../database');
  let dbOk = false;
  try {
    await testConnection();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const dashboard = await probeAppReachable();
  const latencyMs = client.ws.ping;
  const guildCount = client.guilds.cache.size;
  const online = client.isReady();

  const services: StatusApiPayload['services'] = [
    {
      label: 'Discord API',
      status: online ? (latencyMs > 800 ? 'degraded' : 'operational') : 'down',
      detail: online ? `${latencyMs}ms latency` : 'Disconnected',
    },
    {
      label: 'Deelo Bot',
      status: online ? 'operational' : 'down',
      detail: online ? `Serving ${guildCount.toLocaleString()} servers` : 'Offline',
    },
    {
      label: 'Database',
      status: dbOk ? 'operational' : 'degraded',
      detail: dbOk ? 'Connected' : 'Connection issue',
    },
    {
      label: 'Web Dashboard',
      status: dashboard.ok ? 'operational' : 'degraded',
      detail: dashboard.detail,
    },
  ];

  const overall = services.some((s) => s.status === 'down')
    ? 'down'
    : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'operational';

  return {
    status: overall,
    bot: {
      online,
      latencyMs,
      guildCount,
      shards: client.shard?.count ?? 1,
      checkedAt: new Date().toISOString(),
    },
    services,
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function buildStatusEmbed(data: StatusApiPayload, uptimeSec?: number): EmbedBuilder {
  const overall = data.status;
  const lines = data.services.map(
    (s) => `${STATUS_EMOJI[s.status]} **${s.label}** — ${s.detail}`,
  );

  const embed = new EmbedBuilder()
    .setColor(STATUS_COLOR[overall])
    .setTitle(`${STATUS_EMOJI[overall]} ${STATUS_TITLE}`)
    .setDescription(
      [
        overall === 'operational'
          ? '**All systems operational**'
          : overall === 'degraded'
            ? '**Partial degradation detected**'
            : '**Service disruption**',
        '',
        ...lines,
      ].join('\n'),
    )
    .addFields(
      {
        name: 'Servers',
        value: data.bot.guildCount.toLocaleString(),
        inline: true,
      },
      {
        name: 'API latency',
        value: data.bot.latencyMs != null ? `${data.bot.latencyMs}ms` : '—',
        inline: true,
      },
      {
        name: 'Shards',
        value: String(data.bot.shards ?? 1),
        inline: true,
      },
    )
    .setURL(`${primaryAppUrl()}/status`)
    .setFooter({ text: `deelo.bot/status · Updates every 5 min` })
    .setTimestamp(new Date(data.bot.checkedAt));

  if (uptimeSec != null) {
    embed.addFields({ name: 'Uptime', value: formatUptime(uptimeSec), inline: true });
  }

  return embed;
}

async function resolveStatusChannel(client: Client): Promise<TextChannel | null> {
  const channelId = process.env.STATUS_CHANNEL_ID;
  const guildId = process.env.STATUS_GUILD_ID || config.supportGuildId || process.env.OFFICIAL_GUILD_ID;

  if (channelId) {
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (ch?.isTextBased() && 'guild' in ch) {
      const channel = ch as TextChannel;
      if (guildId && channel.guildId !== guildId) {
        console.warn(`[status] Channel ${channelId} is not in configured guild ${guildId}`);
        return null;
      }
      return channel;
    }
  }

  if (!guildId) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;

  const byName = guild.channels.cache.find(
    (c) => c.isTextBased() && !c.isThread() && c.name === 'status' && c.type === ChannelType.GuildText,
  );
  if (byName && 'send' in byName) return byName as TextChannel;

  return null;
}

async function findExistingStatusMessage(channel: TextChannel, clientId: string) {
  if (statusMessageId) {
    const msg = await channel.messages.fetch(statusMessageId).catch(() => null);
    if (msg?.author.id === clientId) return msg;
  }

  const recent = await channel.messages.fetch({ limit: 25 }).catch(() => null);
  if (!recent) return null;
  return recent.find(
    (m) => m.author.id === clientId && m.embeds[0]?.title?.includes(STATUS_TITLE),
  ) ?? null;
}

export async function refreshStatusEmbed(client: Client): Promise<void> {
  if (!client.user) return;

  const channel = await resolveStatusChannel(client);
  if (!channel) {
    console.warn('[status] No #status channel — set STATUS_GUILD_ID + STATUS_CHANNEL_ID or name channel "status"');
    return;
  }

  const api = await fetchStatusApi();
  const data = api ?? await buildLocalStatus(client);
  const embed = buildStatusEmbed(data, process.uptime());

  const existing = await findExistingStatusMessage(channel, client.user.id);
  if (existing) {
    await existing.edit({ embeds: [embed], content: null });
    statusMessageId = existing.id;
    return;
  }

  const sent = await channel.send({ embeds: [embed] });
  statusMessageId = sent.id;
}

export function startStatusEmbedLoop(client: Client): void {
  const run = () => refreshStatusEmbed(client).catch((err) => console.error('[status] refresh failed:', err));

  client.once('ready', () => {
    setTimeout(run, 10_000);
    setInterval(run, REFRESH_MS);
  });
}
