'use client';

import { ChevronRight } from 'lucide-react';
import type { DashboardGuildSettings } from '@/lib/guild-settings';
import type { GuildFullConfig } from '@/lib/guild-types';
import {
  MODULE_GROUPS,
  getModuleStatus,
  type ModuleId,
} from '@/lib/dashboard-modules';

export function ModuleOverview({
  guild,
  config,
  onSelect,
}: {
  guild: DashboardGuildSettings;
  config: GuildFullConfig;
  onSelect: (id: ModuleId) => void;
}) {
  const modules = MODULE_GROUPS.flatMap((g) => g.modules).filter((m) => m.id !== 'overview');

  return (
    <div className="space-y-8">
      <div className="module-hero card animate-fade-in p-6 sm:p-8">
        <p className="text-sm font-medium text-accent">Server dashboard</p>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">Modules</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Enable and configure Deelo features for your server. Click a module to open its settings — changes sync with the bot. v3 adds team roles and module permissions.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatBox label="Plan" value={guild.plan.replace('_', ' ')} />
          <StatBox label="Prefix" value={guild.prefix} mono />
          <StatBox
            label="Active modules"
            value={String(modules.filter((m) => getModuleStatus(m.id, guild, config).enabled).length)}
          />
        </div>
      </div>

      {MODULE_GROUPS.filter((g) => g.modules.some((m) => m.id !== 'overview')).map((group) => (
        <section key={group.label}>
          <h3 className="module-group-title">{group.label}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 dashboard-stagger">
            {group.modules
              .filter((m) => m.id !== 'overview')
              .map((mod) => {
                const status = getModuleStatus(mod.id, guild, config);
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => onSelect(mod.id)}
                    className="module-card group text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`module-status ${status.enabled ? 'module-status-on' : 'module-status-off'}`}>
                        {status.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <p className="font-semibold">{mod.label}</p>
                      {mod.premium && <span className="badge badge-warning text-[10px]">Premium</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{mod.description}</p>
                    <p className="mt-3 text-xs text-muted/80">{status.detail}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
                      Configure
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold capitalize ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
