import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed, successEmbed } from '../../utils/embeds';
import { config } from '../../config';
import { getSupabase } from '../../database/supabase';

const integrations: Command[] = [
  {
    name: 'lastfm',
    aliases: ['lfm', 'np'],
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
      const platforms = ['instagram', 'twitter', 'tiktok', 'youtube', 'twitch', 'soundcloud'];

      if (sub === 'add') {
        const platform = args[1]?.toLowerCase();
        const channel = message.mentions.channels.first();
        const username = args[3];
        if (!platform || !platforms.includes(platform) || !channel || !username) {
          return void message.reply({ embeds: [errorEmbed(`Usage: ,social add <${platforms.join('|')}> #channel <username>`)] });
        }
        await getSupabase().from('social_feeds').insert({ guild_id: message.guild!.id, platform, channel_id: channel.id, username });
        return void message.reply({ embeds: [successEmbed(`Tracking **${platform}/@${username}** → ${channel}`)] });
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
    aliases: ['gpt', 'ai'],
    description: 'Ask ChatGPT a question',
    category: 'integrations',
    usage: 'chatgpt <question>',
    premiumFeature: 'chatgpt',
    run: async ({ message, args }) => {
      const question = args.join(' ');
      if (!question) return void message.reply({ embeds: [errorEmbed('Ask a question!')] });
      if (!config.openaiApiKey) {
        return void message.reply({ embeds: [deeloEmbed('ChatGPT', `**Q:** ${question}\n\n*Add OPENAI_API_KEY to .env for live responses.*`)] });
      }
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiApiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: question }], max_tokens: 500 }),
        });
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        const answer = data.choices?.[0]?.message?.content ?? 'No response.';
        await message.reply({ embeds: [deeloEmbed('ChatGPT', answer)] });
      } catch {
        await message.reply({ embeds: [errorEmbed('Failed to get ChatGPT response.')] });
      }
    },
  },
];

export default integrations;
