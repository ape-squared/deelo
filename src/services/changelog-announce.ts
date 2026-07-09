import { EmbedBuilder, type APIEmbed, type Client, type Message, type TextChannel } from 'discord.js';
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
  fingerprints?: Record<string, string>;
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

/** Daily git bundles share a title — key by release day so content updates can edit the embed. */
function releaseDayKey(entry: ChangelogEntry): string | null {
  const day = entry.published_at?.slice(0, 10);
  if (!day) return null;
  if (entry.title.trim().toLowerCase().startsWith('updates for')) return `release:${day}`;
  return null;
}

function releaseDayFromEmbed(embed: APIEmbed): string | null {
  const dayField = embed.fields?.find((field) => field.name === 'Release Day')?.value?.trim();
  if (dayField) return dayField;
  return null;
}

function entryKey(entry: ChangelogEntry): string {
  const dayKey = releaseDayKey(entry);
  if (dayKey) return dayKey;
  if (entry.version) return `v:${entry.version}`;
  return `id:${entry.id}`;
}

function titleKey(title: string): string {
  return `title:${title.trim().toLowerCase()}`;
}

function contentFingerprint(entry: ChangelogEntry): string {
  return `${entry.version ?? ''}|${entry.category}|${entry.body.trim()}`;
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

function embedBodyFromEntry(entry: ChangelogEntry): string {
  return truncate(entry.body || `See the full changelog on ${publicAppHost()}.`, 1800);
}

function embedNeedsUpdate(embed: APIEmbed, entry: ChangelogEntry): boolean {
  const category = entry.category in CATEGORY_LABEL ? entry.category : 'improvement';
  const versionField = embed.fields?.find((field) => field.name === 'Version')?.value;
  if (entry.version && versionField !== entry.version) return true;

  const categoryField = embed.fields?.find((field) => field.name === 'Category')?.value;
  if (categoryField && categoryField !== CATEGORY_LABEL[category]) return true;

  const expectedDesc = embedBodyFromEntry(entry);
  const actualDesc = (embed.description ?? '').trim();
  return actualDesc !== expectedDesc.trim();
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
    return {
      posted: value.posted,
      initialized: !!value.initialized,
      fingerprints: value.fingerprints ?? {},
    };
  }
  return { posted: [], initialized: false, fingerprints: {} };
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
  const dayKey = releaseDayKey(entry);

  return new EmbedBuilder()
    .setColor(CATEGORY_COLOR[category])
    .setTitle(`${CATEGORY_EMOJI[category]} ${entry.title}`)
    .setDescription(embedBodyFromEntry(entry))
    .addFields(
      { name: 'Category', value: CATEGORY_LABEL[category], inline: true },
      ...(entry.version ? [{ name: 'Version', value: entry.version, inline: true }] : []),
      ...(dayKey ? [{ name: 'Release Day', value: dayKey, inline: false }] : []),
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

async function fetchChangelogMessages(channel: TextChannel, botId: string): Promise<Message[]> {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return [];

  return [...messages.values()].filter((message) => {
    if (message.author.id !== botId || !message.embeds.length) return false;
    return (message.embeds[0].footer?.text ?? '').includes('/changelog');
  });
}

function messageMatchesEntry(message: Message, entry: ChangelogEntry): boolean {
  const embed = message.embeds[0];
  const dayKey = releaseDayKey(entry);
  if (dayKey) {
    const embedDay = releaseDayFromEmbed(embed.data);
    if (embedDay) return embedDay === dayKey;
    return embedTitleMatches(entry, embed.title ?? undefined);
  }
  if (embedTitleMatches(entry, embed.title ?? undefined)) return true;
  const versionField = embed.fields?.find((field) => field.name === 'Version')?.value;
  if (entry.version && versionField === entry.version) return true;
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

    const channelMessages = await fetchChangelogMessages(channel, client.user.id);
    const state = await loadSyncState();
    const fingerprints = { ...(state.fingerprints ?? {}) };
    const posted = new Set(state.posted);

    let postedCount = 0;
    let updatedCount = 0;

    for (const entry of sorted) {
      const key = entryKey(entry);
      const fp = contentFingerprint(entry);
      const existing = channelMessages.find((message) => messageMatchesEntry(message, entry));

      if (existing) {
        if (embedNeedsUpdate(existing.embeds[0].data, entry)) {
          try {
            await existing.edit({ embeds: [buildChangelogEmbed(entry)] });
            updatedCount++;
            console.log(`[changelog] Updated "${entry.title}" → ${entry.version ?? key}`);
          } catch (err) {
            const code = err && typeof err === 'object' && 'code' in err ? (err as { code: number }).code : null;
            if (code === 50013) {
              console.error('[changelog] Missing permissions to edit changelog embeds');
            } else {
              console.error(`[changelog] Failed to update "${entry.title}":`, err);
            }
          }
        }
        fingerprints[key] = fp;
        posted.add(key);
        posted.add(titleKey(entry.title));
        continue;
      }

      if (posted.has(key) && fingerprints[key] === fp) continue;

      try {
        const sent = await channel.send({ embeds: [buildChangelogEmbed(entry)] });
        channelMessages.push(sent);
        posted.add(key);
        posted.add(titleKey(entry.title));
        fingerprints[key] = fp;
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

    await saveSyncState({ posted: [...posted], initialized: true, fingerprints });

    if (postedCount > 0 || updatedCount > 0) {
      const parts: string[] = [];
      if (postedCount) parts.push(`${postedCount} posted`);
      if (updatedCount) parts.push(`${updatedCount} updated`);
      console.log(`[changelog] Sync complete — ${parts.join(', ')}`);
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
