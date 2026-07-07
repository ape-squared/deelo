import {
  joinVoiceChannel,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection,
  type VoiceConnection,
} from '@discordjs/voice';
import { ChannelType, type Guild } from 'discord.js';
import type { Track } from './types';
import { createTrackStream } from './stream';
import {
  clearGuildState,
  getAudioPlayer,
  getGuildState,
  getMusicStore,
  hasListeners,
  markListeners,
} from './store';

const IDLE_LEAVE_MS = 120_000;

export class GuildPlayer {
  readonly state: import('./store').GuildMusicState;
  private connection: VoiceConnection | null = null;
  private busy = false;
  private pendingIdle = false;
  private playGeneration = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly guildId: string) {
    this.state = getGuildState(guildId);
  }

  private get player() {
    return getAudioPlayer(this.guildId);
  }

  get isActive(): boolean {
    const status = this.player.state.status;
    return Boolean(
      this.state.current ||
        this.state.queue.length > 0 ||
        status === AudioPlayerStatus.Playing ||
        status === AudioPlayerStatus.Paused ||
        status === AudioPlayerStatus.Buffering,
    );
  }

  init(): void {
    if (hasListeners(this.guildId)) return;
    this.player.on(AudioPlayerStatus.Idle, () => {
      void this.onIdle();
    });
    this.player.on('error', (err) => {
      console.error(`[music:${this.guildId}] player error:`, err.message);
      void this.onIdle(true);
    });
    markListeners(this.guildId);
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
      if (!this.isActive) {
        console.log(`[music:${this.guildId}] leaving voice — idle`);
        this.disconnect();
      }
    }, IDLE_LEAVE_MS);
  }

  private async onIdle(fromError = false): Promise<void> {
    if (this.busy) {
      this.pendingIdle = true;
      return;
    }
    if (fromError && this.state.current) {
      console.warn(`[music:${this.guildId}] track failed: ${this.state.current.title}`);
    }
    await this.playNext();
  }

  private finishBusy(): void {
    this.busy = false;
    if (this.pendingIdle) {
      this.pendingIdle = false;
      void this.onIdle();
    }
  }

  async connect(guild: Guild, channelId: string): Promise<VoiceConnection> {
    const existing = getVoiceConnection(guild.id);
    if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection = existing;
      this.state.voiceChannelId = channelId;
      if (existing.state.status !== VoiceConnectionStatus.Ready) {
        await entersState(existing, VoiceConnectionStatus.Ready, 15_000);
      }
      existing.subscribe(this.player);
      return existing;
    }

    const fullGuild = await guild.client.guilds.fetch(guild.id);
    const channel =
      fullGuild.channels.cache.get(channelId) ??
      (await fullGuild.channels.fetch(channelId).catch(() => null));

    if (!channel?.isVoiceBased()) {
      throw new Error('Voice channel not found.');
    }
    if (!channel.joinable) {
      throw new Error('I cannot join that voice channel. Check Connect and Speak permissions.');
    }

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: fullGuild.id,
      adapterCreator: fullGuild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
    this.state.voiceChannelId = channelId;

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        if (this.connection?.state.status === VoiceConnectionStatus.Disconnected) {
          this.disconnect();
        }
      }
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);

    if (channel.type === ChannelType.GuildStageVoice) {
      await fullGuild.members.me?.voice.setSuppressed(false).catch(() => {});
    }

    this.connection.subscribe(this.player);
    return this.connection;
  }

  disconnect(): void {
    this.clearIdleTimer();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    getVoiceConnection(this.guildId)?.destroy();
  }

  async enqueue(
    guild: Guild,
    voiceChannelId: string,
    textChannelId: string,
    tracks: Track[],
  ): Promise<{ position: number; track: Track; started: boolean }> {
    this.init();
    this.state.voiceChannelId = voiceChannelId;
    this.state.textChannelId = textChannelId;

    const wasIdle = !this.isActive;
    this.state.queue.push(...tracks);
    const track = tracks[tracks.length - 1];
    const position = this.state.queue.length;

    if (wasIdle) {
      await this.connect(guild, voiceChannelId);
      await this.playNext();
      return { position: 1, track, started: this.isActive };
    }

    return { position, track, started: false };
  }

  async playNext(): Promise<void> {
    if (this.busy) {
      this.pendingIdle = true;
      return;
    }

    const generation = this.playGeneration;
    this.busy = true;
    this.clearIdleTimer();

    try {
      if (this.state.repeat && this.state.current) {
        this.state.queue.unshift(this.state.current);
      }

      const next = this.state.queue.shift() ?? null;
      if (!next) {
        this.state.current = null;
        this.scheduleLeave();
        return;
      }

      this.state.current = next;
      this.state.lastPlayed = next;
      console.log(`[music:${this.guildId}] playing: ${next.title}`);

      const { stream, inputType, inlineVolume } = await createTrackStream(next, this.state.preset);
      if (generation !== this.playGeneration) {
        stream.destroy();
        return;
      }

      const resource = createAudioResource(stream, { inputType, inlineVolume });
      resource.volume?.setVolume(this.state.volume / 100);
      this.player.play(resource);
    } catch (err) {
      if (generation !== this.playGeneration) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[music:${this.guildId}] stream error:`, msg);
      this.state.current = null;
      if (this.state.queue.length) {
        await this.playNext();
      } else {
        this.scheduleLeave();
      }
    } finally {
      this.finishBusy();
    }
  }

  async skip(): Promise<Track | null> {
    this.init();
    const skipped = this.state.current ?? this.state.lastPlayed;
    this.playGeneration++;

    const status = this.player.state.status;
    console.log(
      `[music:${this.guildId}] skip (status=${status}, current=${this.state.current?.title ?? 'none'}, queued=${this.state.queue.length})`,
    );

    if (
      status === AudioPlayerStatus.Playing ||
      status === AudioPlayerStatus.Paused ||
      status === AudioPlayerStatus.Buffering
    ) {
      this.player.stop(true);
    } else if (this.state.queue.length) {
      await this.playNext();
    } else {
      this.state.current = null;
      this.scheduleLeave();
    }

    return skipped;
  }

  pause(): boolean {
    this.init();
    if (this.player.state.status !== AudioPlayerStatus.Playing) return false;
    this.player.pause();
    return true;
  }

  resume(): boolean {
    this.init();
    if (this.player.state.status !== AudioPlayerStatus.Paused) return false;
    this.player.unpause();
    return true;
  }

  stop(): void {
    this.playGeneration++;
    this.state.queue = [];
    this.state.current = null;
    this.player.stop(true);
    this.disconnect();
    clearGuildState(this.guildId);
    getMusicStore().guildPlayers.delete(this.guildId);
  }

  setVolume(volume: number): number {
    this.state.volume = Math.min(200, Math.max(0, volume));
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.state.resource.volume?.setVolume(this.state.volume / 100);
    }
    return this.state.volume;
  }

  shuffle(): void {
    const q = this.state.queue;
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
  }

  async applyPreset(presetId: string): Promise<boolean> {
    this.state.preset = presetId;
    if (!this.state.current || !this.isActive) return false;

    this.state.queue.unshift(this.state.current);
    this.playGeneration++;
    const status = this.player.state.status;
    if (
      status === AudioPlayerStatus.Playing ||
      status === AudioPlayerStatus.Paused ||
      status === AudioPlayerStatus.Buffering
    ) {
      this.player.stop(true);
    } else {
      await this.playNext();
    }
    return true;
  }

  /** Re-link voice after bot restart while still in a channel. */
  async recover(guild: Guild, voiceChannelId: string): Promise<void> {
    this.init();
    this.state.voiceChannelId = voiceChannelId;
    const conn = getVoiceConnection(guild.id);
    if (conn && conn.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection = conn;
      conn.subscribe(this.player);
    }
    console.log(
      `[music:${this.guildId}] recovered (channel=${voiceChannelId}, status=${this.player.state.status})`,
    );
  }
}

export function getGuildPlayer(guildId: string): GuildPlayer {
  const store = getMusicStore();
  let gp = store.guildPlayers.get(guildId) as GuildPlayer | undefined;
  if (!gp || typeof gp.skip !== 'function') {
    gp = new GuildPlayer(guildId);
    gp.init();
    store.guildPlayers.set(guildId, gp);
  }
  return gp;
}
