import { NextResponse } from 'next/server';
import { badRequest, guildRoute, snowflake } from '@/lib/guild-route';

export const GET = guildRoute(async (req, { guildId, db }) => {
  const kind = new URL(req.url).searchParams.get('kind');
  let query = db.from('guild_messages').select('*').eq('guild_id', guildId).order('id');
  if (kind === 'welcome' || kind === 'goodbye') query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}, { module: 'welcome' });

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const kind = String(body.kind ?? '').toLowerCase();
  const channel_id = snowflake(body.channel_id);
  const message = String(body.message ?? '').trim();
  if (kind !== 'welcome' && kind !== 'goodbye') return badRequest('kind must be welcome or goodbye.');
  if (!channel_id || !message) return badRequest('Channel and message are required.');

  const { data, error } = await db
    .from('guild_messages')
    .insert({ guild_id: guildId, kind, channel_id, message })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}, { module: 'welcome' });

export const DELETE = guildRoute(async (req, { guildId, db }) => {
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10);
  if (!id) return badRequest('id required.');
  const { error } = await db.from('guild_messages').delete().eq('guild_id', guildId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}, { module: 'welcome' });
