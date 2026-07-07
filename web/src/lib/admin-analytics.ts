import type { createAdminClient } from '@/lib/supabase/admin';
import { getBotStatus } from '@/lib/bot-status';

type AdminDb = ReturnType<typeof createAdminClient>;

export interface AdminAnalytics {
  bot: Awaited<ReturnType<typeof getBotStatus>>;
  counts: {
    guilds: number;
    dashboardUsers: number;
    memberXp: number;
    modCases: number;
    warnings: number;
    openTickets: number;
    autoResponders: number;
    filters: number;
    reactionTriggers: number;
    activeGiveaways: number;
    redeemCodes: number;
    redeemUses: number;
  };
  plans: { free: number; premium: number; premium_plus: number };
  subscriptions: { active: number; cancelled: number; expiring7d: number };
  growth: { date: string; count: number }[];
  modules: { label: string; count: number }[];
}

export async function getAdminAnalytics(db: AdminDb): Promise<AdminAnalytics> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    bot,
    guildCount,
    userCount,
    xpCount,
    casesCount,
    warningsCount,
    ticketsCount,
    respondersCount,
    filtersCount,
    triggersCount,
    giveawaysCount,
    codesCount,
    usesCount,
    planRows,
    subs,
    recentGuilds,
    levelsEnabled,
    automodEnabled,
    ticketsPanels,
    socialFeeds,
  ] = await Promise.all([
    getBotStatus(),
    db.from('guilds').select('*', { count: 'exact', head: true }),
    db.from('dashboard_users').select('*', { count: 'exact', head: true }),
    db.from('member_xp').select('*', { count: 'exact', head: true }),
    db.from('mod_cases').select('*', { count: 'exact', head: true }),
    db.from('warnings').select('*', { count: 'exact', head: true }),
    db.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('auto_responders').select('*', { count: 'exact', head: true }),
    db.from('filters').select('*', { count: 'exact', head: true }),
    db.from('reaction_triggers').select('*', { count: 'exact', head: true }),
    db.from('giveaways').select('*', { count: 'exact', head: true }).eq('ended', false),
    db.from('redeem_codes').select('*', { count: 'exact', head: true }),
    db.from('redeem_code_uses').select('*', { count: 'exact', head: true }),
    db.from('guilds').select('plan'),
    db.from('subscriptions').select('status, expires_at'),
    db.from('guilds').select('created_at').gte('created_at', weekAgo).order('created_at'),
    db.from('guilds').select('*', { count: 'exact', head: true }).eq('levels_enabled', true),
    db.from('guilds').select('*', { count: 'exact', head: true }).eq('automod_enabled', true),
    db.from('ticket_panels').select('*', { count: 'exact', head: true }),
    db.from('social_feeds').select('*', { count: 'exact', head: true }),
  ]);

  const plans = { free: 0, premium: 0, premium_plus: 0 };
  for (const g of planRows.data ?? []) {
    const p = g.plan as keyof typeof plans;
    if (p in plans) plans[p]++;
  }

  const now = Date.now();
  const week = now + 7 * 86400000;
  let active = 0;
  let cancelled = 0;
  let expiring7d = 0;
  for (const s of subs.data ?? []) {
    if (s.status === 'active') {
      active++;
      if (s.expires_at) {
        const exp = new Date(s.expires_at).getTime();
        if (exp > now && exp < week) expiring7d++;
      }
    } else if (s.status === 'cancelled') cancelled++;
  }

  const byDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const g of recentGuilds.data ?? []) {
    const day = g.created_at.slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return {
    bot,
    counts: {
      guilds: guildCount.count ?? 0,
      dashboardUsers: userCount.count ?? 0,
      memberXp: xpCount.count ?? 0,
      modCases: casesCount.count ?? 0,
      warnings: warningsCount.count ?? 0,
      openTickets: ticketsCount.count ?? 0,
      autoResponders: respondersCount.count ?? 0,
      filters: filtersCount.count ?? 0,
      reactionTriggers: triggersCount.count ?? 0,
      activeGiveaways: giveawaysCount.count ?? 0,
      redeemCodes: codesCount.count ?? 0,
      redeemUses: usesCount.count ?? 0,
    },
    plans,
    subscriptions: { active, cancelled, expiring7d },
    growth: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
    modules: [
      { label: 'Levels enabled', count: levelsEnabled.count ?? 0 },
      { label: 'Automod enabled', count: automodEnabled.count ?? 0 },
      { label: 'Ticket panels', count: ticketsPanels.count ?? 0 },
      { label: 'Social feeds', count: socialFeeds.count ?? 0 },
      { label: 'Auto responders', count: respondersCount.count ?? 0 },
      { label: 'Filters', count: filtersCount.count ?? 0 },
    ],
  };
}
