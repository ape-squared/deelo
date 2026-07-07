import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data, error } = await db.from('auto_responders').select('*').eq('guild_id', guildId).order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responders: data ?? [] });
});

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const trigger = String(body.trigger ?? '').trim();
  const response = String(body.response ?? '').trim();
  const match_type = String(body.match_type ?? 'contains');
  if (!trigger || !response) return badRequest('Trigger and response are required.');

  const { data, error } = await db
    .from('auto_responders')
    .insert({ guild_id: guildId, trigger, response, match_type, enabled: body.enabled !== false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responder: data });
});

export const PATCH = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const id = parseInt(String(body.id ?? ''), 10);
  if (!id) return badRequest('Missing responder id.');

  const updates: Record<string, unknown> = {};
  if ('enabled' in body) updates.enabled = !!body.enabled;
  if ('trigger' in body) updates.trigger = String(body.trigger).trim();
  if ('response' in body) updates.response = String(body.response).trim();
  if ('match_type' in body) updates.match_type = String(body.match_type);

  const { data, error } = await db.from('auto_responders').update(updates).eq('id', id).eq('guild_id', guildId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responder: data });
});

export const DELETE = guildRoute(async (req, { guildId, db }) => {
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10);
  if (!id) return badRequest('Missing responder id.');
  const { error } = await db.from('auto_responders').delete().eq('id', id).eq('guild_id', guildId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
