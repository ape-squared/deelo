import { NextResponse } from 'next/server';
import { badRequest, guildRoute, snowflake } from '@/lib/guild-route';
import {
  addMessageReaction,
  createButtonRolePanel,
  deleteDiscordMessage,
  fetchGuildCounterStats,
  formatCounterChannelName,
  removeMessageReaction,
  renameDiscordChannel,
  updateButtonRolePanel,
} from '@/lib/discord-guild-actions';

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
    case 'economy-shop':
      return crudList(db, 'economy_shop_items', guildId, 'economyShopItems');
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
    case 'reaction-roles':
      return crudList(db, 'reaction_roles', guildId, 'reactionRoles');
    case 'button-roles':
      return crudList(db, 'button_roles', guildId, 'buttonRoles');
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
    case 'economy-shop': {
      const name = String(body.name ?? '').trim();
      const price = parseInt(String(body.price), 10);
      const role_id = body.role_id ? snowflake(body.role_id) : null;
      const description = body.description ? String(body.description).slice(0, 500) : null;
      const stockRaw = body.stock;
      const stock = stockRaw === '' || stockRaw == null ? null : parseInt(String(stockRaw), 10);
      const enabled = body.enabled !== false;
      if (!name || !price || price <= 0) return badRequest('Name and positive price required.');
      const { data, error } = await db.from('economy_shop_items').insert({
        guild_id: guildId,
        name,
        price,
        role_id,
        description,
        stock: stock == null || isNaN(stock) ? null : stock,
        enabled,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'counters': {
      const channel_id = snowflake(body.channel_id);
      const type = String(body.type ?? 'members');
      const format = String(body.format ?? '{count}');
      if (!channel_id) return badRequest('Channel ID required.');
      const { data, error } = await db.from('counters').insert({ guild_id: guildId, channel_id, type, format }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      try {
        const stats = await fetchGuildCounterStats(guildId);
        const count = type === 'channels' ? stats.channels : type === 'bots' ? stats.bots : stats.members;
        await renameDiscordChannel(channel_id, formatCounterChannelName(format, count));
      } catch {
        /* bot will sync on next event */
      }
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
    case 'reaction-roles': {
      const channel_id = snowflake(body.channel_id);
      const message_id = snowflake(body.message_id);
      const emoji = String(body.emoji ?? '').trim();
      const role_id = snowflake(body.role_id);
      if (!channel_id || !message_id || !emoji || !role_id) {
        return badRequest('Channel, message ID, emoji, and role ID are required.');
      }
      try {
        await addMessageReaction(channel_id, message_id, emoji);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add reaction in Discord.';
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      const { data, error } = await db
        .from('reaction_roles')
        .insert({ guild_id: guildId, channel_id, message_id, emoji, role_id })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'button-roles': {
      const channel_id = snowflake(body.channel_id);
      const label = String(body.label ?? '').trim();
      const role_id = snowflake(body.role_id);
      if (!channel_id) {
        return badRequest('Invalid or missing channel. Select a channel from the dropdown.');
      }
      if (!label) {
        return badRequest('Button label is required.');
      }
      if (!role_id) {
        return badRequest('Invalid or missing role. Select a role from the dropdown.');
      }
      let message_id: string;
      try {
        message_id = await createButtonRolePanel(channel_id, label, role_id, {
          title: body.title ? String(body.title).trim() : undefined,
          description: body.description ? String(body.description).trim() : undefined,
          style: (['primary', 'secondary', 'success', 'danger'] as const).includes(
            (body.style ?? 'primary') as 'primary',
          )
            ? (body.style as 'primary' | 'secondary' | 'success' | 'danger')
            : 'primary',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to post button panel in Discord.';
        console.error('[button-roles] Discord post failed:', msg);
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      const { data, error } = await db
        .from('button_roles')
        .insert({
          guild_id: guildId,
          channel_id,
          message_id,
          label,
          role_id,
          style: body.style ?? 'primary',
        })
        .select()
        .single();
      if (error) {
        console.error('[button-roles] DB insert failed after Discord post:', error.message, { message_id, channel_id });
        return NextResponse.json({
          error: `Panel was posted in Discord but saving failed: ${error.message}`,
        }, { status: 500 });
      }
      return NextResponse.json({ item: data });
    }
    default:
      return badRequest('Unknown resource.');
  }
});

export const PATCH = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const resource = body.resource as string;

  switch (resource) {
    case 'autoroles': {
      const old_role_id = snowflake(body.old_role_id);
      const role_id = snowflake(body.role_id);
      if (!old_role_id || !role_id) return badRequest('Old and new role IDs required.');
      if (old_role_id === role_id) return NextResponse.json({ ok: true });
      const { error: delErr } = await db.from('autoroles').delete().eq('guild_id', guildId).eq('role_id', old_role_id);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
      const { data, error } = await db.from('autoroles').upsert({ guild_id: guildId, role_id }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'vanity-roles': {
      const old_vanity_string = String(body.old_vanity_string ?? body.vanity_string ?? '').trim().toLowerCase();
      const vanity_string = String(body.vanity_string ?? '').trim().toLowerCase();
      const role_id = snowflake(body.role_id);
      if (!old_vanity_string || !vanity_string || !role_id) {
        return badRequest('Vanity string and role ID required.');
      }
      if (old_vanity_string !== vanity_string) {
        await db.from('vanity_roles').delete().eq('guild_id', guildId).eq('vanity_string', old_vanity_string);
      }
      const { data, error } = await db
        .from('vanity_roles')
        .upsert({ guild_id: guildId, vanity_string, role_id })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'reaction-roles': {
      const rowId = parseInt(String(body.id), 10);
      if (!rowId) return badRequest('Missing id.');
      const { data: existing, error: fetchErr } = await db
        .from('reaction_roles')
        .select('*')
        .eq('id', rowId)
        .eq('guild_id', guildId)
        .single();
      if (fetchErr || !existing) return NextResponse.json({ error: 'Reaction role not found.' }, { status: 404 });

      const emoji = body.emoji != null ? String(body.emoji).trim() : existing.emoji;
      const role_id = body.role_id ? snowflake(body.role_id) : existing.role_id;
      if (!emoji || !role_id) return badRequest('Emoji and role ID required.');

      if (emoji !== existing.emoji) {
        try {
          await removeMessageReaction(existing.channel_id, existing.message_id, existing.emoji);
          await addMessageReaction(existing.channel_id, existing.message_id, emoji);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to sync reaction in Discord.';
          return NextResponse.json({ error: msg }, { status: 502 });
        }
      }

      const { data, error } = await db
        .from('reaction_roles')
        .update({ emoji, role_id })
        .eq('id', rowId)
        .eq('guild_id', guildId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: data });
    }
    case 'button-roles': {
      const rowId = parseInt(String(body.id), 10);
      if (!rowId) return badRequest('Missing id.');
      const { data: existing, error: fetchErr } = await db
        .from('button_roles')
        .select('*')
        .eq('id', rowId)
        .eq('guild_id', guildId)
        .single();
      if (fetchErr || !existing) return NextResponse.json({ error: 'Button role not found.' }, { status: 404 });

      const label = body.label != null ? String(body.label).trim() : existing.label;
      const role_id = body.role_id ? snowflake(body.role_id) : existing.role_id;
      const style = body.style != null ? String(body.style) : existing.style;
      if (!label || !role_id) return badRequest('Label and role ID required.');

      try {
        await updateButtonRolePanel(existing.channel_id, existing.message_id, label, role_id, {
          title: body.title ? String(body.title) : undefined,
          description: body.description ? String(body.description) : undefined,
          style: (['primary', 'secondary', 'success', 'danger'] as const).includes(
            style as 'primary',
          )
            ? (style as 'primary' | 'secondary' | 'success' | 'danger')
            : 'primary',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update button panel in Discord.';
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      const { data, error } = await db
        .from('button_roles')
        .update({ label, role_id, style })
        .eq('id', rowId)
        .eq('guild_id', guildId)
        .select()
        .single();
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
    case 'economy-shop':
    case 'counters':
    case 'social-feeds':
    case 'reaction-triggers':
    case 'reaction-roles':
    case 'button-roles':
    case 'command-aliases': {
      const rowId = parseInt(id ?? '', 10);
      if (!rowId) return badRequest('Missing id.');
      const table = resource === 'level-rewards' ? 'level_rewards'
        : resource === 'economy-shop' ? 'economy_shop_items'
        : resource === 'counters' ? 'counters'
        : resource === 'social-feeds' ? 'social_feeds'
        : resource === 'reaction-triggers' ? 'reaction_triggers'
        : resource === 'reaction-roles' ? 'reaction_roles'
        : resource === 'button-roles' ? 'button_roles'
        : 'command_aliases';

      if (resource === 'reaction-roles' || resource === 'button-roles') {
        const { data: row } = await db.from(table).select('*').eq('id', rowId).eq('guild_id', guildId).single();
        if (row) {
          try {
            if (resource === 'reaction-roles') {
              await removeMessageReaction(row.channel_id, row.message_id, row.emoji);
            } else {
              await deleteDiscordMessage(row.channel_id, row.message_id);
            }
          } catch {
            /* panel may already be gone */
          }
        }
      }

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
