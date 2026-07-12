import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOperator, logPlatformAction } from '@/lib/platform-operator';
import { mergeOfficialDiscordEmbeds } from '@/lib/official-server-embeds';
import {
  loadOfficialDiscordEmbeds,
  saveOfficialDiscordEmbeds,
  syncOfficialDiscordEmbeds,
} from '@/lib/official-discord-sync';

export async function GET() {
  const auth = await requirePlatformOperator({ cmsRead: true });
  if ('error' in auth) return auth.error;

  try {
    const settings = await loadOfficialDiscordEmbeds();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

  const body = await req.json();
  const settings = mergeOfficialDiscordEmbeds(body.settings ?? body);

  try {
    await saveOfficialDiscordEmbeds(settings, operator.id);
    await logPlatformAction(operator, 'official_discord.update', 'site_settings', 'official_discord_embeds', {
      channels: settings.channels.length,
    });
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformOperator({ cmsWrite: true });
  if ('error' in auth) return auth.error;
  const { operator } = auth;

  const body = await req.json().catch(() => ({}));
  let settings = await loadOfficialDiscordEmbeds();
  if (body.settings) {
    settings = mergeOfficialDiscordEmbeds(body.settings);
  }

  try {
    const synced = await syncOfficialDiscordEmbeds(settings);
    await saveOfficialDiscordEmbeds(synced.settings, operator.id);
    await logPlatformAction(operator, 'official_discord.sync', 'site_settings', 'official_discord_embeds', {
      results: synced.results,
    });
    return NextResponse.json({ settings: synced.settings, results: synced.results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to sync embeds';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
