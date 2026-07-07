import type { Guild } from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';
import { deeloEmbed } from '../../utils/embeds';
import type { Track, MusicQueue } from './types';
import { formatDuration, sourceLabel } from './types';
import { trackDisplayUrl } from './spotify';
import { getPreset, listPresetLines, normalizePresetId } from './presets';
import { getGuildPlayer } from './guild-player';
import { getAudioPlayer, getGuildState } from './store';

function gp(guildId: string) {
  return getGuildPlayer(guildId);
}

export function getMusicQueue(guildId: string): MusicQueue | undefined {
  const s = getGuildState(guildId);
  const active = gp(guildId).isActive;
  if (!active && !s.current && !s.queue.length) return undefined;
  return makeQueueView(guildId);
}

function makeQueueView(guildId: string): MusicQueue {
  const s = getGuildState(guildId);
  return {
    tracks: s.queue,
    get current() {
      return s.current;
    },
    set current(v) {
      s.current = v;
    },
    get playing() {
      return gp(guildId).isActive;
    },
    set playing(_v) {
      // no-op — controlled by player
    },
    get paused() {
      return getAudioPlayer(guildId).state.status === AudioPlayerStatus.Paused;
    },
    set paused(_v) {
      // no-op
    },
    get voiceChannel() {
      return s.voiceChannelId;
    },
    set voiceChannel(v) {
      s.voiceChannelId = v;
    },
    get textChannel() {
      return s.textChannelId;
    },
    set textChannel(v) {
      s.textChannelId = v;
    },
    get volume() {
      return s.volume;
    },
    set volume(v) {
      s.volume = v;
    },
    get repeat() {
      return s.repeat;
    },
    set repeat(v) {
      s.repeat = v;
    },
    shuffle: false,
    get preset() {
      return s.preset;
    },
    set preset(v) {
      s.preset = v;
    },
  };
}

export function isMusicActive(guildId: string): boolean {
  return gp(guildId).isActive;
}

export function isPlayingAudio(guildId: string): boolean {
  return gp(guildId).isPlayingAudio();
}

export function canControlPlayback(guildId: string, botInVoice: boolean): boolean {
  return botInVoice || gp(guildId).isPlayingAudio() || gp(guildId).isActive;
}

export function recallTrack(guildId: string): Track | undefined {
  const s = getGuildState(guildId);
  return s.current ?? s.lastPlayed ?? undefined;
}

export async function enqueueTracks(
  guild: Guild,
  voiceChannelId: string,
  textChannelId: string,
  tracks: Track[],
): Promise<{ position: number; track: Track; started: boolean }> {
  return gp(guild.id).enqueue(guild, voiceChannelId, textChannelId, tracks);
}

export async function skipTrack(guildId: string): Promise<Track | null> {
  return gp(guildId).skip();
}

export function pausePlayback(guildId: string): boolean {
  return gp(guildId).pause();
}

export function resumePlayback(guildId: string): boolean {
  return gp(guildId).resume();
}

export function deleteQueue(guildId: string): void {
  gp(guildId).stop();
}

export function setVolume(guildId: string, volume: number): number {
  return gp(guildId).setVolume(volume);
}

export function shuffleQueue(guildId: string): void {
  gp(guildId).shuffle();
}

export function getActivePreset(guildId: string): string {
  return getGuildState(guildId).preset;
}

export async function applyPreset(
  guildId: string,
  presetInput: string,
): Promise<{ id: string; label: string; restarted: boolean }> {
  const presetId = normalizePresetId(presetInput);
  if (!presetId) {
    throw new Error(`Unknown preset **${presetInput}**. Use \`,preset list\` to see options.`);
  }
  const { id, label } = getPreset(presetId);
  const restarted = await gp(guildId).applyPreset(presetId);
  return { id, label, restarted };
}

export function buildNowPlayingEmbed(track: Track) {
  const link = trackDisplayUrl(track);
  return deeloEmbed(
    '🎵 Now Playing',
    `**[${track.title}](${link})**\n` +
      `Duration: \`${formatDuration(track.duration)}\` · Source: **${sourceLabel(track.source)}**\n` +
      `Requested by <@${track.requestedBy}>`,
  );
}

export function buildAddedEmbed(track: Track, position: number, started: boolean) {
  const link = trackDisplayUrl(track);
  const status = started ? 'Now playing' : `Queued · position **${position}**`;
  const source = track.spotifyUrl ? 'Spotify' : sourceLabel(track.source);
  return deeloEmbed(
    started ? '🎵 Now Playing' : '🎵 Added to Queue',
    `**[${track.title}](${link})**\n` +
      `${status} · \`${formatDuration(track.duration)}\` · **${source}**`,
  );
}

export function buildPresetListEmbed(activeId: string) {
  const active = getPreset(activeId);
  const body = [
    `Active preset: **${active.label}** (\`${active.id}\`)`,
    '',
    listPresetLines(activeId === 'off' ? undefined : activeId),
    '',
    'Use `,preset <name>` to apply · `,preset off` to disable',
  ].join('\n');
  return deeloEmbed('🎛️ Audio Presets', body);
}

export async function recoverVoiceSessions(client: import('discord.js').Client): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    const channelId = guild.members.me?.voice.channelId;
    if (!channelId) continue;
    await gp(guild.id).recover(guild, channelId);
  }
}

/** @deprecated */
export function getOrCreateQueue(guildId: string, voiceChannel: string, textChannel: string): MusicQueue {
  const s = getGuildState(guildId);
  if (voiceChannel) s.voiceChannelId = voiceChannel;
  if (textChannel) s.textChannelId = textChannel;
  return makeQueueView(guildId);
}
