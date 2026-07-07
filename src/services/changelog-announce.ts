import { EmbedBuilder, type Client, type TextChannel } from 'discord.js';
import { getSupabase } from '../database/supabase';
import { fetchAppJson, primaryAppUrl } from '../lib/app-urls';

const SYNC_KEY = 'discord_changelog_sync';
const POLL_MS = 5 * 60 * 1000;

type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'breaking';

interface ChangelogEntry {
  id: number;
  version: string | null;
  title: string;
  body: string;
  category: ChangelogCategory;
  status: 'draft' | 'published';
  published_at: string | null;
  created_by: string | null;
}

interface SyncState {
  posted: string[];
  initialized: boolean;
}

const CATEGORY_LABEL: Record<ChangelogCategory, string> = {
  feature: 'New feature',
  improvement: 'Improvement',
  fix: 'Bug fix',
  breaking: 'Breaking change',
};

const CATEGORY_COLOR: Record<ChangelogCategory, number> = {
  feature: 0x0047ff,
  improvement: 0x6366f1,
  fix: 0x22c55e,
  breaking: 0xed4245,
};

const CATEGORY_EMOJI: Record<ChangelogCategory, string> = {
  feature: '✨',
  improvement: '🔧',
  fix: '🐛',
  breaking: '⚠️',
};

function officialGuildId(): string {
  return (
    process.env.OFFICIAL_GUILD_ID ??
    process.env.SUPPORT_GUILD_ID ??
    process.env.STATUS_GUILD_ID ??
    '1523831534799425576'
  );
}

function changelogChannelId(): string {
  return process.env.CHANGELOG_CHANNEL_ID ?? '1523875521975287869';
}

function entryKey(entry: ChangelogEntry): string {
  if (entry.version) return `v:${entry.version}`;
  return `id:${entry.id}`;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function loadSyncState(): Promise<SyncState> {
  const { data } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('key', SYNC_KEY)
    .maybeSingle();

  const value = data?.value as SyncState | undefined;
  if (value && Array.isArray(value.posted)) {
    return { posted: value.posted, initialized: !!value.initialized };
  }
  return { posted: [], initialized: false };
}

async function saveSyncState(state: SyncState): Promise<void> {
  await getSupabase()
    .from('site_settings')
    .upsert({
      key: SYNC_KEY,
      value: state,
      updated_at: new Date().toISOString(),
    });
}

async function fetchPublishedChangelog(): Promise<ChangelogEntry[]> {
  const data = await fetchAppJson<{ entries: ChangelogEntry[] }>('/api/changelog');
  return (data?.entries ?? []).filter((e) => e.status === 'published');
}

function buildChangelogEmbed(entry: ChangelogEntry): EmbedBuilder {
  const category = entry.category in CATEGORY_LABEL ? entry.category : 'improvement';
  const appUrl = primaryAppUrl();

  return new EmbedBuilder()
    .setColor(CATEGORY_COLOR[category])
    .setTitle(`${CATEGORY_EMOJI[category]} ${entry.title}`)
    .setDescription(truncate(entry.body || 'See the full changelog on deelo.bot.', 1800))
    .addFields(
      { name: 'Category', value: CATEGORY_LABEL[category], inline: true },
      ...(entry.version ? [{ name: 'Version', value: entry.version, inline: true }] : []),
    )
    .setURL(`${appUrl}/changelog`)
    .setFooter({ text: 'deelo.bot/changelog' })
    .setTimestamp(entry.published_at ? new Date(entry.published_at) : new Date());
}

async function resolveChangelogChannel(client: Client): Promise<TextChannel | null> {
  const guildId = officialGuildId();
  const channelId = changelogChannelId();

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch?.isTextBased() || !('guild' in ch)) {
    console.warn('[changelog] Changelog channel not found:', channelId);
    return null;
  }

  const channel = ch as TextChannel;
  if (channel.guildId !== guildId) {
    console.warn(
      `[changelog] Channel ${channelId} is in guild ${channel.guildId}, expected official guild ${guildId} — skipping`,
    );
    return null;
  }

  return channel;
}

export async function syncChangelogAnnouncements(client: Client): Promise<void> {
  if (!client.user) return;

  const channel = await resolveChangelogChannel(client);
  if (!channel) return;

  const entries = await fetchPublishedChangelog();
  if (!entries.length) return;

  const sorted = [...entries].sort((a, b) => {
    const ta = new Date(a.published_at ?? a.id).getTime();
    const tb = new Date(b.published_at ?? b.id).getTime();
    return ta - tb;
  });

  let state = await loadSyncState();
  const posted = new Set(state.posted);

  if (!state.initialized) {
    for (const entry of sorted) posted.add(entryKey(entry));
    state = { posted: [...posted], initialized: true };
    await saveSyncState(state);
    console.log(`[changelog] Baseline set — tracking ${posted.size} existing entries without reposting`);
    return;
  }

  let postedCount = 0;
  for (const entry of sorted) {
    const key = entryKey(entry);
    if (posted.has(key)) continue;

    await channel.send({ embeds: [buildChangelogEmbed(entry)] });
    posted.add(key);
    postedCount++;
  }

  if (postedCount > 0) {
    state = { posted: [...posted], initialized: true };
    await saveSyncState(state);
    console.log(`[changelog] Posted ${postedCount} new changelog entr${postedCount === 1 ? 'y' : 'ies'} to #changelogs`);
  }
}

export function startChangelogAnnounceLoop(client: Client): void {
  const run = () => syncChangelogAnnouncements(client).catch((err) => console.error('[changelog] sync failed:', err));

  client.once('ready', () => {
    setTimeout(run, 15_000);
    setInterval(run, POLL_MS);
  });
}
