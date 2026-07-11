'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Save } from 'lucide-react';
import type { DashboardGuildSettings, PlanTier } from '@/lib/guild-settings';
import { BOT_APPEARANCE_FIELDS } from '@/lib/bot-appearance';
import type { GuildFullConfig } from '@/lib/guild-types';
import type { ChannelKind } from '@/lib/discord-channels';
import { EXTRA_CONFIG_FIELDS, KNOWN_EVENTS, SOCIAL_FEED_PLATFORMS } from '@/lib/guild-types';
import { MODULE_GROUPS, isValidModuleId, moduleById, type ModuleId } from '@/lib/dashboard-modules';
import { buildModuleTogglePatch, isModuleEnabled } from '@/lib/module-toggles';
import { AddRow, CrudList, MiniInput, MiniSelect } from '@/components/dashboard/guild-crud';
import { ChannelSelect, GuildChannelsProvider, MiniChannelSelect } from '@/components/dashboard/discord-resources';
import { RedeemCodePanel } from '@/components/dashboard/redeem-panel';
import { ModuleOverview } from '@/components/dashboard/module-overview';
import { EmbedsTab } from '@/components/dashboard/embed-builder';
import { TeamTab } from '@/components/dashboard/team-tab';
import { guildRoleCanRead, type GuildDashboardRole } from '@/lib/guild-permissions';
import { hasPlanFeature } from '@/lib/plan-limits';
import { WELCOME_VARIABLES, getExtraConfigPath } from '@/lib/guild-settings';
export function GuildSettingsEditor({
  guildId,
  config: initial,
  onReload,
  dashboardRole = 'admin',
}: {
  guildId: string;
  config: GuildFullConfig;
  onReload: () => Promise<void>;
  dashboardRole?: GuildDashboardRole;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get('m') ?? 'overview';
  const tab: ModuleId = isValidModuleId(moduleParam) ? moduleParam : 'overview';

  const setTab = useCallback((id: ModuleId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'overview') params.delete('m');
    else params.set('m', id);
    const qs = params.toString();
    router.replace(`/dashboard/${guildId}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [guildId, router, searchParams]);

  const [guild, setGuild] = useState(initial.guild);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [toggles, setToggles] = useState(initial.eventToggles);
  const [extraDraft, setExtraDraft] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<ModuleId | null>(null);

  const extra = (guild.extra_config ?? {}) as Record<string, unknown>;
  const isPremium = guild.plan !== 'free';
  const visibleGroups = MODULE_GROUPS.map((g) => ({
    ...g,
    modules: g.modules.filter((m) => guildRoleCanRead(dashboardRole, m.id)),
  })).filter((g) => g.modules.length > 0);
  const activeModule = visibleGroups.flatMap((g) => g.modules).find((m) => m.id === tab);
  const showSaveBar = !['filters', 'responders', 'autoreact', 'tickets', 'social', 'events', 'overview', 'embeds', 'team'].includes(tab);

  function update<K extends keyof DashboardGuildSettings>(key: K, value: DashboardGuildSettings[K]) {
    setGuild((g) => ({ ...g, [key]: value }));
    setDirty(true);
  }

  function extraValue(key: string): string {
    if (key in extraDraft) return extraDraft[key];
    const v = getExtraConfigPath(extra, key);
    return v == null ? '' : String(v);
  }

  function setExtra(key: string, value: string) {
    setExtraDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setMessage('');
    const payload: Record<string, unknown> = { ...guild };
    if (Object.keys(extraDraft).length) {
      payload.extra_config = extraDraft;
    }
    const res = await fetch(`/api/guilds/${guildId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, _module: tab }),
    });
    setSaving(false);
    const data = await res.json();
    if (res.ok) {
      setGuild(data.guild);
      setExtraDraft({});
      if (data.synced?.eventToggles) {
        setToggles((prev) => {
          const map = new Map(prev.map((t) => [t.event, t]));
          for (const s of data.synced.eventToggles) map.set(s.event, s);
          return Array.from(map.values());
        });
      }
      const botSync = data.synced?.bot as { nickname?: { ok: boolean; error?: string } } | undefined;
      if (botSync?.nickname && !botSync.nickname.ok) {
        setMessage(`Saved, but nickname sync failed: ${botSync.nickname.error ?? 'unknown error'}`);
      } else {
        setMessage('Settings saved — bot updated instantly');
      }
      setDirty(false);
      setTimeout(() => setMessage(''), 5000);
    } else {
      setMessage(data.error ?? 'Failed to save');
    }
  }

  function eventOn(name: string): boolean {
    return toggles.find((t) => t.event === name)?.enabled ?? true;
  }

  async function saveToggles(next: typeof toggles) {
    setToggles(next);
    await fetch(`/api/guilds/${guildId}/event-toggles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggles: next }),
    });
    setMessage('Event toggles updated');
    setTimeout(() => setMessage(''), 3000);
  }

  async function toggleModule(id: ModuleId, enabled: boolean) {
    setTogglingId(id);
    setMessage('');
    const { guild: guildPatch, extra } = buildModuleTogglePatch(id, enabled, guild);
    const res = await fetch(`/api/guilds/${guildId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...guild,
        ...guildPatch,
        extra_config: { ...extraDraft, ...extra },
        _module: 'overview',
      }),
    });
    setTogglingId(null);
    const data = await res.json();
    if (res.ok) {
      setGuild(data.guild);
      setExtraDraft({});
      if (data.synced?.eventToggles) {
        setToggles((prev) => {
          const map = new Map(prev.map((t) => [t.event, t]));
          for (const s of data.synced.eventToggles) map.set(s.event, s);
          return Array.from(map.values());
        });
      }
      const label = moduleById(id)?.label ?? id;
      setMessage(`${label} ${enabled ? 'enabled' : 'disabled'}`);
      if (!enabled && tab === id) setTab('overview');
      await onReload();
      setTimeout(() => setMessage(''), 4000);
    } else {
      setMessage(data.error ?? 'Failed to update module');
    }
  }

  async function apiDelete(path: string) {
    await fetch(path, { method: 'DELETE' });
    await onReload();
  }

  async function apiPost(path: string, body: unknown) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const d = await res.json();
      setMessage(d.error ?? 'Action failed');
      return;
    }
    await onReload();
    setMessage('Updated');
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <GuildChannelsProvider guildId={guildId}>
    <div className="module-layout">
      <aside className="module-sidebar">
        <div className="module-sidebar-inner">
          <p className="module-sidebar-heading">Modules</p>
          {visibleGroups.map((group) => (
            <div key={group.label} className="module-nav-group">
              <p className="module-nav-label">{group.label}</p>
              {group.modules.map((mod) => {
                const Icon = mod.icon;
                const enabled = mod.id === 'overview' || isModuleEnabled(mod.id, guild, { ...initial, guild, eventToggles: toggles });
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setTab(mod.id)}
                    className={`module-nav-link ${tab === mod.id ? 'module-nav-link-active' : ''}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{mod.label}</span>
                    {mod.id !== 'overview' && (
                      <span className={`module-nav-dot ${enabled ? 'module-nav-dot-on' : ''}`} aria-hidden />
                    )}
                    {mod.premium && <span className="ml-auto text-[9px] font-semibold text-amber-400/90">PRO</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      <div className="module-content">
        <div className="module-content-pad">
        {message && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm animate-fade-in ${message.includes('Failed') || message.includes('failed') ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
            {message}
          </div>
        )}

        {tab !== 'overview' && activeModule && (
          <div className="mb-6 animate-fade-in">
            <h1 className="text-xl font-bold sm:text-2xl">{activeModule.label}</h1>
            <p className="mt-1 text-sm text-muted">{activeModule.description}</p>
          </div>
        )}

        {tab === 'overview' ? (
          <ModuleOverview
            guild={guild}
            config={{ ...initial, guild, eventToggles: toggles }}
            onSelect={setTab}
            onToggle={toggleModule}
            togglingId={togglingId}
          />
        ) : (
          <form onSubmit={save} className="space-y-6">
        {tab === 'general' && (
          <Section title="General" desc="Core bot settings">
            <RedeemCodePanel
              guildId={guildId}
              currentPlan={guild.plan}
              onRedeemed={(g) => setGuild((prev) => ({ ...prev, plan: g.plan as DashboardGuildSettings['plan'], plan_expires_at: g.plan_expires_at }))}
            />
            <Field label="Command prefix" hint={isPremium ? 'Max 5 characters' : 'Premium required for custom prefix'}>
              <input className="input max-w-[120px] font-mono" value={guild.prefix} onChange={(e) => update('prefix', e.target.value)} maxLength={5} disabled={!isPremium && guild.prefix === ','} />
            </Field>
            <Field label="Bump reminder channel"><ChannelField value={guild.bump_channel} onChange={(v) => update('bump_channel', v)} /></Field>
            <Field label="Bump interval (hours)" hint="Default 2 hours — DISBOARD bump reminders">
              <input
                type="number"
                min={0.5}
                max={48}
                step={0.5}
                className="input max-w-[120px]"
                value={((guild.bump_interval ?? 7200000) / 3600000)}
                onChange={(e) => update('bump_interval', Math.round((parseFloat(e.target.value) || 2) * 3600000))}
              />
            </Field>
            <Toggle label="Fake permissions mode" desc="Allow fake permission overrides (admin only)" checked={guild.fake_permissions_enabled ?? false} onChange={(v) => update('fake_permissions_enabled', v)} />
            <PlanCard guild={guild} subscription={initial.subscription} onRedeem={() => setTab('general')} />
          </Section>
        )}

        {tab === 'appearance' && (
          <Section
            title="Bot appearance"
            desc="Customize how Deelo looks in this server. Nickname updates immediately on save; embed color and footer apply to the next bot embed (or post a preview to your mod log channel)."
          >
            {!isPremium ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-medium">Premium required</p>
                <p className="mt-1 text-sm text-muted">Upgrade to customize Deelo&apos;s nickname, embed color, and footer in your server.</p>
                <button type="button" onClick={() => setTab('general')} className="btn-primary text-sm py-2 inline-flex mt-3">Redeem a code</button>
              </div>
            ) : (
              BOT_APPEARANCE_FIELDS.map((f) => (
                <Field key={f.key} label={f.label} hint={f.description}>
                  {f.type === 'color' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="color"
                        className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                        value={extraValue(f.key) ? `#${extraValue(f.key).replace(/^#/, '')}` : '#5865F2'}
                        onChange={(e) => setExtra(f.key, e.target.value.replace(/^#/, '').toUpperCase())}
                      />
                      <input
                        className="input max-w-[140px] font-mono text-sm uppercase"
                        value={extraValue(f.key)}
                        onChange={(e) => setExtra(f.key, e.target.value.replace(/^#/, '').toUpperCase())}
                        placeholder={f.placeholder}
                        maxLength={6}
                      />
                    </div>
                  ) : (
                    <input
                      className="input text-sm"
                      value={extraValue(f.key)}
                      onChange={(e) => setExtra(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      maxLength={'maxLength' in f ? f.maxLength : undefined}
                    />
                  )}
                </Field>
              ))
            )}
          </Section>
        )}

        {tab === 'welcome' && (
          <>
            <Section title="Welcome & Goodbye" desc={`Primary messages. Variables: ${WELCOME_VARIABLES}`}>
              <Field label="Welcome channel"><ChannelField value={guild.welcome_channel} onChange={(v) => update('welcome_channel', v)} /></Field>
              <Field label="Welcome message"><textarea className="input min-h-[100px] font-mono text-sm" value={guild.welcome_message ?? ''} onChange={(e) => update('welcome_message', e.target.value || null)} /></Field>
              <Field label="Goodbye channel"><ChannelField value={guild.goodbye_channel} onChange={(v) => update('goodbye_channel', v)} /></Field>
              <Field label="Goodbye message"><textarea className="input min-h-[100px] font-mono text-sm" value={guild.goodbye_message ?? ''} onChange={(e) => update('goodbye_message', e.target.value || null)} /></Field>
            </Section>
            <GuildMessagesList
              guildId={guildId}
              kind="welcome"
              items={(initial.guildMessages ?? []).filter((m) => m.kind === 'welcome')}
              onReload={onReload}
            />
            <GuildMessagesList
              guildId={guildId}
              kind="goodbye"
              items={(initial.guildMessages ?? []).filter((m) => m.kind === 'goodbye')}
              onReload={onReload}
            />
          </>
        )}

        {tab === 'moderation' && (
          <Section title="Moderation & Security" desc="Protection modules synced with Discord commands">
            <Field label="Mod log channel" hint="Premium"><ChannelField value={guild.mod_log_channel} onChange={(v) => update('mod_log_channel', v)} /></Field>
            <Toggle label="Automod" desc="Filter invites + custom word filters" checked={guild.automod_enabled} onChange={(v) => update('automod_enabled', v)} />
            <Toggle label="Anti-nuke" checked={guild.antinuke_enabled} onChange={(v) => update('antinuke_enabled', v)} premium={!isPremium} />
            <Field label="Anti-nuke threshold"><input type="number" min={1} max={20} className="input max-w-[120px]" value={guild.antinuke_threshold} onChange={(e) => update('antinuke_threshold', parseInt(e.target.value, 10) || 5)} /></Field>
            <Toggle label="Anti-raid" checked={guild.antiraid_enabled} onChange={(v) => update('antiraid_enabled', v)} premium={!isPremium} />
            <Field label="Min account age (days)"><input type="number" min={0} max={365} className="input max-w-[120px]" value={guild.antiraid_min_age} onChange={(e) => update('antiraid_min_age', parseInt(e.target.value, 10) || 7)} /></Field>
            <Toggle label="Require profile picture" checked={guild.antiraid_avatar} onChange={(v) => update('antiraid_avatar', v)} />
            <Toggle label="Snipe" desc={`Event: ${eventOn('snipe') ? 'on' : 'off'}`} checked={guild.snipe_enabled} onChange={(v) => update('snipe_enabled', v)} />
          </Section>
        )}

        {tab === 'filters' && <FiltersTab guildId={guildId} filters={initial.filters} onDelete={(id) => apiDelete(`/api/guilds/${guildId}/filters?id=${id}`)} onAdd={(body) => apiPost(`/api/guilds/${guildId}/filters`, body)} />}

        {tab === 'responders' && <RespondersTab guildId={guildId} responders={initial.responders} onReload={onReload} setMessage={setMessage} />}

        {tab === 'autoreact' && (
          <Section title="Auto React" desc="Bot reacts with an emoji when a message matches a trigger. Toggle the reactiontrigger event under Events.">
            <ReactionTriggersList guildId={guildId} items={initial.reactionTriggers} onReload={onReload} />
          </Section>
        )}

        {tab === 'roles' && (
          <>
            <Section title="Core roles" desc="Primary moderation and join roles">
              <Field label="Primary autorole ID"><IdInput value={guild.autorole} onChange={(v) => update('autorole', v)} /></Field>
              <Field label="Mute role ID"><IdInput value={guild.mute_role} onChange={(v) => update('mute_role', v)} /></Field>
              <Field label="Jail role ID"><IdInput value={guild.jail_role} onChange={(v) => update('jail_role', v)} /></Field>
            </Section>
            <AutorolesList guildId={guildId} items={initial.autoroles} onReload={onReload} />
            <VanityList guildId={guildId} items={initial.vanityRoles} onReload={onReload} />
            <ReactionRolesList guildId={guildId} items={initial.reactionRoles} onReload={onReload} setMessage={setMessage} />
            <ButtonRolesList guildId={guildId} items={initial.buttonRoles} onReload={onReload} setMessage={setMessage} />
          </>
        )}

        {tab === 'levels' && (
          <>
            <Section title="Leveling" desc={`Event: ${eventOn('levels') ? 'on' : 'off'}`}>
              <Toggle label="Levels enabled" checked={guild.levels_enabled} onChange={(v) => update('levels_enabled', v)} />
              <Field label="Level-up channel"><ChannelField value={guild.levels_channel} onChange={(v) => update('levels_channel', v)} /></Field>
              <Field label="XP multiplier"><input type="number" step={0.1} min={0.1} max={10} className="input max-w-[120px]" value={guild.levels_multiplier} onChange={(e) => update('levels_multiplier', parseFloat(e.target.value) || 1)} /></Field>
              <Field label="Custom level-up message" hint="Saved to extra_config">
                <textarea className="input min-h-[80px] text-sm" value={extraValue('levels.message')} onChange={(e) => setExtra('levels.message', e.target.value)} placeholder="GG {user}, level {level}!" />
              </Field>
            </Section>
            <LevelRewardsList guildId={guildId} items={initial.levelRewards} onReload={onReload} />
          </>
        )}

        {tab === 'economy' && (
          <>
            <Section title="Economy" desc={`Event: ${eventOn('economy') ? 'on' : 'off'}`}>
              <Toggle label="Economy enabled" checked={guild.economy_enabled} onChange={(v) => update('economy_enabled', v)} />
              <Field label="Currency name">
                <input className="input max-w-[200px]" value={guild.economy_currency_name ?? 'coins'} onChange={(e) => update('economy_currency_name', e.target.value)} placeholder="coins" />
              </Field>
              <Field label="Starting balance">
                <input type="number" min={0} className="input max-w-[120px]" value={guild.economy_starting_balance ?? 0} onChange={(e) => update('economy_starting_balance', parseInt(e.target.value, 10) || 0)} />
              </Field>
              <Field label="Daily reward range">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} className="input max-w-[100px]" value={guild.economy_daily_min ?? 100} onChange={(e) => update('economy_daily_min', parseInt(e.target.value, 10) || 0)} />
                  <span className="text-muted text-sm">to</span>
                  <input type="number" min={0} className="input max-w-[100px]" value={guild.economy_daily_max ?? 500} onChange={(e) => update('economy_daily_max', parseInt(e.target.value, 10) || 0)} />
                </div>
              </Field>
              <Field label="Work reward range">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} className="input max-w-[100px]" value={guild.economy_work_min ?? 50} onChange={(e) => update('economy_work_min', parseInt(e.target.value, 10) || 0)} />
                  <span className="text-muted text-sm">to</span>
                  <input type="number" min={0} className="input max-w-[100px]" value={guild.economy_work_max ?? 200} onChange={(e) => update('economy_work_max', parseInt(e.target.value, 10) || 0)} />
                </div>
              </Field>
              <Field label="Work cooldown (minutes)">
                <input type="number" min={1} max={1440} className="input max-w-[120px]" value={Math.round((guild.economy_work_cooldown_ms ?? 3600000) / 60000)} onChange={(e) => update('economy_work_cooldown_ms', (parseInt(e.target.value, 10) || 60) * 60000)} />
              </Field>
              <Field label="Transfer tax (%)">
                <input type="number" min={0} max={50} className="input max-w-[120px]" value={guild.economy_transfer_tax_percent ?? 0} onChange={(e) => update('economy_transfer_tax_percent', parseInt(e.target.value, 10) || 0)} />
              </Field>
            </Section>
            <EconomyShopList guildId={guildId} items={initial.economyShopItems} onReload={onReload} />
          </>
        )}

        {tab === 'starboard' && (
          <>
            <Section title="Starboard" desc="Highlight popular messages — Premium">
              <Field label="Starboard channel" hint="Premium"><ChannelField value={guild.starboard_channel} onChange={(v) => update('starboard_channel', v)} /></Field>
              <Field label="Stars required"><input type="number" min={1} max={25} className="input max-w-[120px]" value={guild.starboard_threshold} onChange={(e) => update('starboard_threshold', parseInt(e.target.value, 10) || 3)} /></Field>
              <Field label="Starboard emoji"><input className="input max-w-[120px]" value={extraValue('starboard.emoji') || '⭐'} onChange={(e) => setExtra('starboard.emoji', e.target.value)} /></Field>
            </Section>
            <Section title="Clownboard" desc="Same idea as starboard with a custom emoji (e.g. 🤡)">
              <Field label="Clownboard channel">
                <ChannelField
                  value={extraValue('clownboard.channel') || null}
                  onChange={(v) => setExtra('clownboard.channel', v ?? '')}
                />
              </Field>
              <Field label="Reactions required">
                <input
                  type="number"
                  min={1}
                  max={25}
                  className="input max-w-[120px]"
                  value={extraValue('clownboard.threshold') || '3'}
                  onChange={(e) => setExtra('clownboard.threshold', e.target.value)}
                />
              </Field>
              <Field label="Clownboard emoji">
                <input
                  className="input max-w-[120px]"
                  value={extraValue('clownboard.emoji') || '🤡'}
                  onChange={(e) => setExtra('clownboard.emoji', e.target.value)}
                />
              </Field>
            </Section>
          </>
        )}

        {tab === 'voicemaster' && (
          <Section title="VoiceMaster" desc="Join-to-create temporary voice channels">
            <Field label="Voice category"><ChannelField value={guild.voicemaster_category} onChange={(v) => update('voicemaster_category', v)} kinds={['category']} /></Field>
            <Field label="Join-to-create voice channel"><ChannelField value={guild.voicemaster_join_channel} onChange={(v) => update('voicemaster_join_channel', v)} kinds={['voice']} /></Field>
            <Field label="Interface / panel channel"><ChannelField value={guild.voicemaster_interface_channel ?? null} onChange={(v) => update('voicemaster_interface_channel', v)} /></Field>
            <Field label="Default channel name"><input className="input" value={guild.voicemaster_default_name} onChange={(e) => update('voicemaster_default_name', e.target.value)} /></Field>
            <Field label="Bitrate (kbps)"><input type="number" min={8} max={384} className="input max-w-[120px]" value={guild.voicemaster_default_bitrate} onChange={(e) => update('voicemaster_default_bitrate', parseInt(e.target.value, 10) || 64)} /></Field>
            <Field label="Join role ID"><IdInput value={guild.voicemaster_join_role} onChange={(v) => update('voicemaster_join_role', v)} /></Field>
          </Section>
        )}

        {tab === 'tickets' && (
          <>
            <TicketPanelsTab
              guildId={guildId}
              plan={guild.plan as PlanTier}
              panels={initial.ticketPanels}
              onReload={onReload}
              setMessage={setMessage}
            />
            <OpenTicketsTab guildId={guildId} plan={guild.plan as PlanTier} tickets={initial.tickets} onReload={onReload} setMessage={setMessage} />
          </>
        )}

        {tab === 'events' && (
          <Section title="Event modules" desc="Toggle bot event handlers — same as ,event in Discord">
            <div className="space-y-3">
              {KNOWN_EVENTS.map((ev) => {
                const enabled = eventOn(ev.id);
                return (
                  <div key={ev.id} className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
                    <div>
                      <p className="font-medium">{ev.label}</p>
                      <p className="text-xs text-muted">{ev.desc}</p>
                    </div>
                    <button
                      type="button"
                      className={`toggle ${enabled ? 'toggle-on' : ''}`}
                      onClick={() => {
                        const next = toggles.filter((t) => t.event !== ev.id);
                        next.push({ event: ev.id, enabled: !enabled });
                        saveToggles(next);
                      }}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {tab === 'social' && (
          <>
            <SocialFeedsList guildId={guildId} items={initial.socialFeeds} onReload={onReload} />
            <CountersList guildId={guildId} items={initial.counters} onReload={onReload} />
          </>
        )}

        {tab === 'team' && (
          <TeamTab guildId={guildId} setMessage={setMessage} />
        )}

        {tab === 'embeds' && (
          <EmbedsTab
            guildId={guildId}
            items={initial.embeds}
            plan={guild.plan}
            onReload={onReload}
            setMessage={setMessage}
          />
        )}

        {tab === 'advanced' && (
          <>
            <Section title="Log channels" desc="Extra log destinations (extra_config)">
              {EXTRA_CONFIG_FIELDS.filter((f) => f.key.startsWith('logs.') || f.key === 'suggest.channel' || f.key === 'bumpreminder.message').map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === 'textarea' ? (
                    <textarea className="input min-h-[80px] text-sm" value={extraValue(f.key)} onChange={(e) => setExtra(f.key, e.target.value)} placeholder={'placeholder' in f ? f.placeholder : undefined} />
                  ) : f.type === 'channel' ? (
                    <ChannelSelect value={extraValue(f.key) || null} onChange={(v) => setExtra(f.key, v ?? '')} />
                  ) : (
                    <input className="input font-mono text-sm" value={extraValue(f.key)} onChange={(e) => setExtra(f.key, e.target.value)} placeholder={'placeholder' in f ? f.placeholder : undefined} />
                  )}
                </Field>
              ))}
            </Section>
            <AliasesList guildId={guildId} items={initial.commandAliases} onReload={onReload} />
          </>
        )}

        {['filters', 'responders', 'autoreact', 'tickets', 'social', 'events', 'embeds'].includes(tab) ? null : showSaveBar && (
          <div className={`save-bar ${dirty ? 'border-accent/30' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted">
                {dirty ? 'You have unsaved changes' : 'All changes saved'}
              </p>
              <button type="submit" className="btn-primary text-sm py-2.5" disabled={saving || !dirty}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : dirty ? 'Save changes' : 'Saved'}
              </button>
            </div>
          </div>
        )}
          </form>
        )}
        </div>
      </div>
    </div>
    </GuildChannelsProvider>
  );
}

function FiltersTab({ guildId, filters, onDelete, onAdd }: { guildId: string; filters: GuildFullConfig['filters']; onDelete: (id: number) => Promise<void>; onAdd: (body: unknown) => Promise<void> }) {
  const [type, setType] = useState('word');
  const [value, setValue] = useState('');
  return (
    <CrudList
      title="Word & link filters"
      desc="Used by automod when enabled"
      items={filters}
      columns={['Type', 'Value', 'Action']}
      renderRow={(f) => [f.type, f.value, f.action]}
      onDelete={(f) => onDelete(f.id)}
      addForm={
        <AddRow label="Add filter" onAdd={() => onAdd({ type, value })}>
          <MiniSelect label="Type" value={type} onChange={setType} options={[{ value: 'word', label: 'Word' }, { value: 'link', label: 'Link' }, { value: 'invite', label: 'Invite' }]} />
          <MiniInput label="Value" value={value} onChange={setValue} placeholder="badword" />
        </AddRow>
      }
    />
  );
}

function RespondersTab({ guildId, responders, onReload, setMessage }: { guildId: string; responders: GuildFullConfig['responders']; onReload: () => Promise<void>; setMessage: (m: string) => void }) {
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');
  const [match_type, setMatchType] = useState('contains');

  async function toggleEnabled(id: number, enabled: boolean) {
    const res = await fetch(`/api/guilds/${guildId}/responders`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    if (!res.ok) {
      setMessage((await res.json()).error ?? 'Failed to update responder');
      return;
    }
    await onReload();
  }

  return (
    <CrudList
      title="Auto-responders"
      desc="Bot replies when a message matches a trigger"
      items={responders}
      columns={['Trigger', 'Response', 'Match', 'On']}
      renderRow={(r) => [
        r.trigger,
        r.response.slice(0, 40),
        r.match_type,
        <button
          key={`toggle-${r.id}`}
          type="button"
          role="switch"
          aria-checked={r.enabled}
          onClick={() => toggleEnabled(r.id, !r.enabled)}
          className={`toggle ${r.enabled ? 'toggle-on' : ''}`}
        >
          <span className="toggle-thumb" />
        </button>,
      ]}
      onDelete={async (r) => {
        await fetch(`/api/guilds/${guildId}/responders?id=${r.id}`, { method: 'DELETE' });
        await onReload();
      }}
      addForm={
        <AddRow label="Add responder" onAdd={async () => {
          const res = await fetch(`/api/guilds/${guildId}/responders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger, response, match_type }) });
          if (!res.ok) { setMessage((await res.json()).error ?? 'Failed'); return; }
          setTrigger(''); setResponse('');
          await onReload();
        }}>
          <MiniInput label="Trigger" value={trigger} onChange={setTrigger} />
          <MiniInput label="Response" value={response} onChange={setResponse} />
          <MiniSelect label="Match" value={match_type} onChange={setMatchType} options={[{ value: 'contains', label: 'Contains' }, { value: 'exact', label: 'Exact' }, { value: 'startswith', label: 'Starts with' }]} />
        </AddRow>
      }
    />
  );
}

function TicketPanelsTab({
  guildId,
  plan,
  panels,
  onReload,
  setMessage,
}: {
  guildId: string;
  plan: PlanTier;
  panels: GuildFullConfig['ticketPanels'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [channel_id, setChannelId] = useState('');
  const [category_id, setCategoryId] = useState('');
  const [support_role, setSupportRole] = useState('');
  const ticketsEnabled = hasPlanFeature(plan, 'tickets');

  return (
    <>
      {!ticketsEnabled && (
        <div className="card mb-6 border-amber-500/30 bg-amber-500/5 p-5 text-sm">
          <p className="font-medium">Premium required</p>
          <p className="mt-1 text-muted">
            Ticket panels are a Premium feature. Redeem a code on the General tab or upgrade your plan to post support panels to Discord.
          </p>
        </div>
      )}
    <CrudList
      title="Ticket panels"
      desc="Posts an Open Ticket button in the selected channel — synced to Discord immediately."
      items={panels}
      columns={['Name', 'Channel', 'Message', 'Category', 'Support role']}
      renderRow={(p) => [p.name, p.channel_id, p.message_id ?? '—', p.category_id ?? '—', p.support_role ?? '—']}
      onDelete={async (p) => {
        const res = await fetch(`/api/guilds/${guildId}/ticket-panels?id=${p.id}`, { method: 'DELETE' });
        if (!res.ok) {
          setMessage((await res.json()).error ?? 'Failed to delete panel');
          return;
        }
        setMessage('Panel removed from Discord and dashboard');
        await onReload();
        setTimeout(() => setMessage(''), 3000);
      }}
      addForm={
        <AddRow label="Create panel" onAdd={async () => {
          if (!ticketsEnabled) {
            setMessage('Ticket panels require Premium');
            return;
          }
          if (!name.trim()) { setMessage('Panel name is required'); return; }
          if (!channel_id) { setMessage('Select a channel for the panel'); return; }
          const res = await fetch(`/api/guilds/${guildId}/ticket-panels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              channel_id,
              category_id: category_id || null,
              support_role: support_role || null,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setMessage(data.error ?? 'Failed to create panel');
            return;
          }
          setMessage('Ticket panel posted to Discord');
          setName('');
          setChannelId('');
          setCategoryId('');
          setSupportRole('');
          await onReload();
          setTimeout(() => setMessage(''), 3000);
        }}>
          <MiniInput label="Panel name" value={name} onChange={setName} placeholder="Support" />
          <MiniChannelSelect label="Panel channel" value={channel_id} onChange={setChannelId} />
          <MiniChannelSelect label="Ticket category (optional)" value={category_id} onChange={setCategoryId} kinds={['category']} optional />
          <MiniInput label="Support role ID" value={support_role} onChange={setSupportRole} placeholder="Optional" />
        </AddRow>
      }
    />
    </>
  );
}

function LevelRewardsList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['levelRewards']; onReload: () => Promise<void> }) {
  const [level, setLevel] = useState('');
  const [role_id, setRoleId] = useState('');
  return (
    <CrudList title="Level rewards" items={items} columns={['Level', 'Role ID']} renderRow={(r) => [String(r.level), r.role_id]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=level-rewards&id=${r.id}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add reward" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'level-rewards', level, role_id }) }); setLevel(''); setRoleId(''); await onReload(); }}>
        <MiniInput label="Level" value={level} onChange={setLevel} />
        <MiniInput label="Role ID" value={role_id} onChange={setRoleId} />
      </AddRow>}
    />
  );
}

function EconomyShopList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['economyShopItems']; onReload: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [role_id, setRoleId] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  return (
    <CrudList
      title="Shop items"
      desc="Members buy items with ,buy. Role items grant the role on purchase."
      items={items}
      columns={['Name', 'Price', 'Role', 'Stock']}
      renderRow={(r) => [
        `#${r.id} ${r.name}${r.enabled ? '' : ' (disabled)'}`,
        String(r.price),
        r.role_id ?? '—',
        r.stock == null ? '∞' : String(r.stock),
      ]}
      onDelete={async (r) => {
        await fetch(`/api/guilds/${guildId}/resources?resource=economy-shop&id=${r.id}`, { method: 'DELETE' });
        await onReload();
      }}
      addForm={
        <AddRow
          label="Add shop item"
          onAdd={async () => {
            await fetch(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resource: 'economy-shop',
                name,
                price,
                role_id: role_id || null,
                description: description || null,
                stock: stock || null,
              }),
            });
            setName('');
            setPrice('');
            setRoleId('');
            setDescription('');
            setStock('');
            await onReload();
          }}
        >
          <MiniInput label="Name" value={name} onChange={setName} />
          <MiniInput label="Price" value={price} onChange={setPrice} />
          <MiniInput label="Role ID (optional)" value={role_id} onChange={setRoleId} />
          <MiniInput label="Stock (blank = unlimited)" value={stock} onChange={setStock} />
          <MiniInput label="Description" value={description} onChange={setDescription} />
        </AddRow>
      }
    />
  );
}

function SocialFeedsList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['socialFeeds']; onReload: () => Promise<void> }) {
  const [platform, setPlatform] = useState('youtube');
  const [username, setUsername] = useState('');
  const [channel_id, setChannelId] = useState('');
  return (
    <CrudList title="Social feeds" desc="Notifications for social platforms" items={items} columns={['Platform', 'Username', 'Channel']} renderRow={(r) => [r.platform, r.username, r.channel_id]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=social-feeds&id=${r.id}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add feed" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'social-feeds', platform, username, channel_id }) }); setUsername(''); setChannelId(''); await onReload(); }}>
        <MiniSelect label="Platform" value={platform} onChange={setPlatform} options={SOCIAL_FEED_PLATFORMS.map((p) => ({ value: p, label: p }))} />
        <MiniInput label="Username" value={username} onChange={setUsername} />
        <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
      </AddRow>}
    />
  );
}

