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

    const manageable = result.guilds.filter((g) => canManageServer(g));

    const db = createAdminClient();
    const ids = manageable.map((g) => g.id);
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

    const guilds = manageable.map((g) => {
      const bot = botGuilds?.find((b) => b.id === g.id);
      const sub = subsByGuild.get(g.id);
      const effective = resolveEffectivePlan(
        { plan: bot?.plan ?? 'free', plan_expires_at: bot?.plan_expires_at },
        sub,
      );
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
        botPresent: botMemberIds.has(g.id),
        plan: effective.plan,
        prefix: bot?.prefix ?? ',',
        planExpiresAt: effective.plan_expires_at,
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
