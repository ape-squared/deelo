import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import type { Guild, VoiceBasedChannel } from 'discord.js';
import { isMusicActive } from '../music/manager';
import { bufferToReadable } from './openai';

const IDLE_LEAVE_MS = 2_500;

/**
 * Play a one-shot MP3 in a voice channel without touching the music queue.
 * Returns false if music is already playing (caller should attach the file instead).
 */
export async function playTtsClip(
  guild: Guild,
  channel: VoiceBasedChannel,
  buffer: Buffer,
): Promise<'played' | 'music_busy'> {
  if (isMusicActive(guild.id)) return 'music_busy';

  const existing = getVoiceConnection(guild.id);
  if (existing) {
    // Another non-music connection may exist; prefer not to fight it.
    if (existing.state.status === VoiceConnectionStatus.Ready && existing.joinConfig.channelId !== channel.id) {
      return 'music_busy';
    }
  }

  const connection =
    existing?.state.status === VoiceConnectionStatus.Ready && existing.joinConfig.channelId === channel.id
      ? existing
      : joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: false,
        });

  try {
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    }

    const player = createAudioPlayer();
    const resource = createAudioResource(bufferToReadable(buffer), {
      inputType: StreamType.Arbitrary,
    });

    connection.subscribe(player);
    player.play(resource);

    await new Promise<void>((resolve, reject) => {
      const onIdle = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        player.off(AudioPlayerStatus.Idle, onIdle);
        player.off('error', onError);
      };
      player.once(AudioPlayerStatus.Idle, onIdle);
      player.once('error', onError);
    });

    await new Promise((r) => setTimeout(r, IDLE_LEAVE_MS));
  } finally {
    // Only destroy if we own a dedicated TTS join and music did not start mid-play
    if (!isMusicActive(guild.id)) {
      const conn = getVoiceConnection(guild.id);
      if (conn && conn.joinConfig.channelId === channel.id) {
        conn.destroy();
      }
    }
  }

  return 'played';
}
