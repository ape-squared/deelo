import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';
import { embedSlug, sanitizeEmbedTemplate } from '@/lib/embed-template';
import { loadGuildWithPlan } from '@/lib/guild-plan-loader';
import { planHasFeature } from '@/lib/plan-gates';
import { getLimit } from '@/lib/plan-limits';

export const GET = guildRoute(async (_req, { guildId, db }) => {
  const { data, error } = await db
    .from('saved_embeds')
    .select('id, guild_id, name, embed_json, created_by')
    .eq('guild_id', guildId)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ embeds: data ?? [] });
});

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const name = embedSlug(String(body.name ?? ''));
  if (!name) return badRequest('Embed name is required (letters, numbers, - and _).');

  const { guild } = await loadGuildWithPlan(db, guildId);
  const plan = guild.plan;
  const premium = planHasFeature(plan, 'embedScripting');

  const { count } = await db
    .from('saved_embeds')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', guildId);
  const max = getLimit(plan, 'maxSavedEmbeds');
  const existing = await db
    .from('saved_embeds')
    .select('id')
    .eq('guild_id', guildId)
    .eq('name', name)
    .maybeSingle();
  if (!existing.data && (count ?? 0) >= max) {
    return NextResponse.json({ error: `Embed limit reached (${max}) for your plan.` }, { status: 400 });
  }

  const embed_json = sanitizeEmbedTemplate(body.embed_json ?? body, premium);
  const created_by = String(body.created_by ?? 'dashboard');

  const { data, error } = await db
    .from('saved_embeds')
    .upsert({ guild_id: guildId, name, embed_json, created_by }, { onConflict: 'guild_id,name' })
    .select('id, guild_id, name, embed_json, created_by')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ embed: data });
});

export const PATCH = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const id = parseInt(String(body.id ?? ''), 10);
  if (!id) return badRequest('Missing embed id.');

  const { guild } = await loadGuildWithPlan(db, guildId);
  const premium = planHasFeature(guild.plan, 'embedScripting');

  const updates: Record<string, unknown> = {};
  if ('name' in body) {
    const name = embedSlug(String(body.name));
    if (!name) return badRequest('Invalid embed name.');
    updates.name = name;
  }
  if ('embed_json' in body) {
    updates.embed_json = sanitizeEmbedTemplate(body.embed_json, premium);
  }

  const { data, error } = await db
    .from('saved_embeds')
    .update(updates)
    .eq('id', id)
    .eq('guild_id', guildId)
    .select('id, guild_id, name, embed_json, created_by')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ embed: data });
});

export const DELETE = guildRoute(async (req, { guildId, db }) => {
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10);
  if (!id) return badRequest('Missing embed id.');
  const { error } = await db.from('saved_embeds').delete().eq('id', id).eq('guild_id', guildId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