function GuildMessagesList({
  guildId,
  kind,
  items,
  onReload,
}: {
  guildId: string;
  kind: 'welcome' | 'goodbye';
  items: GuildFullConfig['guildMessages'];
  onReload: () => Promise<void>;
}) {
  const [channel_id, setChannelId] = useState('');
  const [message, setMessage] = useState('');
  const title = kind === 'welcome' ? 'Extra welcome messages' : 'Extra goodbye messages';
  return (
    <CrudList
      title={title}
      desc="When any extra messages exist, they are used instead of the primary message above."
      items={items}
      columns={['ID', 'Channel', 'Message']}
      renderRow={(r) => [String(r.id), r.channel_id, r.message.slice(0, 60)]}
      onDelete={async (r) => {
        await fetch(`/api/guilds/${guildId}/messages?id=${r.id}`, { method: 'DELETE' });
        await onReload();
      }}
      addForm={
        <AddRow
          label={`Add ${kind}`}
          onAdd={async () => {
            await fetch(`/api/guilds/${guildId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind, channel_id, message }),
            });
            setChannelId('');
            setMessage('');
            await onReload();
          }}
        >
          <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
          <MiniInput label="Message" value={message} onChange={setMessage} placeholder="Hey {user}!" />
        </AddRow>
      }
    />
  );
}

function CountersList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['counters']; onReload: () => Promise<void> }) {
  const [channel_id, setChannelId] = useState('');
  const [type, setType] = useState('members');
  const [format, setFormat] = useState('Members: {count}');
  return (
    <CrudList title="Stat counters" desc="Channel names update automatically when members join/leave or channels change." items={items} columns={['Type', 'Channel', 'Format']} renderRow={(r) => [r.type, r.channel_id, r.format]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=counters&id=${r.id}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add counter" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'counters', channel_id, type, format }) }); setChannelId(''); await onReload(); }}>
        <MiniSelect label="Type" value={type} onChange={setType} options={[{ value: 'members', label: 'Members' }, { value: 'bots', label: 'Bots' }, { value: 'channels', label: 'Channels' }]} />
        <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
        <MiniInput label="Format" value={format} onChange={setFormat} placeholder="Members: {count}" />
      </AddRow>}
    />
  );
}

function ReactionRolesList({
  guildId,
  items,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: GuildFullConfig['reactionRoles'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [channel_id, setChannelId] = useState('');
  const [message_id, setMessageId] = useState('');
  const [emoji, setEmoji] = useState('');
  const [role_id, setRoleId] = useState('');

  return (
    <CrudList
      title="Reaction roles"
      desc="Adds the emoji reaction on the message in Discord when you save."
      items={items}
      columns={['Channel', 'Message', 'Emoji', 'Role']}
      renderRow={(r) => [r.channel_id, r.message_id, r.emoji, r.role_id]}
      onDelete={async (r) => {
        await fetch(`/api/guilds/${guildId}/resources?resource=reaction-roles&id=${r.id}`, { method: 'DELETE' });
        await onReload();
      }}
      addForm={
        <AddRow
          label="Add reaction role"
          onAdd={async () => {
            const res = await fetch(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource: 'reaction-roles', channel_id, message_id, emoji, role_id }),
            });
            if (!res.ok) { setMessage((await res.json()).error ?? 'Failed'); return; }
            setMessageId(''); setEmoji(''); setRoleId('');
            await onReload();
          }}
        >
          <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
          <MiniInput label="Message ID" value={message_id} onChange={setMessageId} />
          <MiniInput label="Emoji" value={emoji} onChange={setEmoji} placeholder="👋" />
          <MiniInput label="Role ID" value={role_id} onChange={setRoleId} />
        </AddRow>
      }
    />
  );
}

function ButtonRolesList({
  guildId,
  items,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: GuildFullConfig['buttonRoles'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [channel_id, setChannelId] = useState('');
  const [label, setLabel] = useState('');
  const [role_id, setRoleId] = useState('');

  return (
    <CrudList
      title="Button roles"
      desc="Posts a button panel in the channel — members click to get the role."
      items={items}
      columns={['Channel', 'Message', 'Label', 'Role']}
      renderRow={(r) => [r.channel_id, r.message_id, r.label, r.role_id]}
      onDelete={async (r) => {
        await fetch(`/api/guilds/${guildId}/resources?resource=button-roles&id=${r.id}`, { method: 'DELETE' });
        await onReload();
      }}
      addForm={
        <AddRow
          label="Create button role"
          onAdd={async () => {
            const res = await fetch(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource: 'button-roles', channel_id, label, role_id }),
            });
            if (!res.ok) { setMessage((await res.json()).error ?? 'Failed'); return; }
            setLabel(''); setRoleId('');
            await onReload();
          }}
        >
          <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
          <MiniInput label="Button label" value={label} onChange={setLabel} placeholder="Get role" />
          <MiniInput label="Role ID" value={role_id} onChange={setRoleId} />
        </AddRow>
      }
    />
  );
}

function OpenTicketsTab({
  guildId,
  plan,
  tickets,
  onReload,
  setMessage,
}: {
  guildId: string;
  plan: PlanTier;
  tickets: GuildFullConfig['tickets'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [acting, setActing] = useState<number | null>(null);
  const ticketsEnabled = hasPlanFeature(plan, 'tickets');

  async function ticketAction(id: number, action: 'claim' | 'close') {
    if (!ticketsEnabled) {
      setMessage('Tickets require Premium');
      return;
    }
    setActing(id);
    const res = await fetch(`/api/guilds/${guildId}/tickets`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setActing(null);
    if (!res.ok) {
      setMessage((await res.json()).error ?? `Failed to ${action} ticket`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setMessage(
      action === 'claim'
        ? 'Ticket claimed — staff notified in the channel'
        : data.transcriptSaved
          ? 'Ticket closed — transcript sent to log channel'
          : 'Ticket closed',
    );
    await onReload();
    setTimeout(() => setMessage(''), 3000);
  }

  const open = tickets.filter((t) => t.status === 'open');

  return (
    <div className="card p-6 lg:p-8 space-y-5">
      {!ticketsEnabled && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 text-sm">
          <p className="font-medium">Premium required</p>
          <p className="mt-1 text-muted">Open ticket management requires Premium. Panels and in-Discord commands use the same plan gate.</p>
        </div>
      )}
      <div>
        <h3 className="font-semibold">Open tickets</h3>
        <p className="text-sm text-muted mt-1">Claim or close tickets from the dashboard. Closing saves a transcript to your log channel when configured.</p>
      </div>
      {open.length === 0 ? (
        <p className="text-sm text-muted">No open tickets.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-muted">
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Panel</th>
                <th className="px-4 py-2 font-medium">Claimed</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {open.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="px-4 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.channel_id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.user_id}</td>
                  <td className="px-4 py-2">{t.panel_name ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.claimed_by ?? '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1.5 px-2"
                        disabled={acting === t.id}
                        onClick={() => ticketAction(t.id, 'claim')}
                      >
                        Claim
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-300 px-2"
                        disabled={acting === t.id}
                        onClick={() => ticketAction(t.id, 'close')}
                      >
                        Close
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AutorolesList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['autoroles']; onReload: () => Promise<void> }) {
  const [role_id, setRoleId] = useState('');
  return (
    <CrudList title="Extra autoroles" desc="Additional roles on join (autoroles table)" items={items.map((r, i) => ({ ...r, id: i }))} columns={['Role ID']} renderRow={(r) => [r.role_id]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=autoroles&id=${r.role_id}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add autorole" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'autoroles', role_id }) }); setRoleId(''); await onReload(); }}>
        <MiniInput label="Role ID" value={role_id} onChange={setRoleId} />
      </AddRow>}
    />
  );
}

function VanityList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['vanityRoles']; onReload: () => Promise<void> }) {
  const [vanity_string, setVanity] = useState('');
  const [role_id, setRoleId] = useState('');
  return (
    <CrudList title="Vanity roles" desc="Role when custom status contains a string" items={items.map((r, i) => ({ ...r, id: i }))} columns={['String', 'Role']} renderRow={(r) => [r.vanity_string, r.role_id]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=vanity-roles&key=${encodeURIComponent(r.vanity_string)}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add vanity role" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'vanity-roles', vanity_string, role_id }) }); setVanity(''); setRoleId(''); await onReload(); }}>
        <MiniInput label="Vanity string" value={vanity_string} onChange={setVanity} />
        <MiniInput label="Role ID" value={role_id} onChange={setRoleId} />
      </AddRow>}
    />
  );
}

function AliasesList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['commandAliases']; onReload: () => Promise<void> }) {
  const [alias, setAlias] = useState('');
  const [command, setCommand] = useState('');
  return (
    <CrudList title="Command aliases" items={items} columns={['Alias', 'Command']} renderRow={(r) => [r.alias, r.command]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=command-aliases&id=${r.id}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add alias" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'command-aliases', alias, command }) }); setAlias(''); setCommand(''); await onReload(); }}>
        <MiniInput label="Alias" value={alias} onChange={setAlias} />
        <MiniInput label="Command" value={command} onChange={setCommand} />
      </AddRow>}
    />
  );
}

function ReactionTriggersList({ guildId, items, onReload }: { guildId: string; items: GuildFullConfig['reactionTriggers']; onReload: () => Promise<void> }) {
  const [trigger, setTrigger] = useState('');
  const [emoji, setEmoji] = useState('');
  const [match_type, setMatchType] = useState('contains');
  return (
    <CrudList title="Auto-react triggers" desc="Premium feature — bot adds reactions when messages match" items={items} columns={['Trigger', 'Emoji', 'Match']} renderRow={(r) => [r.trigger, r.emoji, r.match_type]}
      onDelete={async (r) => { await fetch(`/api/guilds/${guildId}/resources?resource=reaction-triggers&id=${r.id}`, { method: 'DELETE' }); await onReload(); }}
      addForm={<AddRow label="Add trigger" onAdd={async () => { await fetch(`/api/guilds/${guildId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'reaction-triggers', trigger, emoji, match_type }) }); setTrigger(''); setEmoji(''); await onReload(); }}>
        <MiniInput label="Trigger text" value={trigger} onChange={setTrigger} />
        <MiniInput label="Emoji" value={emoji} onChange={setEmoji} placeholder="👋 or :custom_emoji:" />
        <MiniSelect label="Match" value={match_type} onChange={setMatchType} options={[{ value: 'contains', label: 'Contains' }, { value: 'exact', label: 'Exact' }, { value: 'startswith', label: 'Starts with' }]} />
      </AddRow>}
    />
  );
}

