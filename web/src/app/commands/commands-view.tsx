'use client';

import { useEffect, useMemo, useState } from 'react';
import { mergeNativeCommands } from '@/lib/deelo-native-commands';
import {
  COG_STATUS_LABEL,
  getCogImplementationStatus,
  type CommandImplementationStatus,
} from '@/lib/command-implementation';
import { SearchField } from '@/components/search-field';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

type Cog = {
  cog_name: string;
  alt_name?: string;
  count: number;
  commands: Array<{ name: string; description?: string }>;
};

export function CommandsView() {
  const [catalog, setCatalog] = useState<{ cogs: Cog[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/commands/catalog')
      .then((r) => r.json())
      .then((data) => setCatalog(data))
      .finally(() => setLoading(false));
  }, []);

  const cogs = useMemo(
    () =>
      catalog
        ? mergeNativeCommands(catalog.cogs)
            .filter((c) => c.commands.length > 0)
            .sort((a, b) => b.commands.length - a.commands.length)
        : [],
    [catalog],
  );

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cogs;
    return cogs
      .map((cog) => ({
        ...cog,
        commands: cog.commands.filter(
          (cmd) =>
            cmd.name.toLowerCase().includes(q) ||
            cmd.description?.toLowerCase().includes(q) ||
            cog.cog_name.toLowerCase().includes(q),
        ),
      }))
      .filter((cog) => cog.commands.length > 0);
  }, [cogs, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<CommandImplementationStatus, number> = {
      supported: 0,
      partial: 0,
      'coming-soon': 0,
    };
    for (const cog of cogs) {
      const status = getCogImplementationStatus(cog.cog_name);
      counts[status] += cog.commands.length;
    }
    return counts;
  }, [cogs]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusCounts) as CommandImplementationStatus[]).map((key) => (
          <span key={key} className="badge badge-muted text-xs">
            {COG_STATUS_LABEL[key]}: {statusCounts[key]}
          </span>
        ))}
      </div>

      <SearchField
        placeholder="Search commands..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search commands"
      />

      <div className="space-y-3">
        {filtered.map((cog) => {
          const isOpen = expanded === cog.cog_name;
          const status = getCogImplementationStatus(cog.cog_name);
          return (
            <div key={cog.cog_name} className="card overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
                onClick={() => setExpanded(isOpen ? null : cog.cog_name)}
                aria-expanded={isOpen}
              >
                <div>
                  <p className="font-semibold">{cog.alt_name ?? cog.cog_name}</p>
                  <p className="text-xs text-muted">
                    {cog.commands.length} commands · {COG_STATUS_LABEL[status]}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />}
              </button>
              {isOpen && (
                <ul className="border-t border-border px-4 py-3 sm:px-5">
                  {cog.commands.map((cmd) => (
                    <li key={cmd.name} className="border-b border-border/40 py-2.5 last:border-0">
                      <p className="font-mono text-sm text-accent">{cmd.name}</p>
                      {cmd.description && (
                        <p className="mt-0.5 text-xs text-muted">
                          {(cmd.description ?? '').replace(/\bbleed\b/gi, 'Deelo')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
