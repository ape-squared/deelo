import { NextResponse } from 'next/server';
import { badRequest, guildRoute, snowflake } from '@/lib/guild-route';
import { DISCORD_API } from '@/lib/discord-api';
import { loadGuildWithPlan } from '@/lib/guild-plan-loader';
import { planHasFeature } from '@/lib/plan-gates';
import { sanitizeEmbedTemplate, templateToDiscordApi, type EmbedTemplate } from '@/lib/embed-template';
import { resolveGuildEmbedColor } from '@/lib/bot-appearance';

const DEFAULT_EMBED_COLOR = 0x5865f2;

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const channelId = snowflake(body.channel_id);
  const name = String(body.name ?? '').toLowerCase().trim();
  if (!channelId) return badRequest('Valid channel_id is required.');
  if (!name) return badRequest('Embed name is required.');

  const { guild } = await loadGuildWithPlan(db, guildId);
  if (!planHasFeature(guild.plan, 'embedScripting')) {
    return NextResponse.json({ error: 'Sending embeds requires Premium.' }, { status: 403 });
  }

  const { data, error } = await db
    .from('saved_embeds')
    .select('embed_json')
    .eq('guild_id', guildId)
    .eq('name', name)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inlineJson =
    body.embed_json && typeof body.embed_json === 'object' && !Array.isArray(body.embed_json)
      ? body.embed_json
      : null;
  if (!data && !inlineJson) return NextResponse.json({ error: 'Embed not found.' }, { status: 404 });

  const template = sanitizeEmbedTemplate(inlineJson ?? data!.embed_json, true) as EmbedTemplate;
  const appearanceColor = resolveGuildEmbedColor(
    (guild.extra_config ?? null) as Record<string, unknown> | null,
    guild.plan,
  );
  const defaultColor = appearanceColor ?? DEFAULT_EMBED_COLOR;
  const embedPayload = templateToDiscordApi(template, defaultColor);

  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) return NextResponse.json({ error: 'Bot token is not configured.' }, { status: 500 });

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embedPayload] }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `Discord returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` },
      { status: 502 },
    );
  }

  const message = await res.json();
  return NextResponse.json({ ok: true, message_id: message.id, channel_id: channelId });
});
