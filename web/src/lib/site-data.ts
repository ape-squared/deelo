import { createAdminClient } from '@/lib/supabase/admin';
import type { DiscordSiteSettings, HeroSiteSettings, SiteAnnouncement, SiteChangelogEntry } from '@/lib/site-content';
import { getDiscordInviteUrl, getDiscordServerId } from '@/lib/runtime-env';

function isMissingTableError(message: string): boolean {
  return message.includes('site_') || message.includes('does not exist') || message.includes('schema cache');
}

function handleDbError(error: { message: string } | null): void {
  if (!error) return;
  if (isMissingTableError(error.message)) {
    const err = new Error(error.message);
    (err as Error & { missingTable: boolean }).missingTable = true;
    throw err;
  }
  throw error;
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '';
    if (isMissingTableError(msg) || (e as { missingTable?: boolean })?.missingTable) return fallback;
    throw e;
  }
}

export async function getPublishedAnnouncements(limit = 20): Promise<SiteAnnouncement[]> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db
      .from('site_announcements')
      .select('*')
      .eq('status', 'published')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) handleDbError(error);
    return (data ?? []) as SiteAnnouncement[];
  }, []);
}

export async function getAnnouncementBySlug(slug: string): Promise<SiteAnnouncement | null> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db
      .from('site_announcements')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) handleDbError(error);
    return (data as SiteAnnouncement) ?? null;
  }, null);
}

export async function getBannerAnnouncement(): Promise<SiteAnnouncement | null> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db
      .from('site_announcements')
      .select('*')
      .eq('status', 'published')
      .eq('show_banner', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) handleDbError(error);
    return (data as SiteAnnouncement) ?? null;
  }, null);
}

export async function getPublishedChangelog(limit = 50): Promise<SiteChangelogEntry[]> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db
      .from('site_changelog')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) handleDbError(error);
    return (data ?? []) as SiteChangelogEntry[];
  }, []);
}

export async function getLatestChangelog(): Promise<SiteChangelogEntry | null> {
  const entries = await getPublishedChangelog(1);
  return entries[0] ?? null;
}

export async function getDiscordSettings(): Promise<DiscordSiteSettings> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db.from('site_settings').select('value').eq('key', 'discord').maybeSingle();
    if (error) handleDbError(error);
    const v = (data?.value ?? {}) as Partial<DiscordSiteSettings>;
    return {
      server_id: v.server_id ?? getDiscordServerId() ?? '',
      invite_url: v.invite_url ?? getDiscordInviteUrl() ?? '',
      widget_enabled: v.widget_enabled !== false,
    };
  }, {
    server_id: getDiscordServerId() ?? '',
    invite_url: getDiscordInviteUrl() ?? '',
    widget_enabled: true,
  });
}

export async function getHeroSettings(): Promise<HeroSiteSettings> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db.from('site_settings').select('value').eq('key', 'hero').maybeSingle();
    if (error) handleDbError(error);
    const v = (data?.value ?? {}) as Partial<HeroSiteSettings>;
    return {
      badge: v.badge ?? 'Deelo v2 — live dashboard sync',
      show_latest_changelog: v.show_latest_changelog !== false,
    };
  }, {
    badge: 'Deelo v2 — live dashboard sync',
    show_latest_changelog: true,
  });
}

export async function getAllAnnouncementsAdmin(): Promise<SiteAnnouncement[]> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db
      .from('site_announcements')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) handleDbError(error);
    return (data ?? []) as SiteAnnouncement[];
  }, []);
}

export async function getAllChangelogAdmin(): Promise<SiteChangelogEntry[]> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db
      .from('site_changelog')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) handleDbError(error);
    return (data ?? []) as SiteChangelogEntry[];
  }, []);
}

export async function getSiteSettingsAdmin(): Promise<Record<string, unknown>> {
  return safeQuery(async () => {
    const db = createAdminClient();
    const { data, error } = await db.from('site_settings').select('key, value');
    if (error) handleDbError(error);
    const map: Record<string, unknown> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  }, {});
}
