import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformStaff, logStaffAction } from '@/lib/platform-staff';
import {
  clearStaffDashboardElevation,
  getStaffDashboardElevation,
  setStaffDashboardElevation,
  staffRoleToDashboardRole,
} from '@/lib/staff-dashboard-access';
import { probeBotInGuild, getDiscordBotToken } from '@/lib/discord-bot';
import { DISCORD_API } from '@/lib/discord-api';

async function fetchGuildSummary(guildId: string): Promise<{ id: string; name: string; icon: string | null } | null> {
  const token = getDiscordBotToken();
  if (!token) return null;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string; name: string; icon: string | null };
    return { id: data.id, name: data.name, icon: data.icon };
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requirePlatformStaff('guilds.dashboard');
  if ('error' in auth) return auth.error;

  const elevation = await getStaffDashboardElevation();
  if (!elevation || elevation.staffDiscordId !== auth.staff.discordId) {
    return NextResponse.json({ active: false });
  }

  const summary = await fetchGuildSummary(elevation.guildId);
  const db = createAdminClient();
  const { data: guild } = await db
    .from('guilds')
    .select('id, plan, prefix')
    .eq('id', elevation.guildId)
    .maybeSingle();

  return NextResponse.json({
    active: true,
    elevation,
    guild: guild ?? { id: elevation.guildId, plan: 'free', prefix: ',' },
    guildName: summary?.name ?? `Server ${elevation.guildId.slice(-6)}`,
    guildIcon: summary?.icon ?? null,
    dashboardRole: staffRoleToDashboardRole(auth.staff.role),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformStaff('guilds.dashboard');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const guildId = String(body.guildId ?? '').trim();
  const reason = String(body.reason ?? '').trim().slice(0, 500) || null;

  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: 'Valid guild snowflake ID is required.' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: guild } = await db.from('guilds').select('id').eq('id', guildId).maybeSingle();
  if (!guild) {
    return NextResponse.json({ error: 'Guild is not registered with Deelo yet.' }, { status: 404 });
  }

  const botPresent = await probeBotInGuild(guildId);
  if (!botPresent) {
    return NextResponse.json({ error: 'Deelo is not in that server. Invite the bot before troubleshooting.' }, { status: 400 });
  }

  const grantedAt = new Date().toISOString();
  await setStaffDashboardElevation({
    staffDiscordId: auth.staff.discordId,
    guildId,
    reason,
    grantedAt,
  });

  await logStaffAction(auth.staff.discordId, 'dashboard.access_grant', 'guild', guildId, {
    reason,
    dashboard_role: staffRoleToDashboardRole(auth.staff.role),
    staff_role: auth.staff.role,
  });

  return NextResponse.json({
    ok: true,
    redirect: `/dashboard/${guildId}`,
    dashboardRole: staffRoleToDashboardRole(auth.staff.role),
  });
}

export async function DELETE() {
  const auth = await requirePlatformStaff('guilds.dashboard');
  if ('error' in auth) return auth.error;

  const elevation = await getStaffDashboardElevation();
  if (elevation && elevation.staffDiscordId === auth.staff.discordId) {
    await logStaffAction(auth.staff.discordId, 'dashboard.access_revoke', 'guild', elevation.guildId, {
      reason: elevation.reason,
    });
  }

  await clearStaffDashboardElevation();
  return NextResponse.json({ ok: true });
}
