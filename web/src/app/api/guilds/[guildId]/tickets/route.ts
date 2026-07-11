import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';
import {
  buildTicketTranscript,
  deleteDiscordChannel,
  sendChannelMessage,
  sendTicketClaimNotice,
} from '@/lib/discord-guild-actions';
import { getDiscordBotToken } from '@/lib/discord-bot';
import { loadGuildWithPlan } from '@/lib/guild-plan-loader';
import { hasPlanFeature } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/guild-settings';

async function resolveTicketLogChannel(
  db: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>,
  guildId: string,
): Promise<string | null> {
  const { data: guild } = await db.from('guilds').select('mod_log_channel, extra_config').eq('id', guildId).maybeSingle();
  if (!guild) return null;
  if (guild.mod_log_channel) return guild.mod_log_channel;
  const extra = guild.extra_config as Record<string, unknown> | null;
  const logs = extra?.logs as Record<string, unknown> | undefined;
  const tickets = logs?.tickets;
  return typeof tickets === 'string' ? tickets : null;
}

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { guild } = await loadGuildWithPlan(db, guildId);
  const plan = guild.plan as PlanTier;
  const { data, error } = await db
    .from('tickets')
    .select('id, channel_id, user_id, panel_name, status, claimed_by, created_at, closed_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    tickets: data ?? [],
    ticketsEnabled: hasPlanFeature(plan, 'tickets'),
    botTokenConfigured: !!getDiscordBotToken(),
  });
});

export const PATCH = guildRoute(
  async (req, { guildId, db, access }) => {
    if (!getDiscordBotToken()) {
      return NextResponse.json(
        { error: 'Discord bot token is not configured on the web service. Set DISCORD_BOT_TOKEN or DISCORD_TOKEN.' },
        { status: 503 },
      );
    }

    const { guild } = await loadGuildWithPlan(db, guildId);
    const plan = guild.plan as PlanTier;
    if (!hasPlanFeature(plan, 'tickets')) {
      return NextResponse.json(
        { error: 'Tickets require Premium. Redeem a code on the General tab or upgrade your plan.' },
        { status: 403 },
      );
    }

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

      try {
        await sendTicketClaimNotice(ticket.channel_id, access.discordId);
      } catch {
        /* channel may be inaccessible */
      }

      return NextResponse.json({ ticket: data });
    }

    if (action === 'close') {
      if (ticket.status !== 'open') return badRequest('Ticket is not open.');

      let transcript = '';
      try {
        transcript = await buildTicketTranscript(ticket.channel_id, {
          ticketId: ticket.id,
          userId: ticket.user_id,
          panelName: ticket.panel_name,
        });
      } catch {
        /* continue closing even if transcript fetch fails */
      }

      const logChannelId = await resolveTicketLogChannel(db, guildId);
      if (logChannelId && transcript) {
        try {
          await sendChannelMessage(logChannelId, `Ticket #${ticket.id} closed from dashboard by <@${access.discordId}>`, {
            files: [{ name: `ticket-${ticket.id}.txt`, data: Buffer.from(transcript, 'utf8') }],
          });
        } catch {
          /* log channel optional */
        }
      }

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

      return NextResponse.json({ ok: true, transcriptSaved: !!(logChannelId && transcript) });
    }

    return badRequest('Unknown action. Use claim or close.');
  },
  { module: 'tickets', write: true },
);
