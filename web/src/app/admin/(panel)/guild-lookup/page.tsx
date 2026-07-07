'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function GuildLookupPage() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [list, setList] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin/guild-lookup?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Lookup failed');
      return;
    }
    if (data.guild) setResult(data);
    else setList(data.guilds ?? []);
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-bold mb-2">Guild lookup</h1>
      <p className="text-muted text-sm mb-6">Search by guild ID or browse recent servers.</p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={search} className="flex gap-2 mb-8">
        <input className="input font-mono flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guild snowflake ID (optional)" />
        <button type="submit" className="btn-primary text-sm py-2.5" disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {result?.guild ? (
        <pre className="card p-4 text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      ) : (
        <div className="card p-4">
          <p className="text-sm text-muted mb-3">Recent guilds</p>
          <ul className="space-y-2 text-sm font-mono">
            {(list as { id: string; plan: string; prefix: string }[]).map((g) => (
              <li key={g.id} className="flex justify-between border-b border-border/50 py-2">
                <span>{g.id}</span>
                <span className="text-muted">{g.plan} · {g.prefix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
