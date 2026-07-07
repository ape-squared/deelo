import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed } from '../../utils/embeds';
import {
  resolveQuery,
  enqueueTracks,
  skipTrack,
  pausePlayback,
  resumePlayback,
  setVolume,
  shuffleQueue,
  deleteQueue,
  isMusicActive,
  applyPreset,
  getActivePreset,
  buildPresetListEmbed,
  buildAddedEmbed,
  buildNowPlayingEmbed,
  formatDuration,
  sourceLabel,
  recallTrack,
} from '../../services/music';
import { getGuildState } from '../../services/music/store';

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
      const state = getGuildState(message.guild!.id);
      const currentSize = state.queue.length + (state.current ? 1 : 0);

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
    run: async ({ message, args }) => {
      const guildId = message.guild!.id;
      const sub = args[0]?.toLowerCase();
      const state = getGuildState(guildId);

      if (sub === 'remove' || sub === 'del') {
        const idx = parseInt(args[1], 10) - 1;
        if (!state.queue.length) return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
        if (idx < 0 || idx >= state.queue.length) {
          return void message.reply({ embeds: [errorEmbed('Invalid queue position.')] });
        }
        state.queue.splice(idx, 1);
        return void message.reply({ embeds: [deeloEmbed('🎵 Queue', 'Track removed.')] });
      }

      if (sub === 'shuffle') {
        if (!state.queue.length) return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
        shuffleQueue(guildId);
        return void message.reply({ embeds: [deeloEmbed('🎵 Queue', 'Queue shuffled.')] });
      }

      if (sub === 'empty' || sub === 'clear') {
        state.queue = [];
        return void message.reply({ embeds: [deeloEmbed('🎵 Queue', 'Queue cleared.')] });
      }

      if (sub === 'move') {
        const from = parseInt(args[1], 10) - 1;
        const to = parseInt(args[2], 10) - 1;
        if (!state.queue.length) return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
        if (from < 0 || to < 0 || from >= state.queue.length) {
          return void message.reply({ embeds: [errorEmbed('Invalid queue positions.')] });
        }
        const [track] = state.queue.splice(from, 1);
        state.queue.splice(to, 0, track);
        return void message.reply({ embeds: [deeloEmbed('🎵 Queue', 'Track moved.')] });
      }

      if (!isMusicActive(guildId)) {
        return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
      }

      const lines: string[] = [];
      if (state.current) {
        lines.push(`**Now playing:** [${state.current.title}](${state.current.url}) \`${formatDuration(state.current.duration)}\``);
      }
      if (state.queue.length) {
        lines.push('', '**Up next:**');
        state.queue.slice(0, 15).forEach((t, i) => {
          lines.push(`**${i + 1}.** [${t.title}](${t.url}) · ${sourceLabel(t.source)}`);
        });
        if (state.queue.length > 15) lines.push(`*+ ${state.queue.length - 15} more*`);
      }

      await message.reply({ embeds: [deeloEmbed('🎵 Queue', lines.join('\n'))] });
    },
  },
  {
    name: 'skip',
    aliases: ['s', 'next', 'sk'],
    description: 'Skip the current song',
    category: 'music',
    run: async ({ message }) => {
      const guildId = message.guild!.id;

      if (!isMusicActive(guildId)) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }

      const skipped = await skipTrack(guildId);
      const state = getGuildState(guildId);
      const desc = state.current
        ? `Skipped **${skipped?.title ?? 'track'}**\n\nUp next: **${state.current.title}**`
        : `Skipped **${skipped?.title ?? 'track'}**`;

      await message.reply({ embeds: [deeloEmbed('🎵 Skipped', desc)] });
    },
  },
  {
    name: 'stop',
    aliases: ['dc', 'disconnect'],
    description: 'Stop music and clear the queue',
    category: 'music',
    run: async ({ message }) => {
      const guildId = message.guild!.id;
      if (!isMusicActive(guildId)) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }
      deleteQueue(guildId);
      await message.reply({ embeds: [deeloEmbed('🎵 Stopped', 'Playback stopped and queue cleared.')] });
    },
  },
  {
    name: 'pause',
    description: 'Pause playback',
    category: 'music',
    run: async ({ message }) => {
      const guildId = message.guild!.id;
      if (!isMusicActive(guildId)) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }
      if (!pausePlayback(guildId)) {
        return void message.reply({ embeds: [errorEmbed('Playback is not active or already paused.')] });
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
      const state = getGuildState(message.guild!.id);
      if (!state.queue.length) return void message.reply({ embeds: [errorEmbed('Queue is empty.')] });
      shuffleQueue(message.guild!.id);
      await message.reply({ embeds: [deeloEmbed('🎵 Shuffled', 'Queue shuffled.')] });
    },
  },
  {
    name: 'repeat',
    aliases: ['loop'],
    description: 'Toggle looping the current track',
    category: 'music',
    run: async ({ message }) => {
      const state = getGuildState(message.guild!.id);
      if (!isMusicActive(message.guild!.id)) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }
      state.repeat = !state.repeat;
      await message.reply({
        embeds: [deeloEmbed('🎵 Repeat', `Repeat is now **${state.repeat ? 'on' : 'off'}**.`)],
      });
    },
  },
  {
    name: 'preset',
    aliases: ['presets'],
    description: 'Apply audio filters (bass boost, nightcore, 8D, etc.)',
    category: 'music',
    usage: 'preset <name|list|off>',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      const isList = !sub || sub === 'list' || sub === 'active';

      if (!isList) {
        const { checkPremium } = await import('../../premium/check');
        const allowed = await checkPremium(message.guild!.id, 'musicFilters', (opts) => message.reply(opts));
        if (!allowed) return;
      }
      if (isList) {
        const active = getActivePreset(message.guild!.id);
        await message.reply({ embeds: [buildPresetListEmbed(active)] });
        return;
      }

      try {
        const { label, restarted } = await applyPreset(message.guild!.id, sub);
        const note = restarted
          ? 'Restarted the current track with the new filter.'
          : 'Preset saved — applies to the next track you play.';
        await message.reply({
          embeds: [deeloEmbed('🎛️ Preset Applied', `**${label}** is now active.\n${note}`)],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not apply that preset.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
  },
  {
    name: 'nowplaying',
    aliases: ['np'],
    description: 'Show currently playing track',
    category: 'music',
    run: async ({ message }) => {
      const track = getGuildState(message.guild!.id).current ?? recallTrack(message.guild!.id);
      if (!track) {
        return void message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      }
      await message.reply({ embeds: [buildNowPlayingEmbed(track)] });
    },
  },
];

export default music;
