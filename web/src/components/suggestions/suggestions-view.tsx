'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowBigUp, ChevronDown, Lightbulb, Loader2, Plus, RefreshCw,
} from 'lucide-react';
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_COLORS,
  FEATURE_STATUS_LABELS,
  type FeatureRequest,
  type FeatureStatus,
} from '@/lib/feature-requests';
import { discordAvatarUrl } from '@/lib/discord-avatar';
import { SearchField } from '@/components/search-field';
import { Modal } from '@/components/ui/modal';
import { PageRelatedLinks } from '@/components/marketing/page-related-links';

type AuthState = {
  authenticated: boolean;
  officialMember?: boolean;
  officialGuildInvite?: string;
  user?: { id: string; username: string; avatar: string | null };
};

const STATUS_FILTERS: Array<{ id: FeatureStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'planned', label: 'Planned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

function loginUrl(returnPath: string) {
  return `/api/auth/discord?return=${encodeURIComponent(returnPath)}`;
}

export function SuggestionsBoard() {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [status, setStatus] = useState<FeatureStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set());

  const loadAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) setAuth(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ sort, status });
      const res = await fetch(`/api/suggestions?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || 'Failed to load suggestions');
        setRequests([]);
        return;
      }
      setRequests(data.requests ?? []);
      setVotedIds(new Set(data.userVotes ?? []));
    } catch {
      setLoadError('Could not reach the server. Try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [sort, status]);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  function openSubmitForm() {
    setActionError('');
    if (!auth.authenticated) {
      window.location.href = loginUrl('/suggestions');
      return;
    }
    if (!auth.officialMember) {
      setActionError('Join the official Deelo Discord server to submit ideas.');
      return;
    }
    setShowForm(true);
  }

  async function handleVote(id: number) {
    setActionError('');
    if (!auth.authenticated) {
      window.location.href = loginUrl('/suggestions');
      return;
    }
    if (!auth.officialMember) {
      window.open(auth.officialGuildInvite || 'https://discord.gg/deelo', '_blank');
      setActionError('Join the official Deelo Discord server to vote.');
      return;
    }

    const res = await fetch(`/api/suggestions/vote/${id}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Could not register your vote.');
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, vote_score: data.voteScore } : r)));
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (data.voted) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const filtered = requests.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      <div className="content-page-toolbar">
        <div className="flex gap-2">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${sort === s ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'border border-border text-muted hover:border-accent/25 hover:text-foreground'}`}
            >
              {s === 'top' ? 'Top' : 'New'}
            </button>
          ))}
        </div>
        <button type="button" onClick={openSubmitForm} className="btn-primary text-sm">
          <Plus className="h-4 w-4" />
          Submit idea
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatus(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${status === f.id ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <SearchField
        className="mb-8"
        placeholder="Search suggestions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search suggestions"
      />

      {actionError && (
        <div className="card mb-6 border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {actionError}
        </div>
      )}

      {!auth.authenticated && (
        <div className="card mb-8 border-accent/25 bg-accent/5 p-5 text-sm">
          <p className="font-medium">Sign in with Discord to submit and vote on ideas.</p>
          <a href={loginUrl('/suggestions')} className="btn-primary mt-3 inline-flex text-sm">
            Continue with Discord
          </a>
        </div>
      )}

      {auth.authenticated && !auth.officialMember && (
        <div className="card mb-8 border-amber-500/30 bg-amber-500/10 p-5 text-sm">
          <p className="font-medium text-amber-200">Join the official Deelo Discord to submit and vote.</p>
          <p className="mt-1 text-muted">Dashboard and community features require membership in our server.</p>
          <a
            href={auth.officialGuildInvite || 'https://discord.gg/deelo'}
            className="btn-primary mt-3 inline-flex text-sm"
            target="_blank"
            rel="noreferrer"
          >
            Join Discord server
          </a>
        </div>
      )}

      <SubmitFormModal
        open={showForm}
        auth={auth}
        onClose={() => setShowForm(false)}
        onCreated={() => {
          setShowForm(false);
          void loadRequests();
        }}
        onError={setActionError}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : loadError ? (
        <div className="card p-12 text-center">
          <p className="text-red-300 mb-4">{loadError}</p>
          <button type="button" onClick={() => void loadRequests()} className="btn-secondary text-sm">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="card p-12 text-center text-muted">
          <Lightbulb className="mx-auto mb-4 h-10 w-10 opacity-40" />
          <p>{search.trim() ? 'No suggestions match your search.' : 'No suggestions yet. Be the first to submit an idea!'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <SuggestionCard
              key={r.id}
              request={r}
              voted={votedIds.has(r.id)}
              onVote={() => void handleVote(r.id)}
            />
          ))}
        </div>
      )}

      <PageRelatedLinks
        className="mt-12"
        links={[
          { href: '/changelog', label: 'Changelog' },
          { href: '/support', label: 'Support' },
          { href: '/docs', label: 'Documentation' },
        ]}
      />
    </div>
  );
}

function SuggestionCard({
  request: r,
  voted,
  onVote,
}: {
  request: FeatureRequest;
  voted: boolean;
  onVote: () => void;
}) {
  return (
    <article className="suggestion-card card flex gap-4 p-4 sm:p-5">
      <button
        type="button"
        onClick={onVote}
        className={`suggestion-vote flex shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-2 transition ${voted ? 'border-accent bg-accent/15 text-accent' : 'border-border hover:border-accent/40'}`}
        aria-label={voted ? 'Remove upvote' : 'Upvote'}
      >
        <ArrowBigUp className={`h-5 w-5 ${voted ? 'fill-current' : ''}`} />
        <span className="text-sm font-bold tabular-nums">{r.vote_score}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`badge text-[10px] ${FEATURE_STATUS_COLORS[r.status]}`}>
            {FEATURE_STATUS_LABELS[r.status]}
          </span>
          <span className="badge badge-muted text-[10px]">{FEATURE_CATEGORY_LABELS[r.category]}</span>
          {r.pinned && <span className="badge badge-accent text-[10px]">Pinned</span>}
        </div>
        <Link href={`/suggestions/${r.slug}`} className="text-lg font-semibold hover:text-accent transition">
          {r.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{r.body}</p>
        <p className="mt-2 text-xs text-muted">
          by {r.author_username} · {new Date(r.created_at).toLocaleDateString()}
        </p>
      </div>
    </article>
  );
}

function SubmitFormModal({
  open,
  auth,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  auth: AuthState;
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('feature');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setTitle('');
      setBody('');
      setCategory('feature');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.authenticated) {
      window.location.href = loginUrl('/suggestions');
      return;
    }
    if (!auth.officialMember) {
      setError('Join the official Deelo Discord server first.');
      return;
    }
    setSubmitting(true);
    setError('');
    onError('');

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Failed to submit';
        setError(msg);
        onError(msg);
        return;
      }
      onCreated();
    } catch {
      const msg = 'Network error — could not submit.';
      setError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Submit a suggestion">
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="label" htmlFor="suggestion-title">Title</label>
          <input
            id="suggestion-title"
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="suggestion-category">Category</label>
          <div className="relative">
            <select
              id="suggestion-category"
              className="input w-full appearance-none pr-10"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="feature">Feature</option>
              <option value="improvement">Improvement</option>
              <option value="bug">Bug</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="suggestion-body">Description</label>
          <textarea
            id="suggestion-body"
            className="input min-h-[120px] w-full resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
            required
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SuggestionDetail({ slug }: { slug: string }) {
  const [request, setRequest] = useState<FeatureRequest | null>(null);
  const [userVoted, setUserVoted] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    void fetch('/api/auth/me', { cache: 'no-store' }).then(async (r) => {
      if (r.ok) setAuth(await r.json());
    });
    void fetch(`/api/suggestions/${slug}`, { cache: 'no-store' })
      .then(async (r) => r.json())
      .then((d) => {
        if (d.error && !d.request) {
          setLoadError(d.error);
          setRequest(null);
        } else {
          setRequest(d.request ?? null);
          setUserVoted(Boolean(d.userVoted));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Could not load this suggestion.');
        setLoading(false);
      });
  }, [slug]);

  async function vote() {
    if (!request) return;
    setActionError('');
    if (!auth.authenticated) {
      window.location.href = loginUrl(`/suggestions/${slug}`);
      return;
    }
    if (!auth.officialMember) {
      window.open(auth.officialGuildInvite || 'https://discord.gg/deelo', '_blank');
      setActionError('Join the official Deelo Discord server to vote.');
      return;
    }
    const res = await fetch(`/api/suggestions/vote/${request.id}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Could not register your vote.');
      return;
    }
    setUserVoted(data.voted);
    setRequest((r) => (r ? { ...r, vote_score: data.voteScore } : r));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (loadError || !request) {
    return <div className="card p-12 text-center text-muted">{loadError || 'Suggestion not found.'}</div>;
  }

  return (
    <article className="card p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`badge text-xs ${FEATURE_STATUS_COLORS[request.status]}`}>{FEATURE_STATUS_LABELS[request.status]}</span>
        <span className="badge badge-muted text-xs">{FEATURE_CATEGORY_LABELS[request.category]}</span>
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">{request.title}</h1>
      <div className="mt-4 flex items-center gap-3 text-sm text-muted">
        <img
          src={discordAvatarUrl(request.author_discord_id, null, 32)}
          alt=""
          className="h-8 w-8 rounded-full"
        />
        <span>{request.author_username}</span>
        <span>·</span>
        <span>{new Date(request.created_at).toLocaleDateString()}</span>
      </div>
      <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{request.body}</div>
      {request.staff_response && (
        <div className="mt-8 rounded-xl border border-accent/25 bg-accent/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Team response</p>
          <p className="text-sm whitespace-pre-wrap">{request.staff_response}</p>
        </div>
      )}
      {actionError && (
        <p className="mt-6 text-sm text-red-400">{actionError}</p>
      )}
      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => void vote()}
          className={`suggestion-vote inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold transition ${userVoted ? 'border-accent bg-accent/15 text-accent' : 'border-border hover:border-accent/40'}`}
        >
          <ArrowBigUp className={`h-5 w-5 ${userVoted ? 'fill-current' : ''}`} />
          {request.vote_score}
        </button>
        <Link href="/suggestions" className="btn-secondary text-sm">Back to all</Link>
      </div>
    </article>
  );
}
