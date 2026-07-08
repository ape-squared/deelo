import { createAdminClient } from '@/lib/supabase/admin';

export type FeatureCategory = 'feature' | 'improvement' | 'bug' | 'other';
export type FeatureStatus =
  | 'open'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'declined';

export interface FeatureRequest {
  id: number;
  title: string;
  slug: string;
  body: string;
  category: FeatureCategory;
  status: FeatureStatus;
  author_discord_id: string;
  author_username: string;
  vote_score: number;
  staff_response: string | null;
  staff_responder_id: string | null;
  pinned: boolean;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, string> = {
  feature: 'Feature',
  improvement: 'Improvement',
  bug: 'Bug',
  other: 'Other',
};

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
  declined: 'Declined',
};

export const FEATURE_STATUS_COLORS: Record<FeatureStatus, string> = {
  open: 'badge-accent',
  under_review: 'badge-muted',
  planned: 'border border-sky-500/30 text-sky-400',
  in_progress: 'border border-amber-500/30 text-amber-400',
  completed: 'border border-green-500/30 text-green-400',
  declined: 'border border-red-500/30 text-red-400',
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'request';
}

async function uniqueSlug(base: string): Promise<string> {
  const db = createAdminClient();
  let slug = base;
  let n = 0;
  while (n < 20) {
    const { data } = await db.from('feature_requests').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    n++;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function listFeatureRequests(options: {
  sort?: 'top' | 'new';
  status?: FeatureStatus | 'all';
  includeHidden?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<FeatureRequest[]> {
  const db = createAdminClient();
  let q = db.from('feature_requests').select('*');

  if (!options.includeHidden) q = q.eq('hidden', false);
  if (options.status && options.status !== 'all') q = q.eq('status', options.status);

  if (options.sort === 'new') {
    q = q.order('pinned', { ascending: false }).order('created_at', { ascending: false });
  } else {
    q = q.order('pinned', { ascending: false }).order('vote_score', { ascending: false }).order('created_at', { ascending: false });
  }

  if (options.limit) q = q.limit(options.limit);
  if (options.offset) q = q.range(options.offset, options.offset + (options.limit ?? 50) - 1);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FeatureRequest[];
}

export async function getFeatureRequestBySlug(slug: string, includeHidden = false): Promise<FeatureRequest | null> {
  const db = createAdminClient();
  let q = db.from('feature_requests').select('*').eq('slug', slug);
  if (!includeHidden) q = q.eq('hidden', false);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FeatureRequest | null) ?? null;
}

export async function getFeatureRequestById(id: number): Promise<FeatureRequest | null> {
  const db = createAdminClient();
  const { data, error } = await db.from('feature_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FeatureRequest | null) ?? null;
}

export async function getUserVotes(discordId: string, requestIds: number[]): Promise<Set<number>> {
  if (!requestIds.length) return new Set();
  const db = createAdminClient();
  const { data } = await db
    .from('feature_votes')
    .select('request_id')
    .eq('discord_id', discordId)
    .in('request_id', requestIds);
  return new Set((data ?? []).map((r) => r.request_id as number));
}

export async function createFeatureRequest(input: {
  title: string;
  body: string;
  category: FeatureCategory;
  authorDiscordId: string;
  authorUsername: string;
}): Promise<FeatureRequest> {
  const db = createAdminClient();
  const slug = await uniqueSlug(slugify(input.title));
  const { data, error } = await db
    .from('feature_requests')
    .insert({
      title: input.title.slice(0, 200),
      slug,
      body: input.body.slice(0, 8000),
      category: input.category,
      author_discord_id: input.authorDiscordId,
      author_username: input.authorUsername.slice(0, 64),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FeatureRequest;
}

export async function toggleFeatureVote(requestId: number, discordId: string): Promise<{ voted: boolean; voteScore: number }> {
  const db = createAdminClient();
  const { data: existing } = await db
    .from('feature_votes')
    .select('request_id')
    .eq('request_id', requestId)
    .eq('discord_id', discordId)
    .maybeSingle();

  if (existing) {
    await db.from('feature_votes').delete().eq('request_id', requestId).eq('discord_id', discordId);
  } else {
    const { error } = await db.from('feature_votes').insert({ request_id: requestId, discord_id: discordId });
    if (error) throw new Error(error.message);
  }

  const { count } = await db
    .from('feature_votes')
    .select('*', { count: 'exact', head: true })
    .eq('request_id', requestId);

  const voteScore = count ?? 0;
  await db.from('feature_requests').update({ vote_score: voteScore, updated_at: new Date().toISOString() }).eq('id', requestId);

  return { voted: !existing, voteScore };
}

export async function updateFeatureRequest(
  id: number,
  updates: Partial<Pick<FeatureRequest, 'title' | 'body' | 'category' | 'status' | 'staff_response' | 'staff_responder_id' | 'pinned' | 'hidden'>>,
): Promise<FeatureRequest> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('feature_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FeatureRequest;
}

export async function listFeatureRequestsAdmin(): Promise<FeatureRequest[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('feature_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeatureRequest[];
}
