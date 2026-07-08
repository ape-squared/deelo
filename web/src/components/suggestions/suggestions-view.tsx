'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowBigUp, ChevronDown, Lightbulb, Loader2, Plus, Search,
} from 'lucide-react';
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_COLORS,
  FEATURE_STATUS_LABELS,
  type FeatureRequest,
  type FeatureStatus,
} from '@/lib/feature-requests';
import { discordAvatarUrl } from '@/lib/discord-avatar';

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

export function SuggestionsBoard() {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [status, setStatus] = useState<FeatureStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set());

  const loadAuth = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    if (res.ok) setAuth(await res.json());
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, status });
    const res = await fetch(`/api/suggestions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests ?? []);
      if (data.userVotes?.length) setVotedIds(new Set(data.userVotes));
    }
    setLoading(false);
  }, [sort, status]);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleVote(id: number) {
    if (!auth.authenticated) {
      window.location.href = `/api/auth/discord?return=${encodeURIComponent('/suggestions')}`;
      return;
    }
    if (!auth.officialMember) {
      window.open(auth.officialGuildInvite || 'https://discord.gg/deelo', '_blank');
      return;
    }
    const res = await fetch(`/api/suggestions/vote/${id}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return;
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
    <div className="mx-auto max-w-4xl lg:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${sort === s ? 'bg-accent text-white' : 'border border-border text-muted hover:text-foreground'}`}
            >
              {s === 'top' ? 'Top' : 'New'}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus className="h-4 w-4" />
          Submit idea
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
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

      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input w-full pl-10"
          placeholder="Search suggestions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!auth.authenticated && (
        <div className="card mb-8 border-accent/25 bg-accent/5 p-5 text-sm">
          <p className="font-medium">Sign in with Discord to submit and vote on ideas.</p>
          <a href="/api/auth/discord?return=/suggestions" className="btn-primary mt-3 inline-flex text-sm">
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

      {showForm && (
        <SubmitForm
          auth={auth}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            void loadRequests();
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : !filtered.length ? (
        <div className="card p-12 text-center text-muted">
          <Lightbulb className="mx-auto mb-4 h-10 w-10 opacity-40" />
          <p>No suggestions yet. Be the first to submit an idea!</p>
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

function SubmitForm({
  auth,
  onClose,
  onCreated,
}: {
  auth: AuthState;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('feature');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.authenticated) {
      window.location.href = `/api/auth/discord?return=${encodeURIComponent('/suggestions')}`;
      return;
    }
    if (!auth.officialMember) {
      setError('Join the official Deelo Discord server first.');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, category }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || 'Failed to submit');
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <form onSubmit={submit} className="card w-full max-w-lg p-6 animate-fade-up">
        <h2 className="text-xl font-bold mb-4">Submit a suggestion</h2>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <label className="label">Title</label>
        <input className="input mb-4 w-full" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        <label className="label">Category</label>
        <div className="relative mb-4">
          <select className="input w-full appearance-none pr-10" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="bug">Bug</option>
            <option value="other">Other</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
        <label className="label">Description</label>
        <textarea className="input mb-6 min-h-[120px] w-full resize-y" value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} required />
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SuggestionDetail({ slug }: { slug: string }) {
  const [request, setRequest] = useState<FeatureRequest | null>(null);
  const [userVoted, setUserVoted] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/auth/me').then(async (r) => { if (r.ok) setAuth(await r.json()); });
    void fetch(`/api/suggestions/${slug}`)
      .then(async (r) => r.json())
      .then((d) => {
        setRequest(d.request ?? null);
        setUserVoted(Boolean(d.userVoted));
        setLoading(false);
      });
  }, [slug]);

  async function vote() {
    if (!request) return;
    if (!auth.authenticated) {
      window.location.href = `/api/auth/discord?return=${encodeURIComponent(`/suggestions/${slug}`)}`;
      return;
    }
    const res = await fetch(`/api/suggestions/vote/${request.id}`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setUserVoted(data.voted);
      setRequest((r) => (r ? { ...r, vote_score: data.voteScore } : r));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!request) {
    return <div className="card p-12 text-center text-muted">Suggestion not found.</div>;
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
