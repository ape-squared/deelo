'use client';

import { useMemo, useState } from 'react';
import commands from '@/data/commands-catalog.json';
import { mergeNativeCommands } from '@/lib/deelo-native-commands';
import {
  COG_STATUS_LABEL,
  getCogImplementationStatus,
  type CommandImplementationStatus,
} from '@/lib/command-implementation';
import { SearchField } from '@/components/search-field';
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';

type Cog = {
  cog_name: string;
  alt_name?: string;
  count: number;
  commands: Array<{ name: string; description?: string }>;
};

export function CommandsView() {
  const cogs = useMemo(
    () =>
      mergeNativeCommands((commands as { cogs: Cog[] }).cogs)
        .filter((c) => c.commands.length > 0)
        .sort((a, b) => b.commands.length - a.commands.length),
    [],
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
            cog.cog_name.toLowerCase().includes(q)
        ),
      }))
      .filter((cog) => cog.commands.length > 0);
  }, [cogs, search]);

  const totalCommands = cogs.reduce((n, c) => n + c.commands.length, 0);

  const statusCounts = useMemo(() => {
    const counts: Record<CommandImplementationStatus, number> = {
      supported: 0,
      partial: 0,
      'coming-soon': 0,
    };
    for (const cog of cogs) {
      counts[getCogImplementationStatus(cog.cog_name)] += cog.commands.length;
    }
    return counts;
  }, [cogs]);

  return (
    <main className="site-main flex-1">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
        <header className="page-hero page-hero-center mb-12 animate-fade-up">
          <div className="page-hero-icon">
            <Terminal className="h-8 w-8" />
          </div>
          <span className="section-label">Command reference</span>
          <h1 className="section-heading mt-4">
            <span className="gradient-text">{totalCommands.toLocaleString()}</span> commands
          </h1>
          <p className="section-sub">
            Browse {cogs.length} categories. Default prefix is <code className="font-mono text-accent">,</code>
          </p>
          <p className="mt-4 text-sm text-muted max-w-2xl mx-auto">
            {statusCounts.supported.toLocaleString()} supported · {statusCounts.partial.toLocaleString()} partial ·{' '}
            {statusCounts['coming-soon'].toLocaleString()} coming soon. Unmarked catalog commands return a coming-soon message in Discord.
          </p>
        </header>

        <SearchField
          className="mb-10 max-w-md mx-auto animate-fade-up delay-100"
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="space-y-4">
          {filtered.map((cog, i) => {
            const isOpen = expanded === cog.cog_name || !!search;
            const displayName = cog.alt_name || cog.cog_name;
            const cogStatus = getCogImplementationStatus(cog.cog_name);

            return (
              <section
                key={cog.cog_name}
                className="card overflow-hidden animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <button
                  type="button"
                  onClick={() => !search && setExpanded(expanded === cog.cog_name ? null : cog.cog_name)}
                  className="flex w-full items-center justify-between gap-4 p-6 text-left transition hover:bg-white/[0.02]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold capitalize">{displayName}</h2>
                      <span className={`badge text-[10px] ${
                        cogStatus === 'supported' ? 'badge-accent' : cogStatus === 'partial' ? 'badge-warning' : 'border border-border text-muted'
                      }`}>
                        {COG_STATUS_LABEL[cogStatus]}
                      </span>
                    </div>
                    <p className="text-sm text-muted mt-0.5">{cog.commands.length} command{cog.commands.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge badge-accent">{cog.commands.length}</span>
                    {!search && (
                      isOpen ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-6 pb-6 pt-2 animate-fade-in">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {cog.commands.map((cmd) => (
                        <div
                          key={cmd.name}
                          className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 transition hover:border-accent/30 hover:bg-accent-soft/30"
                        >
                          <code className="text-sm text-accent font-mono">,{cmd.name}</code>
                          {cmd.description && (
                            <p className="mt-1.5 text-xs text-muted line-clamp-2">
                              {cmd.description.replace(/bleed/gi, 'Deelo')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="card p-12 text-center text-muted animate-fade-in">
            No commands match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </main>
  );
}
