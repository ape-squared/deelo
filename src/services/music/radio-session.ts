import type { Track } from './types';
import type { GuildMusicState } from './store';
import { formatDuration, sourceLabel } from './types';
import { deeloEmbed } from '../../utils/embeds';
import { trackDisplayUrl } from './spotify';

export function getLiveQueueTracks(state: GuildMusicState): Track[] {
  return state.queue.filter((t) => t.live);
}

export function isRadioActive(state: GuildMusicState): boolean {
  return Boolean(state.current?.live || getLiveQueueTracks(state).length);
}

export function clearLiveQueue(state: GuildMusicState): number {
  const before = state.queue.length;
  state.queue = state.queue.filter((t) => !t.live);
  return before - state.queue.length;
}

export function removeLiveQueueTrack(state: GuildMusicState, oneBasedIndex: number): Track | null {
  const live = getLiveQueueTracks(state);
  const idx = oneBasedIndex - 1;
  if (idx < 0 || idx >= live.length) return null;
  const target = live[idx];
  state.queue = state.queue.filter((t) => t !== target);
  return target;
}

export function takeLiveQueueTrack(state: GuildMusicState, oneBasedIndex: number): Track | null {
  return removeLiveQueueTrack(state, oneBasedIndex);
}

export function parseStreamUrlInput(raw: string): { url: string; customTitle?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (!urlMatch) return null;
  const url = urlMatch[0];
  const customTitle = trimmed.replace(urlMatch[0], '').trim() || undefined;
  return { url, customTitle };
}

export function buildRadioHelpEmbed() {
  return deeloEmbed(
    '📻 Radio Commands',
    [
      '**Play & switch**',
      '`,stream <url>` — Play or **switch** to a station',
      '`,stream play <url>` — Same as above',
      '`,stream add [name] <url>` — Queue without switching',
      '',
      '**Queue**',
      '`,stream queue` — View now playing + queued stations',
      '`,stream skip` — Next queued station',
      '`,stream play <#>` — Jump to queued station',
      '`,stream remove <#>` — Remove from queue',
      '`,stream clear` — Clear queued stations (keeps current)',
      '',
      '**Controls**',
      '`,stream now` · `,stream pause` · `,stream resume`',
      '`,stream volume <0-200>` · `,stream stop`',
      '',
      'Supports Icecast, Shoutcast, `.pls`, `.m3u`, and `.m3u8`.',
    ].join('\n'),
  );
}

export function buildRadioQueueEmbed(state: GuildMusicState) {
  const lines: string[] = [];
  if (state.current?.live) {
    const t = state.current;
    lines.push(
      `**Now streaming:** [${t.title}](${trackDisplayUrl(t)}) · ${sourceLabel(t.source)} · \`${formatDuration(t.duration, true)}\``,
    );
  } else if (state.current) {
    lines.push(`**Now playing (music):** ${state.current.title} — use \`,stream\` to switch to radio`);
  } else {
    lines.push('**Now streaming:** Nothing');
  }

  const liveQueue = getLiveQueueTracks(state);
  if (liveQueue.length) {
    lines.push('', '**Up next:**');
    liveQueue.slice(0, 15).forEach((t, i) => {
      lines.push(`**${i + 1}.** [${t.title}](${trackDisplayUrl(t)})`);
    });
    if (liveQueue.length > 15) lines.push(`*+ ${liveQueue.length - 15} more*`);
  } else {
    lines.push('', '*No stations queued — use `,stream add <url>`*');
  }

  lines.push('', `Volume: **${state.volume}%**`);
  return deeloEmbed('📻 Radio Queue', lines.join('\n'));
}

export function buildRadioSwitchedEmbed(track: Track, queuedCount: number) {
  const link = trackDisplayUrl(track);
  const extra = queuedCount > 0 ? `\n**${queuedCount}** station(s) still queued.` : '';
  return deeloEmbed(
    '📻 Now Streaming',
    `**[${track.title}](${link})**\nSwitched to this station · \`LIVE\` · **Radio**${extra}`,
  );
}
