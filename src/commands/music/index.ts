import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed } from '../../utils/embeds';
import {
  getMusicQueue,
  deleteQueue,
  resolveQuery,
  enqueueTracks,
  skipTrack,
  pausePlayback,
  resumePlayback,
  setVolume,
  shuffleQueue,
  buildAddedEmbed,
  buildNowPlayingEmbed,
  formatDuration,
  sourceLabel,
} from '../../services/music';

const music: Command[] = [
  {
    name: 'play',
    aliases: ['p'],
    description: 'Play music — Spotify search, playlists & albums (YouTube, SoundCloud URLs also supported)',
    category: 'music',
    usage: 'play <query|url>',
    premiumFeature: 'music',
    run: async ({ message, args }) => {
      const query = args.join(' ');
      if (!query) return void message.reply({ embeds: [errorEmbed('Usage: `,play <song name or URL>`')] });

      const voice = message.member?.voice.channel;
      if (!voice) return void message.reply({ embeds: [errorEmbed('Join a voice channel first.')] });

      const { getGuildPlan } = await import('../../database');
      const { getLimit } = await import('../../config/plans');
      const plan = await getGuildPlan(message.guild!.id);
      const queue = getMusicQueue(message.guild!.id);
      const currentSize = (queue?.tracks.length ?? 0) + (queue?.current ? 1 : 0);

      if (message.channel.isSendable()) {
        await message.channel.sendTyping().catch(() => {});
      }

      try {
        const tracks = await resolveQuery(query, message.author.id);
        if (currentSize + tracks.length > getLimit(plan, 'maxMusicQueue')) {
          return void message.reply({ embeds: [errorEmbed('Queue limit reached for your plan.')] });
        }

        const { position, track, started } = await enqueueTracks(
          message.guild!,
          voice.id,
          message.channel.id,
          tracks,
        );

        if (tracks.length > 1) {
          await message.reply({
            embeds: [deeloEmbed('🎵 Playlist Added', `Added **${tracks.length}** tracks to the queue.\nFirst up: **${track.title}**`)],
          });
        } else {
          await message.reply({ embeds: [buildAddedEmbed(track, position, started)] });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not play that track.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
  },
  {
    name: 'queue',
    aliases: ['q'],
    description: 'View the music queue',
    category: 'music',
    run: async ({ message }) => {
      const queue = getMusicQueue(message.guild!.id);
      if (!queue?.current && !queue?.tracks.length) {
        return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
      }

      const lines: string[] = [];
      if (queue.current) {
        lines.push(`**Now playing:** [${queue.current.title}](${queue.current.url}) \`${formatDuration(queue.current.duration)}\``);
      }
      if (queue.tracks.length) {
        lines.push('', '**Up next:**');
        queue.tracks.slice(0, 15).forEach((t, i) => {
          lines.push(`**${i + 1}.** [${t.title}](${t.url}) · ${sourceLabel(t.source)}`);
        });
        if (queue.tracks.length > 15) lines.push(`*+ ${queue.tracks.length - 15} more*`);
      }

      await message.reply({ embeds: [deeloEmbed('🎵 Queue', lines.join('\n'))] });
    },
  },
  {
    name: 'skip',
    aliases: ['s'],
    description: 'Skip the current song',
    category: 'music',
    run: async ({ message }) => {
      const queue = getMusicQueue(message.guild!.id);
      if (!queue?.current && !queue?.tracks.length) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }

      const skipped = await skipTrack(message.guild!.id);
      if (!skipped) return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

      const next = getMusicQueue(message.guild!.id);
      const desc = next?.current
        ? `Skipped **${skipped.title}**\n\nUp next: **${next.current.title}**`
        : `Skipped **${skipped.title}**`;

      await message.reply({ embeds: [deeloEmbed('🎵 Skipped', desc)] });
    },
  },
  {
    name: 'stop',
    description: 'Stop music and clear the queue',
    category: 'music',
    run: async ({ message }) => {
      deleteQueue(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('🎵 Stopped', 'Playback stopped and queue cleared.')] });
    },
  },
  {
    name: 'pause',
    description: 'Pause playback',
    category: 'music',
    run: async ({ message }) => {
      if (!pausePlayback(message.guild!.id)) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }
      await message.reply({ embeds: [deeloEmbed('🎵 Paused', 'Playback paused. Use `,resume` to continue.')] });
    },
  },
  {
    name: 'resume',
    description: 'Resume playback',
    category: 'music',
    run: async ({ message }) => {
      if (!resumePlayback(message.guild!.id)) {
        return void message.reply({ embeds: [errorEmbed('Playback is not paused.')] });
      }
      await message.reply({ embeds: [deeloEmbed('🎵 Resumed', 'Playback resumed.')] });
    },
  },
  {
    name: 'volume',
    aliases: ['vol'],
    description: 'Set playback volume (0–200)',
    category: 'music',
    usage: 'volume <0-200>',
    run: async ({ message, args }) => {
      const vol = parseInt(args[0], 10);
      if (isNaN(vol)) return void message.reply({ embeds: [errorEmbed('Usage: `,volume <0-200>`')] });
      const level = setVolume(message.guild!.id, vol);
      await message.reply({ embeds: [deeloEmbed('🎵 Volume', `Volume set to **${level}%**`)] });
    },
  },
  {
    name: 'shuffle',
    description: 'Shuffle the queue',
    category: 'music',
    run: async ({ message }) => {
      const queue = getMusicQueue(message.guild!.id);
      if (!queue?.tracks.length) return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
      shuffleQueue(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('🎵 Shuffled', 'Queue shuffled.')] });
    },
  },
  {
    name: 'nowplaying',
    aliases: ['np'],
    description: 'Show currently playing track',
    category: 'music',
    run: async ({ message }) => {
      const queue = getMusicQueue(message.guild!.id);
      if (!queue?.current) return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      await message.reply({ embeds: [buildNowPlayingEmbed(queue.current)] });
    },
  },
];

export default music;
