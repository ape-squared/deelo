import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireGuildAccess, logGuildDashboardAction } from '@/lib/guild-access';
import { normalizeGuildPatch } from '@/lib/guild-patch';
import { loadGuildWithPlan } from '@/lib/guild-plan-loader';
import { resolveEffectivePlan } from '@/lib/plan-resolve';
import { appearanceConfigTouched, syncBotCustomizationToDiscord } from '@/lib/discord-guild-sync';
import { isValidModuleId, type ModuleId } from '@/lib/dashboard-modules';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const auth = await requireGuildAccess(guildId, { module: 'overview' });
  if ('error' in auth) return auth.error;

  const db = createAdminClient();
  const { guild, subscription: activeSub } = await loadGuildWithPlan(db, guildId);

  const [
    eventTogglesRes,
    filtersRes,
    respondersRes,
    ticketPanelsRes,
    levelRewardsRes,
    economyShopRes,
    countersRes,
    socialFeedsRes,
    vanityRolesRes,
    reactionTriggersRes,
    commandAliasesRes,
    autorolesRes,
    reactionRolesRes,
    buttonRolesRes,
    ticketsRes,
    embedsRes,
    guildMessagesRes,
  ] = await Promise.all([
    db.from('event_toggles').select('event, enabled').eq('guild_id', guildId),
    db.from('filters').select('*').eq('guild_id', guildId).order('id'),
    db.from('auto_responders').select('*').eq('guild_id', guildId).order('id'),
    db.from('ticket_panels').select('*').eq('guild_id', guildId).order('id'),
    db.from('level_rewards').select('*').eq('guild_id', guildId).order('level'),
    db.from('economy_shop_items').select('*').eq('guild_id', guildId).order('sort_order').order('id'),
    db.from('counters').select('*').eq('guild_id', guildId).order('id'),
    db.from('social_feeds').select('*').eq('guild_id', guildId).order('id'),
    db.from('vanity_roles').select('*').eq('guild_id', guildId),
    db.from('reaction_triggers').select('*').eq('guild_id', guildId).order('id'),
    db.from('command_aliases').select('*').eq('guild_id', guildId).order('id'),
    db.from('autoroles').select('*').eq('guild_id', guildId),
    db.from('reaction_roles').select('*').eq('guild_id', guildId).order('id'),
    db.from('button_roles').select('*').eq('guild_id', guildId).order('id'),
    db.from('tickets').select('id, channel_id, user_id, panel_name, status, claimed_by, created_at, closed_at').eq('guild_id', guildId).order('created_at', { ascending: false }).limit(50),
    db.from('saved_embeds').select('id, guild_id, name, embed_json, created_by').eq('guild_id', guildId).order('name'),
    db.from('guild_messages').select('*').eq('guild_id', guildId).order('id'),
  ]);

  return NextResponse.json({
    guild,
    subscription: activeSub ?? null,
    eventToggles: eventTogglesRes.data ?? [],
    filters: filtersRes.data ?? [],
    responders: respondersRes.data ?? [],
    ticketPanels: ticketPanelsRes.data ?? [],
    levelRewards: levelRewardsRes.data ?? [],
    economyShopItems: economyShopRes.data ?? [],
    counters: countersRes.data ?? [],
    socialFeeds: socialFeedsRes.data ?? [],
    vanityRoles: vanityRolesRes.data ?? [],
    reactionTriggers: reactionTriggersRes.data ?? [],
    commandAliases: commandAliasesRes.data ?? [],
    autoroles: autorolesRes.data ?? [],
    reactionRoles: reactionRolesRes.data ?? [],
    buttonRoles: buttonRolesRes.data ?? [],
    tickets: ticketsRes.data ?? [],
    embeds: embedsRes.data ?? [],
    guildMessages: guildMessagesRes.data ?? [],
    access: auth.access,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const moduleParam = body._module;
  const module: ModuleId =
    typeof moduleParam === 'string' && isValidModuleId(moduleParam) && moduleParam !== 'overview'
      ? moduleParam
      : 'general';
  delete body._module;

  const auth = await requireGuildAccess(guildId, { module, write: true });
  if ('error' in auth) return auth.error;
  const db = createAdminClient();

  const { data: existing } = await db.from('guilds').select('plan, extra_config, plan_expires_at').eq('id', guildId).maybeSingle();
  const { data: activeSub } = await db
    .from('subscriptions')
    .select('plan, status, expires_at')
    .eq('guild_id', guildId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const effective = resolveEffectivePlan(
    { plan: existing?.plan ?? 'free', plan_expires_at: existing?.plan_expires_at },
    activeSub,
  );
  const plan = effective.plan;
  const extra = (existing?.extra_config ?? {}) as Record<string, unknown>;

  const { updates, error, eventToggles } = normalizeGuildPatch(body, plan, extra);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const touchedAppearance = appearanceConfigTouched(body);

  await db.from('guilds').upsert({ id: guildId, ...updates }, { onConflict: 'id' });

  for (const { event, enabled } of eventToggles) {
    await db.from('event_toggles').upsert(
      { guild_id: guildId, event, enabled },
      { onConflict: 'guild_id,event' },
    );
  }

  const { guild } = await loadGuildWithPlan(db, guildId);

  let botSync = null;
  if (touchedAppearance || 'extra_config' in updates) {
    botSync = await syncBotCustomizationToDiscord(guildId, guild, {
      sendPreview: touchedAppearance,
    });
  }

  await logGuildDashboardAction(guildId, auth.access.discordId, 'settings.patch', module, {
    fields: Object.keys(updates),
  });

  return NextResponse.json({ guild, synced: { eventToggles, bot: botSync }, access: auth.access });
}
