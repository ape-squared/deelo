import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data, error } = await db.from('filters').select('*').eq('guild_id', guildId).order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ filters: data ?? [] });
});

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const type = String(body.type ?? 'word').toLowerCase();
  const value = String(body.value ?? '').trim();
  const action = String(body.action ?? 'delete');
  if (!value) return badRequest('Filter value is required.');
  if (!['word', 'link', 'invite'].includes(type)) return badRequest('Type must be word, link, or invite.');

  const { data, error } = await db
    .from('filters')
    .insert({ guild_id: guildId, type, value, action, enabled: body.enabled !== false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ filter: data });
});

export const DELETE = guildRoute(async (req, { guildId, db }) => {
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10);
  if (!id) return badRequest('Missing filter id.');
  const { error } = await db.from('filters').delete().eq('id', id).eq('guild_id', guildId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
