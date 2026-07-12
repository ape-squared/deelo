import { NextRequest, NextResponse } from 'next/server';
import { requireGuildManager } from '@/lib/guild-auth';
import { fetchChannelMessages } from '@/lib/discord-guild-actions';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ guildId: string; channelId: string }> },
) {
  const { guildId, channelId } = await params;
  const auth = await requireGuildManager(guildId);
  if ('error' in auth) return auth.error;

  try {
    const messages = await fetchChannelMessages(channelId, 50);
    const items = messages.map((m) => ({
      id: m.id,
      preview: (m.content || m.embeds?.[0]?.description || '[embed/attachment]').slice(0, 80),
      author: m.author?.username ?? 'unknown',
      timestamp: m.timestamp,
    }));
    return NextResponse.json({ messages: items });
  } catch (err) {
    console.error('GET channel messages:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load messages' },
      { status: 502 },
    );
  }
}
