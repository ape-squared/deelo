import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';
import { logGuildDashboardAction, guildMeetsRole } from '@/lib/guild-access';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data: members, error } = await db
    .from('guild_dashboard_members')
    .select('discord_id, role, invited_by, created_at')
    .eq('guild_id', guildId)
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: audit } = await db
    .from('guild_dashboard_audit_log')
    .select('id, actor_discord_id, action, module, metadata, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(30);

  return NextResponse.json({ members: members ?? [], audit: audit ?? [] });
}, { module: 'team' });

export const POST = guildRoute(async (req, { guildId, db, access }) => {
  if (!guildMeetsRole(access.role, 'admin')) {
    return NextResponse.json({ error: 'Only server admins can invite dashboard staff' }, { status: 403 });
  }

  const body = await req.json();
  const discordId = String(body.discord_id ?? '').trim();
  const role = String(body.role ?? 'moderator');
  if (!/^\d{17,20}$/.test(discordId)) return badRequest('Valid Discord user ID required.');
  if (!['admin', 'moderator', 'viewer'].includes(role)) return badRequest('Invalid role.');

  const { data, error } = await db
    .from('guild_dashboard_members')
    .upsert(
      { guild_id: guildId, discord_id: discordId, role, invited_by: access.discordId },
      { onConflict: 'guild_id,discord_id' },
    )
    .select('discord_id, role, invited_by, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logGuildDashboardAction(guildId, access.discordId, 'team.invite', 'team', { discordId, role });
  return NextResponse.json({ member: data });
}, { module: 'team', write: true });

export const DELETE = guildRoute(async (req, { guildId, db, access }) => {
  if (!guildMeetsRole(access.role, 'admin')) {
    return NextResponse.json({ error: 'Only server admins can remove dashboard staff' }, { status: 403 });
  }

  const discordId = new URL(req.url).searchParams.get('discord_id');
  if (!discordId) return badRequest('discord_id required');

  const { error } = await db
    .from('guild_dashboard_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('discord_id', discordId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logGuildDashboardAction(guildId, access.discordId, 'team.remove', 'team', { discordId });
  return NextResponse.json({ ok: true });
}, { module: 'team', write: true });
