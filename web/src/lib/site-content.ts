export type ContentStatus = 'draft' | 'published' | 'archived';
export type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'breaking';

export interface SiteAnnouncement {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  status: ContentStatus;
  pinned: boolean;
  show_banner: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteChangelogEntry {
  id: number;
  version: string | null;
  title: string;
  body: string;
  category: ChangelogCategory;
  status: 'draft' | 'published';
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscordSiteSettings {
  server_id: string;
  invite_url: string;
  widget_enabled: boolean;
}

export interface HeroSiteSettings {
  badge: string;
  show_latest_changelog: boolean;
}

export const CHANGELOG_CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  feature: 'New feature',
  improvement: 'Improvement',
  fix: 'Bug fix',
  breaking: 'Breaking change',
};

export const CHANGELOG_CATEGORY_COLORS: Record<ChangelogCategory, string> = {
  feature: 'badge-accent',
  improvement: 'badge-muted',
  fix: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  breaking: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

export function formatContentDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 text-sm font-mono text-accent">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');
}
