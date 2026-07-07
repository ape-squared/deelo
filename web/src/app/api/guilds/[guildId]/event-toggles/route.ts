import { NextResponse } from 'next/server';
import { badRequest, guildRoute } from '@/lib/guild-route';

export const PATCH = guildRoute(async (req, { guildId, db }) => {
  const body = await req.json();
  const toggles = body.toggles as Array<{ event: string; enabled: boolean }> | undefined;
  if (!Array.isArray(toggles) || !toggles.length) return badRequest('Provide toggles array.');

  for (const { event, enabled } of toggles) {
    if (!event) continue;
    await db.from('event_toggles').upsert(
      { guild_id: guildId, event, enabled: !!enabled },
      { onConflict: 'guild_id,event' },
    );
  }

  const { data } = await db.from('event_toggles').select('event, enabled').eq('guild_id', guildId);
  return NextResponse.json({ eventToggles: data ?? [] });
});
