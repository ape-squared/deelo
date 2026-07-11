import type { ChangelogCategory, SiteChangelogEntry } from '@/lib/site-content';
import releasesData from '@/data/releases.json';

export interface ReleaseItem {
  title: string;
  category: ChangelogCategory;
  hash?: string;
}

export interface AutoRelease {
  id: string;
  version: string;
  title: string;
  body: string;
  category: ChangelogCategory;
  published_at: string;
  items: ReleaseItem[];
  source: 'git';
}

interface ReleasesFile {
  generated_at: string;
  latest: AutoRelease | null;
  releases: AutoRelease[];
}

const data = releasesData as ReleasesFile;

export function getAutoReleases(): AutoRelease[] {
  return data.releases ?? [];
}

export function getLatestAutoRelease(): AutoRelease | null {
  return data.latest ?? data.releases?.[0] ?? null;
}

function autoToChangelogEntry(release: AutoRelease, index: number): SiteChangelogEntry {
  return {
    id: -(index + 1),
    version: release.version,
    title: release.title,
    body: release.body,
    category: release.category,
    status: 'published',
    published_at: release.published_at,
    created_by: 'git',
    created_at: release.published_at,
    updated_at: release.published_at,
  };
}

function isDailyBundle(title: string): boolean {
  return title.trim().toLowerCase().startsWith('updates for');
}

export async function getMergedChangelog(dbEntries: SiteChangelogEntry[]): Promise<SiteChangelogEntry[]> {
  const auto = getAutoReleases().map(autoToChangelogEntry);
  const dbVersions = new Set(dbEntries.map((e) => e.version).filter(Boolean));
  const dbTitles = new Set(dbEntries.map((e) => e.title.toLowerCase()));

  const dbDailyByTitle = new Map<string, SiteChangelogEntry>();
  for (const entry of dbEntries) {
    if (isDailyBundle(entry.title)) {
      dbDailyByTitle.set(entry.title.toLowerCase(), entry);
    }
  }

  const filteredAuto = auto.filter((entry) => {
    if (isDailyBundle(entry.title)) {
      const dbMatch = dbDailyByTitle.get(entry.title.toLowerCase());
      if (!dbMatch) return true;
      const autoTime = new Date(entry.published_at ?? entry.created_at).getTime();
      const dbTime = new Date(dbMatch.published_at ?? dbMatch.created_at).getTime();
      return autoTime >= dbTime;
    }
    return !dbVersions.has(entry.version) && !dbTitles.has(entry.title.toLowerCase());
  });

  const autoDailyTitles = new Set(
    filteredAuto.filter((e) => isDailyBundle(e.title)).map((e) => e.title.toLowerCase()),
  );

  const filteredDb = dbEntries.filter((entry) => {
    if (!isDailyBundle(entry.title)) return true;
    return !autoDailyTitles.has(entry.title.toLowerCase());
  });

  return [...filteredDb, ...filteredAuto].sort((a, b) => {
    const ta = new Date(a.published_at ?? a.created_at).getTime();
    const tb = new Date(b.published_at ?? b.created_at).getTime();
    return tb - ta;
  });
}

export function isAutoChangelogEntry(entry: SiteChangelogEntry): boolean {
  return entry.id < 0 || entry.created_by === 'git';
}
