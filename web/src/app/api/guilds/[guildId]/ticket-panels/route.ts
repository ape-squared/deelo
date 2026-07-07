import { NextResponse } from 'next/server';
import { badRequest, guildRoute, snowflake } from '@/lib/guild-route';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data, error } = await db.from('ticket_panels').select('*').eq('guild_id', guildId).order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticketPanels: data ?? [] });
});

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  const channel_id = snowflake(body.channel_id);
  if (!name || !channel_id) return badRequest('Name and channel ID are required.');

  const { data, error } = await db
    .from('ticket_panels')
    .insert({
      guild_id: guildId,
      name,
      channel_id,
      category_id: snowflake(body.category_id),
      support_role: snowflake(body.support_role),
      form_json: body.form_json ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticketPanel: data });
});

export const DELETE = guildRoute(async (req, { guildId, db }) => {
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10);
  if (!id) return badRequest('Missing panel id.');
  const { error } = await db.from('ticket_panels').delete().eq('id', id).eq('guild_id', guildId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
