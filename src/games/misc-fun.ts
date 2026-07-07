import type { Message } from 'discord.js';
import { deeloEmbed, errorEmbed, successEmbed } from '../utils/embeds';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';

interface JuulState {
  enabled: boolean;
  holderId: string | null;
  flavor: string;
  hits: number;
  passes: number;
  steals: number;
}

const DEFAULT: JuulState = {
  enabled: true,
  holderId: null,
  flavor: 'Mint',
  hits: 0,
  passes: 0,
  steals: 0,
};

async function load(guildId: string): Promise<JuulState> {
  const saved = await getConfigValue<Partial<JuulState>>(guildId, 'games.juul');
  return { ...DEFAULT, ...saved };
}

async function save(guildId: string, state: JuulState): Promise<void> {
  await setExtraConfig(guildId, 'games.juul', state);
}

export async function handleJuulCommand(message: Message, subcommand: string, args: string[]): Promise<void> {
  if (!message.guild) return;
  const guildId = message.guild.id;
  const state = await load(guildId);

  switch (subcommand) {
    case '':
    case 'juul': {
      if (!state.enabled) {
        await message.reply({ embeds: [errorEmbed('The server juul is disabled. Use `,juul toggle` to enable it.')] });
        return;
      }
      state.holderId = message.author.id;
      await save(guildId, state);
      await message.reply({
        embeds: [deeloEmbed('💨 Juul', `${message.author} is holding the server juul (**${state.flavor}** flavor).\nUse \`,juul hit\` to take a puff or \`,juul pass @user\` to share.`)],
      });
      return;
    }
    case 'hit': {
      if (!state.enabled) {
        await message.reply({ embeds: [errorEmbed('The server juul is off.')] });
        return;
      }
      if (state.holderId && state.holderId !== message.author.id) {
        await message.reply({ embeds: [errorEmbed(`<@${state.holderId}> is holding the juul. Ask them to pass it!`)] });
        return;
      }
      state.holderId = message.author.id;
      state.hits += 1;
      await save(guildId, state);
      const phrases = ['*vape noises*', '💨 Nice hit!', '🔥 That was a fat rip.', '☁️ Clouds everywhere.'];
      await message.reply({
        embeds: [deeloEmbed('💨 Juul Hit', `${message.author} hits the **${state.flavor}** juul. ${phrases[Math.floor(Math.random() * phrases.length)]}`)],
      });
      return;
    }
    case 'pass': {
      const target = message.mentions.users.first();
      if (!target || target.bot) {
        await message.reply({ embeds: [errorEmbed('Mention someone to pass the juul to.')] });
        return;
      }
      if (state.holderId && state.holderId !== message.author.id) {
        await message.reply({ embeds: [errorEmbed('You are not holding the juul.')] });
        return;
      }
      state.holderId = target.id;
      state.passes += 1;
      await save(guildId, state);
      await message.reply({
        embeds: [successEmbed(`${message.author} passed the juul to ${target} (**${state.flavor}**).`)],
      });
      return;
    }
    case 'steal': {
      if (!state.holderId) {
        state.holderId = message.author.id;
        await save(guildId, state);
        await message.reply({ embeds: [deeloEmbed('💨 Juul', `${message.author} grabbed the juul!`)] });
        return;
      }
      if (state.holderId === message.author.id) {
        await message.reply({ embeds: [errorEmbed('You already have the juul.')] });
        return;
      }
      const prev = state.holderId;
      state.holderId = message.author.id;
      state.steals += 1;
      await save(guildId, state);
      await message.reply({
        embeds: [deeloEmbed('💨 Juul Stolen!', `${message.author} yoinked the juul from <@${prev}>!`)],
      });
      return;
    }
    case 'toggle': {
      state.enabled = !state.enabled;
      await save(guildId, state);
      await message.reply({
        embeds: [successEmbed(`Server juul is now **${state.enabled ? 'enabled' : 'disabled'}**.`)],
      });
      return;
    }
    case 'flavor': {
      const flavor = args.join(' ') || 'Mint';
      state.flavor = flavor.slice(0, 32);
      await save(guildId, state);
      await message.reply({ embeds: [successEmbed(`Juul flavor set to **${state.flavor}**.`)] });
      return;
    }
    case 'stats': {
      const holder = state.holderId ? `<@${state.holderId}>` : 'Nobody';
      await message.reply({
        embeds: [
          deeloEmbed('💨 Juul Stats', [
            `**Status:** ${state.enabled ? 'On' : 'Off'}`,
            `**Holder:** ${holder}`,
            `**Flavor:** ${state.flavor}`,
            `**Hits:** ${state.hits}`,
            `**Passes:** ${state.passes}`,
            `**Steals:** ${state.steals}`,
          ].join('\n')),
        ],
      });
      return;
    }
    default:
      await message.reply({ embeds: [errorEmbed(`Unknown juul subcommand: \`${subcommand}\``)] });
  }
}

export async function handleGameLookup(message: Message, query: string): Promise<void> {
  if (!query.trim()) {
    await message.reply({ embeds: [errorEmbed('Usage: `,game <title>`')] });
    return;
  }
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = (await res.json()) as {
      results?: Array<{
        name: string;
        released?: string;
        rating?: number;
        metacritic?: number;
        genres?: Array<{ name: string }>;
        platforms?: Array<{ platform: { name: string } }>;
        background_image?: string;
        description_raw?: string;
      }>;
    };
    const game = data.results?.[0];
    if (!game) {
      await message.reply({ embeds: [errorEmbed(`No game found for **${query}**.`)] });
      return;
    }
    const embed = deeloEmbed(
      game.name,
      [
        game.released ? `**Released:** ${game.released}` : '',
        game.rating ? `**Rating:** ${game.rating.toFixed(1)}/5` : '',
        game.metacritic ? `**Metacritic:** ${game.metacritic}` : '',
        game.genres?.length ? `**Genres:** ${game.genres.map((g) => g.name).join(', ')}` : '',
        game.platforms?.length ? `**Platforms:** ${game.platforms.slice(0, 5).map((p) => p.platform.name).join(', ')}` : '',
        game.description_raw ? game.description_raw.slice(0, 400).replace(/<[^>]+>/g, '') + '…' : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
    if (game.background_image) embed.setImage(game.background_image);
    await message.reply({ embeds: [embed] });
  } catch {
    await message.reply({ embeds: [errorEmbed('Failed to look up game. Try again later.')] });
  }
}