function PlanCard({ guild, subscription, onRedeem }: { guild: DashboardGuildSettings; subscription: GuildFullConfig['subscription']; onRedeem?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-white/5 p-4 space-y-2">
      <p className="font-medium capitalize">{guild.plan.replace('_', ' ')} plan</p>
      {subscription && <p className="text-sm text-muted">Subscription: <span className="capitalize">{subscription.status}</span>{subscription.expires_at && <> · expires {new Date(subscription.expires_at).toLocaleDateString()}</>}</p>}
      {guild.plan === 'free' && onRedeem && (
        <button type="button" onClick={onRedeem} className="btn-primary text-sm py-2 inline-flex mt-2">Redeem a code</button>
      )}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="card p-6 lg:p-8"><h2 className="text-lg font-semibold mb-1">{title}</h2><p className="text-sm text-muted mb-6">{desc}</p><div className="space-y-5">{children}</div></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{hint && <p className="text-xs text-muted mb-2">{hint}</p>}{children}</div>;
}

function ChannelField({
  value,
  onChange,
  kinds,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  kinds?: ChannelKind[];
}) {
  return <ChannelSelect value={value} onChange={onChange} kinds={kinds} />;
}

function IdInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return <input className="input font-mono text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} placeholder="123456789012345678" />;
}

function Toggle({ label, desc, checked, onChange, premium }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; premium?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${premium ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-background/50'}`}>
      <div><p className="text-sm font-medium">{label}{premium && <span className="ml-2 badge badge-warning text-[10px]">Premium</span>}</p>{desc && <p className="text-xs text-muted mt-0.5">{desc}</p>}</div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`toggle ${checked ? 'toggle-on' : ''}`}><span className="toggle-thumb" /></button>
    </div>
  );
}
