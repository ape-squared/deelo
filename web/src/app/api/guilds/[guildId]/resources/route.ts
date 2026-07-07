import { NextResponse } from 'next/server';
import { badRequest, guildRoute, snowflake } from '@/lib/guild-route';

async function crudList(db: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>, table: string, guildId: string, key: string) {
  const { data, error } = await db.from(table).select('*').eq('guild_id', guildId).order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ [key]: data ?? [] });
}

export const GET = guildRoute(async (req, { guildId, db }) => {
  const resource = new URL(req.url).searchParams.get('resource');
  switch (resource) {
    case 'level-rewards':
      return crudList(db, 'level_rewards', guildId, 'levelRewards');
    case 'counters':
      return crudList(db, 'counters', guildId, 'counters');
    case 'social-feeds':
      return crudList(db, 'social_feeds', guildId, 'socialFeeds');
    case 'vanity-roles':
      return crudList(db, 'vanity_roles', guildId, 'vanityRoles');
    case 'reaction-triggers':
      return crudList(db, 'reaction_triggers', guildId, 'reactionTriggers');
    case 'command-aliases':
      return crudList(db, 'command_aliases', guildId, 'commandAliases');
    case 'autoroles':
      return crudList(db, 'autoroles', guildId, 'autoroles');
    default:
      return badRequest('Unknown resource.');
  }
});

export const POST = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const resource = body.resource as string;

  switch (resource) {
    case 'level-rewards': {
      const level = parseInt(String(body.level), 10);
      const role_id = snowflake(body.role_id);
      if (!level || !role_id) return badRequest('Level and role ID required.');
      const { data, error } = await db.from('level_rewards').insert({ guild_id: guildId, level, role_id }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'counters': {
      const channel_id = snowflake(body.channel_id);
      const type = String(body.type ?? 'members');
      if (!channel_id) return badRequest('Channel ID required.');
      const { data, error } = await db.from('counters').insert({ guild_id: guildId, channel_id, type, format: body.format ?? '{count}' }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'social-feeds': {
      const channel_id = snowflake(body.channel_id);
      const platform = String(body.platform ?? '').toLowerCase();
      const username = String(body.username ?? '').trim();
      if (!channel_id || !platform || !username) return badRequest('Platform, username, and channel required.');
      const { data, error } = await db.from('social_feeds').insert({ guild_id: guildId, platform, channel_id, username }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'vanity-roles': {
      const vanity_string = String(body.vanity_string ?? '').trim().toLowerCase();
      const role_id = snowflake(body.role_id);
      if (!vanity_string || !role_id) return badRequest('Vanity string and role ID required.');
      const { data, error } = await db.from('vanity_roles').upsert({ guild_id: guildId, vanity_string, role_id }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'reaction-triggers': {
      const trigger = String(body.trigger ?? '').trim();
      const emoji = String(body.emoji ?? '').trim();
      if (!trigger || !emoji) return badRequest('Trigger and emoji required.');
      const { data, error } = await db.from('reaction_triggers').insert({ guild_id: guildId, trigger, emoji, match_type: body.match_type ?? 'exact' }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'command-aliases': {
      const alias = String(body.alias ?? '').trim().toLowerCase();
      const command = String(body.command ?? '').trim();
      if (!alias || !command) return badRequest('Alias and command required.');
      const { data, error } = await db.from('command_aliases').insert({ guild_id: guildId, alias, command }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'autoroles': {
      const role_id = snowflake(body.role_id);
      if (!role_id) return badRequest('Role ID required.');
      const { data, error } = await db.from('autoroles').upsert({ guild_id: guildId, role_id }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    default:
      return badRequest('Unknown resource.');
  }
});

export const DELETE = guildRoute(async (req, { guildId, db }) => {
  const url = new URL(req.url);
  const resource = url.searchParams.get('resource');
  const id = url.searchParams.get('id');
  const key = url.searchParams.get('key');

  switch (resource) {
    case 'level-rewards':
    case 'counters':
    case 'social-feeds':
    case 'reaction-triggers':
    case 'command-aliases': {
      const rowId = parseInt(id ?? '', 10);
      if (!rowId) return badRequest('Missing id.');
      const table = resource === 'level-rewards' ? 'level_rewards'
        : resource === 'counters' ? 'counters'
        : resource === 'social-feeds' ? 'social_feeds'
        : resource === 'reaction-triggers' ? 'reaction_triggers'
        : 'command_aliases';
      const { error } = await db.from(table).delete().eq('id', rowId).eq('guild_id', guildId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case 'vanity-roles': {
      if (!key) return badRequest('Missing vanity string key.');
      const { error } = await db.from('vanity_roles').delete().eq('guild_id', guildId).eq('vanity_string', key);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case 'autoroles': {
      const role_id = snowflake(id);
      if (!role_id) return badRequest('Missing role id.');
      const { error } = await db.from('autoroles').delete().eq('guild_id', guildId).eq('role_id', role_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return badRequest('Unknown resource.');
  }
});
