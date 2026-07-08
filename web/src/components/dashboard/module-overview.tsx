'use client';

import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { DashboardGuildSettings } from '@/lib/guild-settings';
import type { GuildFullConfig } from '@/lib/guild-types';
import {
  MODULE_GROUPS,
  getModuleStatus,
  type ModuleId,
} from '@/lib/dashboard-modules';
import { canToggleModule, isModuleEnabled } from '@/lib/module-toggles';
import { ModuleToggle } from '@/components/dashboard/module-toggle';
import { StatusBadge } from '@/components/dashboard/status-badges';

export function ModuleOverview({
  guild,
  config,
  onSelect,
  onToggle,
  togglingId,
}: {
  guild: DashboardGuildSettings;
  config: GuildFullConfig;
  onSelect: (id: ModuleId) => void;
  onToggle: (id: ModuleId, enabled: boolean) => void | Promise<void>;
  togglingId?: ModuleId | null;
}) {
  const modules = MODULE_GROUPS.flatMap((g) => g.modules).filter((m) => m.id !== 'overview');
  const activeCount = modules.filter((m) => isModuleEnabled(m.id, guild, config)).length;

  return (
    <div className="dash-overview space-y-10">
      <div className="dash-hero">
        <div className="dash-hero-glow" aria-hidden />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="dash-pill">
              <Sparkles className="h-3.5 w-3.5" />
              Control center
            </span>
            <span className="dash-pill dash-pill-muted capitalize">{guild.plan.replace('_', ' ')}</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Your modules</h2>
          <p className="mt-2 max-w-xl text-sm text-muted leading-relaxed">
            Flip switches to enable or pause features. Open a module to fine-tune settings — changes sync to the bot instantly.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <DashStat label="Active" value={String(activeCount)} accent />
            <DashStat label="Prefix" value={guild.prefix} mono />
            <DashStat label="Total modules" value={String(modules.length)} />
          </div>
        </div>
      </div>

      {MODULE_GROUPS.filter((g) => g.modules.some((m) => m.id !== 'overview')).map((group) => (
        <section key={group.label}>
          <h3 className="dash-section-label">{group.label}</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 dashboard-stagger">
            {group.modules
              .filter((m) => m.id !== 'overview')
              .map((mod) => {
                const status = getModuleStatus(mod.id, guild, config);
                const enabled = isModuleEnabled(mod.id, guild, config);
                const toggleable = canToggleModule(mod.id);
                const Icon = mod.icon;
                const busy = togglingId === mod.id;

                return (
                  <article
                    key={mod.id}
                    className={`dash-module-card group ${enabled ? 'dash-module-card-on' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="dash-module-icon">
                        <Icon className="h-5 w-5" />
                      </div>
                      {toggleable ? (
                        <ModuleToggle
                          checked={enabled}
                          disabled={busy}
                          label={`Toggle ${mod.label}`}
                          onChange={(next) => void onToggle(mod.id, next)}
                        />
                      ) : (
                        <span className="dash-module-badge-always">Always on</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelect(mod.id)}
                      className="mt-5 w-full text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{mod.label}</p>
                        {mod.premium && <span className="badge badge-warning text-[10px]">Premium</span>}
                        {mod.badge === 'partial' && <StatusBadge variant="partial">Partial</StatusBadge>}
                        {mod.badge === 'coming-soon' && <StatusBadge variant="coming-soon">Coming soon</StatusBadge>}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted leading-relaxed">{mod.description}</p>
                      <p className="mt-3 text-[11px] text-muted/70">{status.detail}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
                        Configure
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function DashStat({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className={`dash-stat ${accent ? 'dash-stat-accent' : ''}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
