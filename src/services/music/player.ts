import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection,
  StreamType,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import play from 'play-dl';
import type { Readable } from 'node:stream';
import type { Guild, TextChannel } from 'discord.js';
import { deeloEmbed } from '../../utils/embeds';
import type { Track, MusicQueue } from './types';
import { formatDuration, sourceLabel } from './types';
import { trackDisplayUrl } from './spotify';
import { streamYoutube } from './ytdlp';

const IDLE_LEAVE_MS = 120_000;

const sessions = new Map<string, GuildMusicSession>();

class GuildMusicSession implements MusicQueue {
  tracks: Track[] = [];
  current: Track | null = null;
  playing = false;
  paused = false;
  voiceChannel = '';
  textChannel = '';
  volume = 100;
  repeat = false;
  shuffle = false;

  connection: VoiceConnection | null = null;
  player: AudioPlayer;
  private busy = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private guildId: string) {
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    this.player.on(AudioPlayerStatus.Idle, () => {
      void this.onIdle();
    });
    this.player.on('error', (err) => {
      console.error(`[music:${this.guildId}] player error:`, err.message);
      void this.onIdle(true);
    });
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private scheduleLeave(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (!this.playing && !this.current && !this.tracks.length) {
        console.log(`[music:${this.guildId}] leaving voice — idle`);
        this.destroyConnection();
      }
    }, IDLE_LEAVE_MS);
  }

  private async onIdle(fromError = false): Promise<void> {
    if (this.busy) return;
    if (fromError && this.current) {
      console.warn(`[music:${this.guildId}] skipping failed track: ${this.current.title}`);
    }
    await this.playNext();
  }

  async ensureConnection(guild: Guild, channelId: string): Promise<VoiceConnection> {
    const existing = getVoiceConnection(guild.id);
    if (existing && this.connection === existing && this.voiceChannel === channelId) {
      if (existing.state.status === VoiceConnectionStatus.Ready) return existing;
    }

    this.destroyConnection();

    const channel =
      guild.channels.cache.get(channelId) ??
      (await guild.channels.fetch(channelId).catch(() => null));

    if (!channel?.isVoiceBased()) {
      throw new Error('Voice channel not found.');
    }

    if (!channel.joinable) {
      throw new Error('I cannot join that voice channel. Check my permissions.');
    }

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    this.voiceChannel = channelId;

    this.connection.on('stateChange', (oldState, newState) => {
      console.log(`[music:${this.guildId}] voice ${oldState.status} → ${newState.status}`);
      if (newState.status !== VoiceConnectionStatus.Disconnected) return;

      void (async () => {
        try {
          await Promise.race([
            entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          if (this.connection?.state.status === VoiceConnectionStatus.Disconnected) {
            console.warn(`[music:${this.guildId}] voice disconnected permanently`);
            this.destroyConnection();
          }
        }
      })();
    });

    this.connection.subscribe(this.player);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (err) {
      const status = this.connection.state.status;
      console.error(`[music:${this.guildId}] voice ready timeout (status=${status}):`, err);
      this.destroyConnection();
      throw new Error('Could not connect to voice channel. Check bot permissions and try again.');
    }

    return this.connection;
  }

  destroyConnection(): void {
    this.clearIdleTimer();
    const conn = this.connection ?? getVoiceConnection(this.guildId);
    conn?.destroy();
    this.connection = null;
  }

  private async createStream(track: Track): Promise<{ stream: Readable; inputType: StreamType }> {
    if (track.source === 'soundcloud' && track.url.includes('soundcloud.com')) {
      const data = await play.stream(track.url);
      return { stream: data.stream, inputType: mapPlayDlType(data.type) };
    }
    // YouTube + anything resolved to a YouTube URL (Spotify, Apple, search, etc.)
    const stream = streamYoutube(track.url);
    return { stream, inputType: StreamType.Arbitrary };
  }

  async playNext(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.clearIdleTimer();

    try {
      if (this.repeat && this.current) {
        this.tracks.unshift(this.current);
      }

      const next = this.tracks.shift() ?? null;
      if (!next) {
        this.current = null;
        this.playing = false;
        this.paused = false;
        this.scheduleLeave();
        return;
      }

      this.current = next;
      this.playing = true;
      this.paused = false;

      console.log(`[music:${this.guildId}] playing: ${next.title}`);

      const { stream, inputType } = await this.createStream(next);
      const resource = createAudioResource(stream, {
        inputType,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume / 100);
      this.player.play(resource);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[music:${this.guildId}] stream error:`, msg);
      this.current = null;
      this.busy = false;
      if (this.tracks.length) {
        await this.playNext();
      } else {
        this.playing = false;
        this.scheduleLeave();
      }
      return;
    } finally {
      this.busy = false;
    }
  }
}

function mapPlayDlType(type: string): StreamType {
  if (type === 'opus') return StreamType.OggOpus;
  if (type === 'webm/opus') return StreamType.WebmOpus;
  return StreamType.Arbitrary;
}

function getSession(guildId: string): GuildMusicSession {
  let session = sessions.get(guildId);
  if (!session) {
    session = new GuildMusicSession(guildId);
    sessions.set(guildId, session);
  }
  return session;
}

export function getMusicQueue(guildId: string): MusicQueue | undefined {
  return sessions.get(guildId);
}

export function getOrCreateQueue(guildId: string, voiceChannel: string, textChannel: string): MusicQueue {
  const session = getSession(guildId);
  if (voiceChannel) session.voiceChannel = voiceChannel;
  if (textChannel) session.textChannel = textChannel;
  return session;
}

export function deleteQueue(guildId: string): void {
  const session = sessions.get(guildId);
  if (!session) return;
  session.player.stop(true);
  session.destroyConnection();
  session.tracks = [];
  session.current = null;
  session.playing = false;
  session.paused = false;
  sessions.delete(guildId);
}

export async function enqueueTracks(
  guild: Guild,
  voiceChannelId: string,
  textChannelId: string,
  tracks: Track[],
): Promise<{ position: number; track: Track; started: boolean }> {
  const session = getSession(guild.id);
  session.voiceChannel = voiceChannelId;
  session.textChannel = textChannelId;

  const wasIdle = !session.playing && !session.current;
  for (const track of tracks) session.tracks.push(track);

  const position = session.tracks.length;
  const track = tracks[tracks.length - 1];

  if (wasIdle) {
    await session.ensureConnection(guild, voiceChannelId);
    await session.playNext();
    return { position: 1, track, started: true };
  }

  return { position, track, started: false };
}

export async function skipTrack(guildId: string): Promise<Track | null> {
  const session = sessions.get(guildId);
  if (!session?.current && !session?.tracks.length) return null;
  const skipped = session.current;
  session.player.stop(true);
  return skipped;
}

export function pausePlayback(guildId: string): boolean {
  const session = sessions.get(guildId);
  if (!session?.playing || session.paused) return false;
  session.player.pause();
  session.paused = true;
  return true;
}

export function resumePlayback(guildId: string): boolean {
  const session = sessions.get(guildId);
  if (!session?.paused) return false;
  session.player.unpause();
  session.paused = false;
  return true;
}

export function setVolume(guildId: string, volume: number): number {
  const session = getSession(guildId);
  session.volume = Math.min(200, Math.max(0, volume));
  if (session.player.state.status === AudioPlayerStatus.Playing) {
    session.player.state.resource.volume?.setVolume(session.volume / 100);
  }
  return session.volume;
}

export function shuffleQueue(guildId: string): void {
  const session = sessions.get(guildId);
  if (!session?.tracks.length) return;
  for (let i = session.tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [session.tracks[i], session.tracks[j]] = [session.tracks[j], session.tracks[i]];
  }
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
  return deeloEmbed(
    started ? '🎵 Now Playing' : '🎵 Added to Queue',
    `**[${track.title}](${link})**\n` +
      `${status} · \`${formatDuration(track.duration)}\` · **${sourceLabel(track.source)}**`,
  );
}

export { sessions as musicSessions };
