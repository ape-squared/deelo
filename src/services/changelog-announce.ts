import { EmbedBuilder, type Client, type TextChannel } from 'discord.js';
import { getSupabase } from '../database/supabase';
import { fetchAppJson, publicAppUrl, publicAppHost } from '../lib/app-urls';

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

function titleKey(title: string): string {
  return `title:${title.trim().toLowerCase()}`;
}

function dedupeChangelogEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  const byTitle = new Map<string, ChangelogEntry>();
  for (const entry of entries) {
    const key = titleKey(entry.title);
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, entry);
      continue;
    }
    const existingTime = new Date(existing.published_at ?? existing.id).getTime();
    const entryTime = new Date(entry.published_at ?? entry.id).getTime();
    if (entryTime >= existingTime) byTitle.set(key, entry);
  }
  return [...byTitle.values()];
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function embedTitleMatches(entry: ChangelogEntry, embedTitle: string | undefined): boolean {
  if (!embedTitle) return false;
  const normalized = embedTitle.replace(/^[^\s]+\s+/, '').trim().toLowerCase();
  return normalized === entry.title.trim().toLowerCase();
}

async function loadSyncState(): Promise<SyncState> {
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('key', SYNC_KEY)
    .maybeSingle();

  if (error) {
    console.warn('[changelog] Failed to load sync state:', error.message);
  }

  const value = data?.value as SyncState | undefined;
  if (value && Array.isArray(value.posted)) {
    return { posted: value.posted, initialized: !!value.initialized };
  }
  return { posted: [], initialized: false };
}

async function saveSyncState(state: SyncState): Promise<void> {
  const { error } = await getSupabase()
    .from('site_settings')
    .upsert(
      {
        key: SYNC_KEY,
        value: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (error) {
    console.warn('[changelog] Failed to save sync state:', error.message);
  }
}

async function fetchPublishedChangelogFromDb(): Promise<ChangelogEntry[]> {
  const { data, error } = await getSupabase()
    .from('site_changelog')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[changelog] DB fetch failed:', error.message);
    return [];
  }

  return (data ?? []) as ChangelogEntry[];
}

async function fetchPublishedChangelog(): Promise<ChangelogEntry[]> {
  const data = await fetchAppJson<{ entries: ChangelogEntry[] }>('/api/changelog');
  const fromApi = (data?.entries ?? []).filter((e) => e.status === 'published');
  if (fromApi.length) return fromApi;

  console.warn('[changelog] Web API returned no entries — falling back to Supabase');
  return fetchPublishedChangelogFromDb();
}

function buildChangelogEmbed(entry: ChangelogEntry): EmbedBuilder {
  const category = entry.category in CATEGORY_LABEL ? entry.category : 'improvement';
  const appUrl = publicAppUrl();
  const appHost = publicAppHost();

  return new EmbedBuilder()
    .setColor(CATEGORY_COLOR[category])
    .setTitle(`${CATEGORY_EMOJI[category]} ${entry.title}`)
    .setDescription(truncate(entry.body || `See the full changelog on ${appHost}.`, 1800))
    .addFields(
      { name: 'Category', value: CATEGORY_LABEL[category], inline: true },
      ...(entry.version ? [{ name: 'Version', value: entry.version, inline: true }] : []),
    )
    .setURL(`${appUrl}/changelog`)
    .setFooter({ text: `${appHost}/changelog` })
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

async function getChannelPostedKeys(
  channel: TextChannel,
  botId: string,
  entries: ChangelogEntry[],
): Promise<Set<string>> {
  const posted = new Set<string>();
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return posted;

  for (const message of messages.values()) {
    if (message.author.id !== botId || !message.embeds.length) continue;

    const embed = message.embeds[0];
    const footer = embed.footer?.text ?? '';
    if (!footer.includes('/changelog')) continue;

    const versionField = embed.fields?.find((field) => field.name === 'Version')?.value;
    const matchedTitles = new Set<string>();

    for (const entry of entries) {
      const key = entryKey(entry);
      if (posted.has(key)) continue;

      const versionMatch = !!entry.version && versionField === entry.version;
      const titleMatch = embedTitleMatches(entry, embed.title ?? undefined);
      if (versionMatch || titleMatch) {
        posted.add(key);
        posted.add(titleKey(entry.title));
        if (titleMatch) matchedTitles.add(entry.title.trim().toLowerCase());
      }
    }

    for (const entry of entries) {
      if (matchedTitles.has(entry.title.trim().toLowerCase())) {
        posted.add(entryKey(entry));
        posted.add(titleKey(entry.title));
      }
    }
  }

  return posted;
}

async function isEntryAlreadyPosted(
  channel: TextChannel,
  botId: string,
  entry: ChangelogEntry,
): Promise<boolean> {
  const messages = await channel.messages.fetch({ limit: 15 }).catch(() => null);
  if (!messages) return false;

  for (const message of messages.values()) {
    if (message.author.id !== botId || !message.embeds.length) continue;
    const embed = message.embeds[0];
    if (!(embed.footer?.text ?? '').includes('/changelog')) continue;

    const versionField = embed.fields?.find((field) => field.name === 'Version')?.value;
    if (entry.version && versionField === entry.version) return true;
    if (embedTitleMatches(entry, embed.title ?? undefined)) return true;
  }

  return false;
}

let changelogSyncInFlight = false;

export async function syncChangelogAnnouncements(client: Client): Promise<void> {
  if (!client.user || changelogSyncInFlight) return;
  changelogSyncInFlight = true;

  try {
    const channel = await resolveChangelogChannel(client);
    if (!channel) return;

    const entries = dedupeChangelogEntries(await fetchPublishedChangelog());
    if (!entries.length) {
      console.warn('[changelog] No published changelog entries found');
      return;
    }

    const sorted = [...entries].sort((a, b) => {
      const ta = new Date(a.published_at ?? a.id).getTime();
      const tb = new Date(b.published_at ?? b.id).getTime();
      return ta - tb;
    });

    const state = await loadSyncState();
    const inChannel = await getChannelPostedKeys(channel, client.user.id, sorted);
    const posted = new Set([...inChannel, ...state.posted]);

    let postedCount = 0;
    for (const entry of sorted) {
      const key = entryKey(entry);
      const tKey = titleKey(entry.title);
      if (posted.has(key) || posted.has(tKey)) continue;
      if (await isEntryAlreadyPosted(channel, client.user.id, entry)) {
        posted.add(key);
        posted.add(tKey);
        continue;
      }

      try {
        await channel.send({ embeds: [buildChangelogEmbed(entry)] });
        posted.add(key);
        posted.add(tKey);
        postedCount++;
      } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: number }).code : null;
        if (code === 50013) {
          console.error('[changelog] Missing permissions in #changelogs — need View Channel, Send Messages, Embed Links');
        } else {
          console.error(`[changelog] Failed to post "${entry.title}":`, err);
        }
      }
    }

    await saveSyncState({ posted: [...posted], initialized: true });

    if (postedCount > 0) {
      console.log(`[changelog] Posted ${postedCount} changelog entr${postedCount === 1 ? 'y' : 'ies'} to #changelogs`);
    } else {
      console.log(`[changelog] Up to date — ${posted.size} entr${posted.size === 1 ? 'y' : 'ies'} tracked`);
    }
  } finally {
    changelogSyncInFlight = false;
  }
}

export function startChangelogAnnounceLoop(client: Client): void {
  const run = () => syncChangelogAnnouncements(client).catch((err) => console.error('[changelog] sync failed:', err));

  client.once('ready', () => {
    setTimeout(run, 15_000);
    setInterval(run, POLL_MS);
  });
}
