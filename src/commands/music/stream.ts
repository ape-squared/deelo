import type { Message } from 'discord.js';
import { deeloEmbed, errorEmbed } from '../../utils/embeds';
import {
  resolveRadioStream,
  isStreamableRadioUrl,
  enqueueTracks,
  playRadioNow,
  playRadioQueueIndex,
  skipTrack,
  pausePlayback,
  resumePlayback,
  setVolume,
  deleteQueue,
  isMusicActive,
  canControlPlayback,
  buildAddedEmbed,
  buildNowPlayingEmbed,
  buildRadioHelpEmbed,
  buildRadioQueueEmbed,
  buildRadioSwitchedEmbed,
  parseStreamUrlInput,
  clearLiveQueue,
  removeLiveQueueTrack,
  isRadioActive,
  getLiveQueueTracks,
  recallTrack,
} from '../../services/music';
import { getGuildState } from '../../services/music/store';

const STREAM_SUBS = new Set([
  'play', 'add', 'queue', 'list', 'q',
  'skip', 'next',
  'now', 'np',
  'remove', 'del', 'rm',
  'clear', 'empty',
  'stop',
  'pause', 'resume',
  'volume', 'vol',
  'help',
]);

function parseSubcommand(args: string[]): { sub: string; rest: string } {
  const raw = args.join(' ').trim();
  if (!raw) return { sub: 'help', rest: '' };

  const urlInRaw = raw.match(/https?:\/\/\S+/i);
  const first = args[0]?.toLowerCase() ?? '';

  if (urlInRaw && (!STREAM_SUBS.has(first) || first === 'play' || first === 'add')) {
    if (first === 'add') return { sub: 'add', rest: args.slice(1).join(' ') };
    if (first === 'play') return { sub: 'play', rest: args.slice(1).join(' ') };
    return { sub: 'play', rest: raw };
  }

  if (STREAM_SUBS.has(first)) {
    return { sub: first, rest: args.slice(1).join(' ') };
  }

  if (isStreamableRadioUrl(raw)) return { sub: 'play', rest: raw };
  return { sub: first || 'help', rest: args.slice(1).join(' ') };
}

async function resolveTrackFromRest(rest: string, requestedBy: string) {
  const parsed = parseStreamUrlInput(rest);
  if (!parsed) {
    throw new Error('Provide a valid `http://` or `https://` stream URL.');
  }
  if (!isStreamableRadioUrl(parsed.url)) {
    throw new Error('Invalid stream URL. Use `,play` for YouTube or Spotify.');
  }
  return resolveRadioStream(parsed.url, requestedBy, parsed.customTitle);
}

async function checkQueueLimit(guildId: string, add = 1): Promise<string | null> {
  const { getGuildPlan } = await import('../../database');
  const { getLimit } = await import('../../config/plans');
  const plan = await getGuildPlan(guildId);
  const state = getGuildState(guildId);
  const currentSize = state.queue.length + (state.current ? 1 : 0);
  if (currentSize + add > getLimit(plan, 'maxMusicQueue')) {
    return 'Queue limit reached for your plan.';
  }
  return null;
}

