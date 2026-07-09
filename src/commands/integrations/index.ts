import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { config } from '../../config';
import { getSupabase } from '../../database/supabase';

function sendTyping(message: { channel: { isTextBased?: () => boolean; sendTyping?: () => Promise<unknown> } }) {
  const ch = message.channel;
  if (ch && typeof ch.sendTyping === 'function') {
    void ch.sendTyping().catch(() => {});
  }
}

const integrations: Command[] = [
  {
    name: 'lastfm',
    aliases: ['lfm'],
    description: 'Last.fm integration',
    category: 'integrations',
    usage: 'lastfm <set|nowplaying|top> [username]',
    premiumFeature: 'lastfm',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();

      if (sub === 'set') {
        const username = args[1];
        if (!username) return void message.reply({ embeds: [errorEmbed('Usage: `,lastfm set <username>`')] });
        await getSupabase().from('users').upsert({ id: message.author.id, lastfm_username: username });
        return void message.reply({ embeds: [successEmbed(`Last.fm set to **${username}**.`)] });
      }

      if (sub === 'nowplaying' || sub === 'np') {
        const { data: user } = await getSupabase().from('users').select('lastfm_username').eq('id', message.author.id).maybeSingle();
        const username = args[1] ?? user?.lastfm_username;
        if (!username) return void message.reply({ embeds: [errorEmbed('Set your Last.fm with `,lastfm set <username>`')] });

        if (config.lastfmApiKey) {
          try {
            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${config.lastfmApiKey}&format=json&limit=1`);
            const data = await res.json() as { recenttracks?: { track?: Array<{ name: string; artist: { '#text': string }; album?: { '#text': string } }> } };
            const track = data.recenttracks?.track?.[0];
            if (track) {
              return void message.reply({ embeds: [deeloEmbed('🎵 Now Playing', `**${track.name}** by ${track.artist['#text']}\n[${username} on Last.fm](https://last.fm/user/${username})`)] });
            }
          } catch { /* fall through */ }
        }
        return void message.reply({ embeds: [deeloEmbed('🎵 Now Playing', `**${username}** on Last.fm\n*Add LASTFM_API_KEY to .env for live data.*`)] });
      }

      await message.reply({ embeds: [deeloEmbed('Last.fm', 'Commands: `set`, `nowplaying`\nTrack listening activity and leaderboards.')] });
    },
  },
  {
    name: 'social',
    aliases: ['feed', 'notify'],
    description: 'Social media notification feeds',
    category: 'integrations',
    usage: 'social <add|remove|list> <platform> <channel> <username>',
    premiumFeature: 'socialNotifications',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      const platforms = ['instagram', 'twitter', 'tiktok', 'youtube', 'twitch', 'soundcloud', 'reddit', 'kick', 'pinterest'];

      if (sub === 'add') {
        const platform = args[1]?.toLowerCase();
        const channel = message.mentions.channels.first();
        const username = args.slice(3).join(' ') || args[3];
        if (!platform || !platforms.includes(platform) || !channel || !username) {
          return void message.reply({ embeds: [errorEmbed(`Usage: ,social add <${platforms.join('|')}> #channel <username>`)] });
        }
        const clean = username.replace(/^@/, '').replace(/^r\//i, '');
        const { data, error } = await getSupabase()
          .from('social_feeds')
          .insert({ guild_id: message.guild!.id, platform, channel_id: channel.id, username: clean })
          .select()
          .single();
        if (error) {
          return void message.reply({ embeds: [errorEmbed('Failed to add feed. It may already exist.')] });
        }
        if (data) {
          const { seedSocialFeed } = await import('../../services/social-poll');
          await seedSocialFeed(data.id, platform, clean);
        }
        return void message.reply({ embeds: [successEmbed(`Tracking **${platform}/@${clean}** → ${channel}`)] });
      }

      if (sub === 'remove') {
        const platform = args[1]?.toLowerCase();
        const username = args[2]?.replace(/^@/, '').replace(/^r\//i, '');
        if (!platform || !username) {
          return void message.reply({ embeds: [errorEmbed('Usage: `,social remove <platform> <username>`')] });
        }
        await getSupabase().from('social_feeds').delete().eq('guild_id', message.guild!.id).eq('platform', platform).eq('username', username);
        return void message.reply({ embeds: [successEmbed('Feed removed.')] });
      }

      if (sub === 'list') {
        const { data } = await getSupabase().from('social_feeds').select('*').eq('guild_id', message.guild!.id);
        const list = data?.map((f) => `**${f.platform}** @${f.username} → <#${f.channel_id}>`).join('\n') || 'None.';
        return void message.reply({ embeds: [deeloEmbed('Social Feeds', list)] });
      }

      await message.reply({ embeds: [deeloEmbed('Social Notifications', `Platforms: ${platforms.join(', ')}\nUsage: \`,social add instagram #channel username\``)] });
    },
  },
  {
    name: 'chatgpt',
    aliases: ['gpt', 'ai', 'ask', 'askgpt'],
    description: 'Ask ChatGPT with per-channel conversation memory',
    category: 'integrations',
    usage: 'chatgpt <question|reset|help>',
    premiumFeature: 'chatgpt',
    cooldown: 4,
    ack: 'never',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      const {
        chatCompletion,
        clearChatHistory,
        hasAiConfigured,
        OpenAiError,
      } = await import('../../services/integrations/openai');

      if (!sub || sub === 'help') {
        return void message.reply({
          embeds: [
            deeloEmbed(
              'ChatGPT',
              [
                '**,chatgpt <question>** — ask with conversation memory (per channel)',
                '**,chatgpt reset** — clear your memory in this channel',
                '**,ask** / **,gpt** / **,ai** — aliases',
                '',
                'Premium feature. Powered by Puter (free OpenAI gateway) or `OPENAI_API_KEY`.',
              ].join('\n'),
            ),
          ],
        });
      }

      if (sub === 'reset' || sub === 'clear') {
        const cleared = clearChatHistory(message.guild!.id, message.channel.id, message.author.id);
        return void message.reply({
          embeds: [successEmbed(cleared ? 'Chat memory cleared for this channel.' : 'No chat memory to clear.')],
        });
      }

      const question = args.join(' ').trim();
      if (!question) return void message.reply({ embeds: [errorEmbed('Usage: `,chatgpt <question>`')] });
      if (!hasAiConfigured()) {
        return void message.reply({
          embeds: [
            errorEmbed(
              'AI is not configured. Set `PUTER_AUTH_TOKEN` (recommended — free via Puter) or `OPENAI_API_KEY`.\nhttps://developer.puter.com/tutorials/puter-auth-token/',
            ),
          ],
        });
      }

      sendTyping(message);
      try {
        const { answer, turns, provider } = await chatCompletion({
          guildId: message.guild!.id,
          channelId: message.channel.id,
          userId: message.author.id,
          prompt: question,
        });
        await message.reply({
          embeds: [
            deeloEmbed('ChatGPT', answer).setFooter({
              text: `Deelo · ${provider} · ${turns} turn${turns === 1 ? '' : 's'} · ,chatgpt reset`,
            }),
          ],
        });
      } catch (err) {
        const msg = err instanceof OpenAiError ? err.message : 'Failed to get ChatGPT response.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
    slash: {
      description: 'Ask ChatGPT a question',
      options: [
        { name: 'prompt', description: 'Your question', type: 3, required: true },
        {
          name: 'reset',
          description: 'Clear conversation memory before asking',
          type: 5,
          required: false,
        },
      ],
      run: async ({ interaction }) => {
        const prompt = interaction.options.getString('prompt', true);
        const reset = interaction.options.getBoolean('reset') ?? false;
        const { chatCompletion, hasAiConfigured, OpenAiError } = await import('../../services/integrations/openai');

        if (!hasAiConfigured()) {
          return void interaction.reply({
            embeds: [
              errorEmbed('AI is not configured. Set PUTER_AUTH_TOKEN or OPENAI_API_KEY on the bot host.'),
            ],
            ephemeral: true,
          });
        }

        await interaction.deferReply();
        try {
          const { answer, turns, provider } = await chatCompletion({
            guildId: interaction.guild!.id,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            prompt,
            reset,
          });
          await interaction.editReply({
            embeds: [
              deeloEmbed('ChatGPT', answer).setFooter({
                text: `Deelo · ${provider} · ${turns} turn${turns === 1 ? '' : 's'} remembered`,
              }),
            ],
          });
        } catch (err) {
          const msg = err instanceof OpenAiError ? err.message : 'Failed to get ChatGPT response.';
          await interaction.editReply({ embeds: [errorEmbed(msg)] });
        }
      },
    },
  },
  {
    name: 'tts',
    aliases: ['speak', 'say'],
    description: 'Convert text to speech (MP3 and optional voice channel)',
    category: 'integrations',
    usage: 'tts [voice] <text> | tts voices | tts channel <text>',
    premiumFeature: 'tts',
    cooldown: 6,
    ack: 'never',
    run: async ({ message, args }) => {
      const {
        hasAiConfigured,
        OpenAiError,
        MAX_TTS_CHARS,
        TTS_VOICES,
        parseTtsVoice,
        synthesizeSpeech,
      } = await import('../../services/integrations/openai');

      const sub = args[0]?.toLowerCase();
      if (!sub || sub === 'help') {
        return void message.reply({
          embeds: [
            deeloEmbed(
              'Text-to-Speech',
              [
                '**,tts <text>** — attach an MP3',
                '**,tts <voice> <text>** — pick a voice (e.g. `nova`, `onyx`)',
                '**,tts channel <text>** — speak in your voice channel',
                '**,tts voices** — list voices',
                '',
                `Max **${MAX_TTS_CHARS}** characters. Premium · Puter or OpenAI.`,
              ].join('\n'),
            ),
          ],
        });
      }

      if (sub === 'voices' || sub === 'voice') {
        return void message.reply({
          embeds: [deeloEmbed('TTS Voices', TTS_VOICES.map((v) => `\`${v}\``).join(' · '))],
        });
      }

      if (!hasAiConfigured()) {
        return void message.reply({
          embeds: [
            errorEmbed(
              'TTS is not configured. Set `PUTER_AUTH_TOKEN` (recommended) or `OPENAI_API_KEY`.',
            ),
          ],
        });
      }

      let speakInChannel = false;
      let rest = args;
      if (sub === 'channel' || sub === 'vc' || sub === 'voicechannel') {
        speakInChannel = true;
        rest = args.slice(1);
      }

      let voice = parseTtsVoice(rest[0]);
      if (voice) rest = rest.slice(1);
      const text = rest.join(' ').trim();
      if (!text) {
        return void message.reply({
          embeds: [errorEmbed(speakInChannel ? 'Usage: `,tts channel [voice] <text>`' : 'Usage: `,tts [voice] <text>`')],
        });
      }

      const memberChannel = message.member?.voice.channel;
      if (speakInChannel && !memberChannel) {
        return void message.reply({ embeds: [errorEmbed('Join a voice channel first, then use `,tts channel <text>`.')] });
      }

      sendTyping(message);
      try {
        const { buffer, voice: usedVoice, filename, provider } = await synthesizeSpeech({ text, voice: voice ?? undefined });
        const { AttachmentBuilder } = await import('discord.js');
        const file = new AttachmentBuilder(buffer, { name: filename });

        if (speakInChannel && memberChannel) {
          const { playTtsClip } = await import('../../services/integrations/tts-voice');
          const result = await playTtsClip(message.guild!, memberChannel, buffer);
          if (result === 'played') {
            return void message.reply({
              embeds: [
                successEmbed(
                  `Speaking in ${memberChannel} with **${usedVoice}** (${provider}).\n> ${text.length > 120 ? `${text.slice(0, 117)}…` : text}`,
                ),
              ],
              files: [file],
            });
          }
          return void message.reply({
            embeds: [
              deeloEmbed(
                'TTS',
                `Music is playing, so I attached the MP3 instead of joining voice.\n**Voice:** ${usedVoice} · **Provider:** ${provider}`,
              ),
            ],
            files: [file],
          });
        }

        await message.reply({
          embeds: [
            deeloEmbed(
              'TTS',
              `**Voice:** \`${usedVoice}\` · **Provider:** \`${provider}\`\n> ${text.length > 180 ? `${text.slice(0, 177)}…` : text}`,
            ),
          ],
          files: [file],
        });
      } catch (err) {
        const msg = err instanceof OpenAiError ? err.message : 'Failed to generate speech.';
        await message.reply({ embeds: [errorEmbed(msg)] });
      }
    },
    slash: {
      description: 'Convert text to speech',
      options: [
        { name: 'text', description: 'Text to speak', type: 3, required: true },
        {
          name: 'voice',
          description: 'Voice name (nova, onyx, alloy, …)',
          type: 3,
          required: false,
        },
        {
          name: 'channel',
          description: 'Speak in your current voice channel',
          type: 5,
          required: false,
        },
      ],
      run: async ({ interaction }) => {
        const text = interaction.options.getString('text', true);
        const voiceRaw = interaction.options.getString('voice') ?? undefined;
        const speakInChannel = interaction.options.getBoolean('channel') ?? false;
        const {
          hasAiConfigured,
          OpenAiError,
          parseTtsVoice,
          synthesizeSpeech,
        } = await import('../../services/integrations/openai');

        if (!hasAiConfigured()) {
          return void interaction.reply({
            embeds: [errorEmbed('TTS is not configured. Set PUTER_AUTH_TOKEN or OPENAI_API_KEY.')],
            ephemeral: true,
          });
        }

        const voice = parseTtsVoice(voiceRaw);
        if (voiceRaw && !voice) {
          return void interaction.reply({
            embeds: [errorEmbed(`Unknown voice \`${voiceRaw}\`. Use \`/tts\` with voices like nova, onyx, alloy.`)],
            ephemeral: true,
          });
        }

        const member = interaction.guild?.members.cache.get(interaction.user.id)
          ?? (await interaction.guild?.members.fetch(interaction.user.id).catch(() => null));
        const memberChannel = member?.voice.channel;
        if (speakInChannel && !memberChannel) {
          return void interaction.reply({
            embeds: [errorEmbed('Join a voice channel first.')],
            ephemeral: true,
          });
        }

        await interaction.deferReply();
        try {
          const { buffer, voice: usedVoice, filename, provider } = await synthesizeSpeech({ text, voice: voice ?? undefined });
          const { AttachmentBuilder } = await import('discord.js');
          const file = new AttachmentBuilder(buffer, { name: filename });

          if (speakInChannel && memberChannel) {
            const { playTtsClip } = await import('../../services/integrations/tts-voice');
            const result = await playTtsClip(interaction.guild!, memberChannel, buffer);
            if (result === 'played') {
              return void interaction.editReply({
                embeds: [successEmbed(`Speaking in ${memberChannel} with **${usedVoice}** (${provider}).`)],
                files: [file],
              });
            }
            return void interaction.editReply({
              embeds: [deeloEmbed('TTS', `Music is playing — attached MP3 instead.\n**Voice:** ${usedVoice} · **Provider:** ${provider}`)],
              files: [file],
            });
          }

          await interaction.editReply({
            embeds: [deeloEmbed('TTS', `**Voice:** \`${usedVoice}\` · **Provider:** \`${provider}\``)],
            files: [file],
          });
        } catch (err) {
          const msg = err instanceof OpenAiError ? err.message : 'Failed to generate speech.';
          await interaction.editReply({ embeds: [errorEmbed(msg)] });
        }
      },
    },
  },
];

export default integrations;
