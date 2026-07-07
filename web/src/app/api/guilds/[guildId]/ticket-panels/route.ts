import { NextResponse } from 'next/server';
import { badRequest, guildRoute, snowflake } from '@/lib/guild-route';
import { createTicketPanel, deleteDiscordMessage } from '@/lib/discord-guild-actions';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data, error } = await db.from('ticket_panels').select('*').eq('guild_id', guildId).order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticketPanels: data ?? [] });
});

export const POST = guildRoute(
  async (req, { guildId, db }) => {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const channel_id = snowflake(body.channel_id);
    if (!name || !channel_id) return badRequest('Name and channel are required.');

    const { data: inserted, error: insertError } = await db
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

    if (insertError || !inserted) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to save panel' }, { status: 500 });
    }

    try {
      const message_id = await createTicketPanel(channel_id, inserted.id, name);
      const { data: updated, error: updateError } = await db
        .from('ticket_panels')
        .update({ message_id })
        .eq('id', inserted.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ ticketPanel: updated });
    } catch (err) {
      await db.from('ticket_panels').delete().eq('id', inserted.id);
      const msg = err instanceof Error ? err.message : 'Failed to post panel to Discord';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  },
  { module: 'tickets', write: true },
);

export const DELETE = guildRoute(
  async (req, { guildId, db }) => {
    const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10);
    if (!id) return badRequest('Missing panel id.');

    const { data: panel } = await db
      .from('ticket_panels')
      .select('channel_id, message_id')
      .eq('id', id)
      .eq('guild_id', guildId)
      .maybeSingle();

    if (panel?.message_id && panel.channel_id) {
      try {
        await deleteDiscordMessage(panel.channel_id, panel.message_id);
      } catch {
        /* panel row still removed if Discord message is gone */
      }
    }

    const { error } = await db.from('ticket_panels').delete().eq('id', id).eq('guild_id', guildId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { module: 'tickets', write: true },
);