export async function handleStreamCommand(message: Message, args: string[]): Promise<void> {
  const guild = message.guild!;
  const guildId = guild.id;
  const { sub, rest } = parseSubcommand(args);

  if (sub === 'help' || sub === 'commands') {
    await message.reply({ embeds: [buildRadioHelpEmbed()] });
    return;
  }

  if (sub === 'queue' || sub === 'list' || sub === 'q') {
    await message.reply({ embeds: [buildRadioQueueEmbed(getGuildState(guildId))] });
    return;
  }

  if (sub === 'now' || sub === 'np') {
    const state = getGuildState(guildId);
    const track = state.current?.live ? state.current : recallTrack(guildId);
    if (!track?.live) {
      await message.reply({ embeds: [errorEmbed('No radio station is playing.')] });
      return;
    }
    await message.reply({ embeds: [buildNowPlayingEmbed(track)] });
    return;
  }

  if (sub === 'stop') {
    if (!isMusicActive(guildId)) {
      await message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      return;
    }
    deleteQueue(guildId);
    await message.reply({ embeds: [deeloEmbed('📻 Radio Stopped', 'Playback stopped and queue cleared.')] });
    return;
  }

  if (sub === 'pause') {
    if (!pausePlayback(guildId)) {
      await message.reply({ embeds: [errorEmbed('Nothing to pause.')] });
      return;
    }
    await message.reply({ embeds: [deeloEmbed('📻 Paused', 'Radio paused. Use `,stream resume` to continue.')] });
    return;
  }

  if (sub === 'resume') {
    if (!resumePlayback(guildId)) {
      await message.reply({ embeds: [errorEmbed('Radio is not paused.')] });
      return;
    }
    await message.reply({ embeds: [deeloEmbed('📻 Resumed', 'Radio resumed.')] });
    return;
  }

  if (sub === 'volume' || sub === 'vol') {
    const vol = parseInt(rest || args[1] || '', 10);
    if (isNaN(vol)) {
      await message.reply({ embeds: [errorEmbed('Usage: `,stream volume <0-200>`')] });
      return;
    }
    const level = setVolume(guildId, vol);
    await message.reply({ embeds: [deeloEmbed('📻 Volume', `Volume set to **${level}%**`)] });
    return;
  }

  if (sub === 'skip' || sub === 'next') {
    const botInVoice = Boolean(guild.members.me?.voice.channelId);
    if (!canControlPlayback(guildId, botInVoice)) {
      await message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
      return;
    }
    const skipped = await skipTrack(guildId);
    const state = getGuildState(guildId);
    const desc = state.current?.live
      ? `Skipped **${skipped?.title ?? 'station'}**\n\nNow streaming: **${state.current.title}**`
      : state.current
        ? `Skipped **${skipped?.title ?? 'station'}**`
        : `Stopped **${skipped?.title ?? 'station'}**`;
    await message.reply({ embeds: [deeloEmbed('📻 Skipped', desc)] });
    return;
  }

  if (sub === 'clear' || sub === 'empty') {
    const removed = clearLiveQueue(getGuildState(guildId));
    await message.reply({
      embeds: [deeloEmbed('📻 Queue Cleared', removed ? `Removed **${removed}** queued station(s).` : 'Queue was already empty.')],
    });
    return;
  }

  if (sub === 'remove' || sub === 'del' || sub === 'rm') {
    const idx = parseInt(rest || args[1] || '', 10);
    if (!idx) {
      await message.reply({ embeds: [errorEmbed('Usage: `,stream remove <#>`')] });
      return;
    }
    const removed = removeLiveQueueTrack(getGuildState(guildId), idx);
    if (!removed) {
      await message.reply({ embeds: [errorEmbed('Invalid queue position. Use `,stream queue`.')] });
      return;
    }
    await message.reply({ embeds: [deeloEmbed('📻 Removed', `Removed **${removed.title}** from the queue.`)] });
    return;
  }

  // play <#> — jump to queued station (numeric, no URL)
  if (sub === 'play' && rest && !rest.match(/https?:\/\//i)) {
    const idx = parseInt(rest, 10);
    if (idx > 0) {
      const voice = message.member?.voice.channel;
      if (!voice) {
        await message.reply({ embeds: [errorEmbed('Join a voice channel first.')] });
        return;
      }
      try {
        const track = await playRadioQueueIndex(guild, voice.id, message.channel.id, idx);
        await message.reply({ embeds: [buildRadioSwitchedEmbed(track, getLiveQueueTracks(getGuildState(guildId)).length)] });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not switch to that station.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
      return;
    }
  }

  const voice = message.member?.voice.channel;
  if (!voice) {
    await message.reply({ embeds: [errorEmbed('Join a voice channel first.')] });
    return;
  }

  if (sub === 'add') {
    if (!rest.match(/https?:\/\//i)) {
      await message.reply({ embeds: [errorEmbed('Usage: `,stream add [name] <url>`')] });
      return;
    }
    const limitErr = await checkQueueLimit(guildId);
    if (limitErr) {
      await message.reply({ embeds: [errorEmbed(limitErr)] });
      return;
    }
    if (message.channel.isSendable()) await message.channel.sendTyping().catch(() => {});
    try {
      const track = await resolveTrackFromRest(rest, message.author.id);
      const { position, track: t, started } = await enqueueTracks(guild, voice.id, message.channel.id, [track]);
      await message.reply({ embeds: [buildAddedEmbed(t, position, started)] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add that stream.';
      await message.reply({ embeds: [errorEmbed(msg)] });
    }
    return;
  }

  // play <url> or bare URL — switch now if already streaming, otherwise start
  if (sub === 'play' || isStreamableRadioUrl(rest)) {
    const input = sub === 'play' ? rest : rest || args.join(' ');
    if (!input.match(/https?:\/\//i)) {
      await message.reply({ embeds: [buildRadioHelpEmbed()] });
      return;
    }
    const limitErr = await checkQueueLimit(guildId, 0);
    if (limitErr && !isMusicActive(guildId)) {
      await message.reply({ embeds: [errorEmbed(limitErr)] });
      return;
    }
    if (message.channel.isSendable()) await message.channel.sendTyping().catch(() => {});
    try {
      const track = await resolveTrackFromRest(input, message.author.id);
      const state = getGuildState(guildId);
      const switching = isMusicActive(guildId) || isRadioActive(state);

      if (switching) {
        await playRadioNow(guild, voice.id, message.channel.id, track);
        await message.reply({
          embeds: [buildRadioSwitchedEmbed(track, getLiveQueueTracks(getGuildState(guildId)).length)],
        });
      } else {
        const { position, track: t, started } = await enqueueTracks(guild, voice.id, message.channel.id, [track]);
        await message.reply({ embeds: [buildAddedEmbed(t, position, started)] });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not connect to that stream.';
      await message.reply({ embeds: [errorEmbed(msg)] });
    }
    return;
  }

  await message.reply({ embeds: [buildRadioHelpEmbed()] });
}
