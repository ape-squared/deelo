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
const MAX_LIVE_RETRIES = 5;
const MIN_LIVE_PLAY_MS = 3_000;
const LIVE_RECONNECT_BASE_MS = 2_000;

export class GuildPlayer {
  readonly state: import('./store').GuildMusicState;
  private connection: VoiceConnection | null = null;
  private boundConnection: VoiceConnection | null = null;
  private busy = false;
  private pendingIdle = false;
  private playGeneration = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private liveRetries = 0;
  private livePlayStartedAt = 0;
  private liveReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly guildId: string) {
    this.state = getGuildState(guildId);
  }

  private get player() {
    return getAudioPlayer(this.guildId);
  }

  private isPlayerRunning(): boolean {
    const status = this.player.state.status;
    return (
      status === AudioPlayerStatus.Playing ||
      status === AudioPlayerStatus.Paused ||
      status === AudioPlayerStatus.Buffering
    );
  }

  /** True when audio is playing or a track session is in progress. */
  isPlayingAudio(): boolean {
    if (this.isPlayerRunning()) return true;
    const conn = getVoiceConnection(this.guildId);
    if (conn?.state.status === VoiceConnectionStatus.Ready && this.state.current) {
      return true;
    }
    return false;
  }

  /** True when we should append to the queue instead of starting fresh playback. */
  private inPlaybackSession(): boolean {
    if (this.busy) return true;
    if (this.isPlayerRunning()) return true;
    const conn = getVoiceConnection(this.guildId);
    return Boolean(conn?.state.status === VoiceConnectionStatus.Ready && this.state.current);
  }

  get isActive(): boolean {
    return Boolean(
      this.isPlayingAudio() ||
        this.state.current ||
        this.state.queue.length > 0,
    );
  }

  /** Drop ghost state left by hot reloads (current set but player idle, etc.). */
  private pruneStaleState(): void {
    const status = this.player.state.status;
    const inVoice = getVoiceConnection(this.guildId)?.state.status === VoiceConnectionStatus.Ready;

    if (
      !this.state.current &&
      (status === AudioPlayerStatus.Playing ||
        status === AudioPlayerStatus.Paused ||
        status === AudioPlayerStatus.Buffering)
    ) {
      console.log(`[music:${this.guildId}] resetting orphaned player (${status})`);
      this.player.stop(true);
    }

    // Only clear current when bot is not in an active voice session
    if (
      this.state.current &&
      status === AudioPlayerStatus.Idle &&
      !this.state.queue.length &&
      !this.busy &&
      !inVoice
    ) {
      console.log(`[music:${this.guildId}] clearing stale current track`);
      this.state.current = null;
    }
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

  private clearLiveReconnectTimer(): void {
    if (this.liveReconnectTimer) {
      clearTimeout(this.liveReconnectTimer);
      this.liveReconnectTimer = null;
    }
  }

  /** Back off live reconnects — instant idle means the upstream/ffmpeg failed, not a clean EOF. */
  private scheduleLiveReconnect(liveTrack: Track, fromError: boolean): void {
    if (this.liveReconnectTimer) return;

    const playedMs = this.livePlayStartedAt ? Date.now() - this.livePlayStartedAt : 0;
    const shortPlay = playedMs < MIN_LIVE_PLAY_MS;

    if (shortPlay || fromError) {
      this.liveRetries++;
    } else if (this.liveRetries > 0) {
      this.liveRetries--;
    }

    if (this.liveRetries > MAX_LIVE_RETRIES) {
      console.warn(
        `[music:${this.guildId}] live stream gave up after ${MAX_LIVE_RETRIES} retries: ${liveTrack.title}`,
      );
      this.state.current = null;
      this.livePlayStartedAt = 0;
      this.scheduleLeave();
      return;
    }

    const delay = LIVE_RECONNECT_BASE_MS * 2 ** Math.min(this.liveRetries - 1, 4);
    console.log(
      `[music:${this.guildId}] live reconnect in ${(delay / 1000).toFixed(1)}s (${this.liveRetries}/${MAX_LIVE_RETRIES}): ${liveTrack.title}`,
    );

    this.liveReconnectTimer = setTimeout(() => {
      this.liveReconnectTimer = null;
      if (!this.state.current?.live || this.state.queue.length || this.state.repeat) return;
      this.state.queue.unshift(liveTrack);
      void this.playNext();
    }, delay);
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

    const liveTrack = this.state.current?.live ? this.state.current : null;
    if (liveTrack && !this.state.repeat && !this.state.queue.length) {
      this.scheduleLiveReconnect(liveTrack, fromError);
      return;
    }

    try {
      await this.playNext();
    } catch (err) {
      console.error(`[music:${this.guildId}] could not advance queue:`, err);
    }
  }

  private finishBusy(): void {
    this.busy = false;
    if (this.pendingIdle) {
      this.pendingIdle = false;
      void this.onIdle();
    }
  }

  private ensureVoiceSubscription(): void {
    const conn = getVoiceConnection(this.guildId);
    if (!conn || conn.state.status === VoiceConnectionStatus.Destroyed) return;
    this.connection = conn;
    try {
      conn.subscribe(this.player);
    } catch {
      // already subscribed
    }
  }

  private async waitUntilNotBusy(timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.busy && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private bindConnectionEvents(conn: VoiceConnection): void {
    if (this.boundConnection === conn) return;
    this.boundConnection = conn;
    conn.on('error', (err) => {
      console.error(`[music:${this.guildId}] voice error:`, err.message);
    });
  }

  private async destroyVoice(): Promise<void> {
    this.clearIdleTimer();
    this.clearLiveReconnectTimer();
    try {
      this.connection?.destroy();
    } catch {
      // ignore
    }
    try {
      getVoiceConnection(this.guildId)?.destroy();
    } catch {
      // ignore
    }
    this.connection = null;
    this.boundConnection = null;
    await new Promise((r) => setTimeout(r, 400));
  }

  async connect(guild: Guild, channelId: string): Promise<VoiceConnection> {
    const existing = getVoiceConnection(guild.id);
    if (existing?.state.status === VoiceConnectionStatus.Ready) {
      this.connection = existing;
      this.state.voiceChannelId = channelId;
      this.bindConnectionEvents(existing);
      existing.subscribe(this.player);
      return existing;
    }

    if (existing) {
      await this.destroyVoice();
    }

    const fullGuild = await guild.client.guilds.fetch(guild.id);
    const me = fullGuild.members.me ?? (await fullGuild.members.fetchMe().catch(() => null));

    // Bot can still appear in VC after a crash/restart while this process has no voice socket
    if (me?.voice.channelId) {
      console.log(`[music:${this.guildId}] clearing ghost voice state before join`);
      await me.voice.disconnect().catch(() => {});
      await new Promise((r) => setTimeout(r, 750));
    }

    const channel =
      fullGuild.channels.cache.get(channelId) ??
      (await fullGuild.channels.fetch(channelId).catch(() => null));

    if (!channel?.isVoiceBased()) {
      throw new Error('Voice channel not found.');
    }
    if (!channel.joinable) {
      throw new Error('I cannot join that voice channel. Check Connect and Speak permissions.');
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[music:${this.guildId}] joining voice (attempt ${attempt})`);

        this.connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: fullGuild.id,
          adapterCreator: fullGuild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });
        this.state.voiceChannelId = channelId;
        this.bindConnectionEvents(this.connection);

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
              entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
            ]);
          } catch {
            if (this.connection?.state.status === VoiceConnectionStatus.Disconnected) {
              void this.destroyVoice();
            }
          }
        });

        await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);

        if (channel.type === ChannelType.GuildStageVoice) {
          await fullGuild.members.me?.voice.setSuppressed(false).catch(() => {});
        }

        this.connection.subscribe(this.player);
        return this.connection;
      } catch (err) {
        lastError = err;
        console.error(`[music:${this.guildId}] voice join failed (attempt ${attempt}):`, err);
        await this.destroyVoice();
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 600));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Could not connect to voice. Try `,stop` then `,play` again.');
  }

  disconnect(): void {
    void this.destroyVoice();
  }

  async enqueue(
    guild: Guild,
    voiceChannelId: string,
    textChannelId: string,
    tracks: Track[],
  ): Promise<{ position: number; track: Track; started: boolean }> {
    this.init();
    this.pruneStaleState();
    this.state.voiceChannelId = voiceChannelId;
    this.state.textChannelId = textChannelId;

    const shouldStart = !this.inPlaybackSession();
    this.state.queue.push(...tracks);
    const track = tracks[tracks.length - 1];

    if (shouldStart) {
      console.log(`[music:${this.guildId}] starting playback (${tracks.length} track(s))`);
      await this.connect(guild, voiceChannelId);
      await this.playNext();

      if (!this.inPlaybackSession() && !this.state.current) {
        throw new Error(
          'Could not start audio stream. Try another song, a YouTube URL, or check bot logs.',
        );
      }

      return { position: 1, track, started: true };
    }

    const position = this.state.queue.length;
    console.log(
      `[music:${this.guildId}] queued ${tracks.length} track(s) at position ${position} (session active, current=${this.state.current?.title ?? 'none'})`,
    );
    this.ensureVoiceSubscription();
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
      this.ensureVoiceSubscription();
      this.livePlayStartedAt = Date.now();
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
        throw err instanceof Error ? err : new Error(msg);
      }
    } finally {
      this.finishBusy();
    }
  }

  async skip(): Promise<Track | null> {
    this.init();
    this.ensureVoiceSubscription();

    const skipped = this.state.current ?? this.state.lastPlayed;
    this.playGeneration++;

    const status = this.player.state.status;
    console.log(
      `[music:${this.guildId}] skip (status=${status}, current=${this.state.current?.title ?? 'none'}, queued=${this.state.queue.length}, busy=${this.busy})`,
    );

    // Actively playing — stop triggers idle handler which calls playNext()
    if (
      status === AudioPlayerStatus.Playing ||
      status === AudioPlayerStatus.Paused ||
      status === AudioPlayerStatus.Buffering
    ) {
      this.player.stop(true);
      return skipped;
    }

    // Player idle but playNext may still be fetching a stream — cancel and advance
    await this.waitUntilNotBusy();
    this.pendingIdle = false;
    this.state.current = null;

    if (this.state.queue.length) {
      await this.playNext();
    } else {
      this.scheduleLeave();
    }

    return skipped;
  }

  pause(): boolean {
    this.init();
    this.ensureVoiceSubscription();
    if (this.player.state.status !== AudioPlayerStatus.Playing) return false;
    this.player.pause();
    return true;
  }

  resume(): boolean {
    this.init();
    this.ensureVoiceSubscription();
    if (this.player.state.status !== AudioPlayerStatus.Paused) return false;
    this.player.unpause();
    return true;
  }

  stop(): void {
    this.playGeneration++;
    this.clearLiveReconnectTimer();
    this.liveRetries = 0;
    this.livePlayStartedAt = 0;
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

  /** Re-link voice after bot restart — only if a healthy connection exists. */
  async recover(guild: Guild, voiceChannelId: string): Promise<void> {
    this.init();
    this.pruneStaleState();
    this.state.voiceChannelId = voiceChannelId;

    const conn = getVoiceConnection(guild.id);
    if (conn?.state.status === VoiceConnectionStatus.Ready) {
      this.connection = conn;
      this.bindConnectionEvents(conn);
      conn.subscribe(this.player);
      console.log(`[music:${this.guildId}] recovered ready voice connection`);
      return;
    }

    const me = guild.members.me;
    if (me?.voice.channelId) {
      try {
        await this.connect(guild, me.voice.channelId);
        console.log(`[music:${this.guildId}] rejoined voice after restart`);
        return;
      } catch (err) {
        console.warn(`[music:${this.guildId}] voice rejoin failed, disconnecting:`, err);
        await me.voice.disconnect().catch(() => {});
      }
    }
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
