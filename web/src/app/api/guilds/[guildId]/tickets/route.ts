import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';
import { deleteDiscordChannel } from '@/lib/discord-guild-actions';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data, error } = await db
    .from('tickets')
    .select('id, channel_id, user_id, panel_name, status, claimed_by, created_at, closed_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
});

export const PATCH = guildRoute(
  async (req, { guildId, db, access }) => {
    const body = await req.json();
    const id = parseInt(String(body.id ?? ''), 10);
    const action = String(body.action ?? '').toLowerCase();
    if (!id) return badRequest('Missing ticket id.');

    const { data: ticket, error: fetchError } = await db
      .from('tickets')
      .select('*')
      .eq('id', id)
      .eq('guild_id', guildId)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

    if (action === 'claim') {
      if (ticket.status !== 'open') return badRequest('Ticket is not open.');
      const { data, error } = await db
        .from('tickets')
        .update({ claimed_by: access.discordId })
        .eq('id', id)
        .eq('guild_id', guildId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ticket: data });
    }

    if (action === 'close') {
      const { error } = await db
        .from('tickets')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('guild_id', guildId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      try {
        await deleteDiscordChannel(ticket.channel_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete ticket channel.';
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      return NextResponse.json({ ok: true });
    }

    return badRequest('Unknown action. Use claim or close.');
  },
  { module: 'tickets', write: true },
);
