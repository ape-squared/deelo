import { NextResponse } from 'next/server';
import { getDashboardSession, fetchUserGuilds, canManageServer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDiscordBotToken, resolveBotPresenceForGuilds } from '@/lib/discord-bot';
import { resolveEffectivePlan } from '@/lib/plan-resolve';

export async function GET() {
  try {
    const session = await getDashboardSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 });
    }

    const result = await fetchUserGuilds(session.discordId);

    if (!result.ok) {
      const messages: Record<string, string> = {
        no_token: 'Session expired. Please log out and sign in with Discord again.',
        rate_limited: 'Discord is rate limiting requests. Wait a moment and refresh the page.',
        discord_error: 'Could not reach Discord. Try logging out and back in.',
      };
      return NextResponse.json({
        guilds: [],
        user: { id: session.discordId, username: session.username, avatar: session.avatar },
        error: messages[result.reason],
        meta: { fetchFailed: true, reason: result.reason },
      });
    }

    const db = createAdminClient();
    const { data: delegated } = await db
      .from('guild_dashboard_members')
      .select('guild_id, role')
      .eq('discord_id', session.discordId);

    const manageable = result.guilds.filter((g) => canManageServer(g));
    const delegatedIds = new Set((delegated ?? []).map((d) => d.guild_id));
    const discordById = new Map(result.guilds.map((g) => [g.id, g]));

    const allIds = new Set([
      ...manageable.map((g) => g.id),
      ...delegatedIds,
    ]);

    const ids = [...allIds];
    const [botGuildsResult, subsResult] = await Promise.all([
      ids.length
        ? db.from('guilds').select('id, plan, prefix, plan_expires_at').in('id', ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? db.from('subscriptions').select('guild_id, plan, status, expires_at').in('guild_id', ids).eq('status', 'active')
        : Promise.resolve({ data: [], error: null }),
    ]);

    const botMemberIds = await resolveBotPresenceForGuilds(ids);

    // If Discord API is unreachable but we have guild rows, trust DB (bot registered the server).
    if (botMemberIds.size === 0 && ids.length && getDiscordBotToken()) {
      const dbIds = new Set((botGuildsResult.data ?? []).map((g) => g.id));
      for (const id of ids) {
        if (dbIds.has(id)) botMemberIds.add(id);
      }
    }

    const { data: botGuilds, error } = botGuildsResult;
    const subsByGuild = new Map((subsResult.data ?? []).map((s) => [s.guild_id, s]));

    if (error) {
      console.error('guilds query:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    const guilds = ids.map((id) => {
      const g = discordById.get(id);
      const delegatedRole = (delegated ?? []).find((d) => d.guild_id === id)?.role;
      const bot = botGuilds?.find((b) => b.id === id);
      const sub = subsByGuild.get(id);
      const effective = resolveEffectivePlan(
        { plan: bot?.plan ?? 'free', plan_expires_at: bot?.plan_expires_at },
        sub,
      );
      const isDiscordAdmin = g ? canManageServer(g) : false;
      return {
        id,
        name: g?.name ?? `Server ${id.slice(-6)}`,
        icon: g?.icon ?? null,
        owner: g?.owner ?? false,
        botPresent: botMemberIds.has(id),
        plan: effective.plan,
        prefix: bot?.prefix ?? ',',
        planExpiresAt: effective.plan_expires_at,
        dashboardRole: g?.owner ? 'owner' : isDiscordAdmin ? 'admin' : delegatedRole ?? null,
      };
    });

    return NextResponse.json({
      guilds,
      user: { id: session.discordId, username: session.username, avatar: session.avatar },
      meta: {
        totalDiscordGuilds: result.guilds.length,
        manageableGuilds: manageable.length,
        botTokenConfigured: !!getDiscordBotToken(),
        botGuildCount: botMemberIds.size,
      },
    });
  } catch (err) {
    console.error('GET /api/guilds:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
