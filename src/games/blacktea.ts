import {
  type Message,
  type TextChannel,
  type User,
  ComponentType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { deeloEmbed, errorEmbed, successEmbed } from '../utils/embeds';
import { containsSubstring, randomCombo, validateDictionaryWord } from './wordlist';

const JOIN_EMOJI = '☕';
const DEFAULT_HP = 2;
const DEFAULT_ROUND_SEC = 10;
const LOBBY_SEC = 20;

interface Player {
  user: User;
  hp: number;
  eliminated: boolean;
}

interface BlackteaGame {
  channelId: string;
  guildId: string;
  hostId: string;
  players: Map<string, Player>;
  usedWords: Set<string>;
  roundSec: number;
  maxHp: number;
  active: boolean;
  lobbyMessageId?: string;
  currentTurnId?: string;
  currentCombo?: string;
  roundDeadline?: number;
  abortController?: AbortController;
}

const games = new Map<string, BlackteaGame>();

export function hasActiveBlacktea(channelId: string): boolean {
  return games.has(channelId);
}

export function endBlacktea(channelId: string): boolean {
  const game = games.get(channelId);
  if (!game) return false;
  game.abortController?.abort();
  games.delete(channelId);
  return true;
}

export async function handleBlackteaCommand(message: Message, args: string[]): Promise<void> {
  const channel = message.channel;
  if (!channel.isTextBased() || channel.isDMBased()) {
    await message.reply({ embeds: [errorEmbed('Blacktea can only be played in server text channels.')] });
    return;
  }

  const sub = args[0]?.toLowerCase();
  if (sub === 'end') {
    const game = games.get(channel.id);
    if (!game) {
      await message.reply({ embeds: [errorEmbed('No active Blacktea game in this channel.')] });
      return;
    }
    if (game.hostId !== message.author.id && !message.member?.permissions.has('ManageMessages')) {
      await message.reply({ embeds: [errorEmbed('Only the host or moderators can end the game.')] });
      return;
    }
    endBlacktea(channel.id);
    await message.reply({ embeds: [successEmbed('Blacktea game ended.')] });
    return;
  }

  if (games.has(channel.id)) {
    await message.reply({ embeds: [errorEmbed('A Blacktea game is already running here. Use `,blacktea end` to stop it.')] });
    return;
  }

  const game: BlackteaGame = {
    channelId: channel.id,
    guildId: message.guild!.id,
    hostId: message.author.id,
    players: new Map(),
    usedWords: new Set(),
    roundSec: DEFAULT_ROUND_SEC,
    maxHp: DEFAULT_HP,
    active: false,
  };
  games.set(channel.id, game);

  const joinRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('blacktea_join').setLabel('Join Game').setEmoji(JOIN_EMOJI).setStyle(ButtonStyle.Primary)
  );

  const lobby = await message.reply({
    embeds: [
      deeloEmbed(
        '☕ Blacktea',
        `${message.author} is hosting a game!\n\n` +
          `React with ${JOIN_EMOJI} or click **Join Game** to play.\n` +
          `**Rules:** Each round you get 3 letters — type a word containing them before time runs out.\n` +
          `Lose **1 HP** if you fail. Last player standing wins!\n\n` +
          `Lobby closes in **${LOBBY_SEC}s** · HP: **${game.maxHp}** · Round time: **${game.roundSec}s**`
      ),
    ],
    components: [joinRow],
  });

  game.lobbyMessageId = lobby.id;
  await lobby.react(JOIN_EMOJI).catch(() => {});

  const joinPlayer = (user: User) => {
    if (user.bot || game.active) return;
    if (!game.players.has(user.id)) {
      game.players.set(user.id, { user, hp: game.maxHp, eliminated: false });
    }
  };

  joinPlayer(message.author);

  const collector = lobby.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: LOBBY_SEC * 1000,
  });

  collector.on('collect', async (i) => {
    if (i.customId !== 'blacktea_join') return;
    joinPlayer(i.user);
    await i.reply({ content: `You're in! (${game.players.size} player${game.players.size === 1 ? '' : 's'})`, ephemeral: true });
  });

  const reactionCollector = lobby.createReactionCollector({ time: LOBBY_SEC * 1000 });
  reactionCollector.on('collect', (reaction, user) => {
    if (user.bot) return;
    if (reaction.emoji.name === JOIN_EMOJI) joinPlayer(user);
  });

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    collector.on('end', done);
    reactionCollector.on('end', done);
    setTimeout(done, LOBBY_SEC * 1000 + 200);
  });

  collector.stop();
  reactionCollector.stop();

  if (!games.has(channel.id) || game !== games.get(channel.id)) return;

  if (game.players.size === 0) {
    games.delete(channel.id);
    await channel.send({ embeds: [deeloEmbed('☕ Blacktea', 'No participants... I would have had time to prepare a good tea.')] });
    return;
  }

  game.active = true;
  await lobby.edit({ components: [] }).catch(() => {});

  const playerList = [...game.players.values()].map((p) => `<@${p.user.id}> (${p.hp} HP)`).join('\n');
  await channel.send({
    embeds: [deeloEmbed('☕ Blacktea — Game Start!', `${game.players.size} player(s) joined:\n${playerList}\n\nGood luck!`)],
  });

  await runGameLoop(channel as TextChannel, game);
}

async function runGameLoop(channel: TextChannel, game: BlackteaGame): Promise<void> {
  game.abortController = new AbortController();
  const signal = game.abortController.signal;

  while (!signal.aborted) {
    const alive = getAlivePlayers(game);
    if (alive.length === 0) {
      await channel.send({ embeds: [deeloEmbed('☕ Blacktea', 'Everyone was eliminated. Game over!')] });
      break;
    }
    if (alive.length === 1) {
      const winner = alive[0];
      await channel.send({
        embeds: [successEmbed(`☕ **${winner.user.username}** wins Blacktea! 🎉`)],
      });
      break;
    }

    const player = alive[Math.floor(Math.random() * alive.length)];
    const combo = randomCombo(3);
    game.currentTurnId = player.user.id;
    game.currentCombo = combo;
    game.roundDeadline = Date.now() + game.roundSec * 1000;

    const roundMsg = await channel.send({
      embeds: [
        deeloEmbed(
          '☕ Round',
          `${player.user}, type a word containing **${combo.toUpperCase()}**!\n` +
            `You have **${game.roundSec}** seconds.\n` +
            `HP: ${formatHp(game, alive)}`
        ),
      ],
    });

    const result = await waitForWord(channel, game, player.user.id, combo, game.roundSec * 1000, signal);

    if (signal.aborted) break;

    if (result === 'valid') {
      await roundMsg.edit({
        embeds: [deeloEmbed('☕ Round', `✅ **${player.user.username}** got it in time!`)],
      }).catch(() => {});
    } else if (result === 'timeout') {
      const p = game.players.get(player.user.id)!;
      p.hp -= 1;
      if (p.hp <= 0) {
        p.eliminated = true;
        await channel.send({
          embeds: [deeloEmbed('☕ Eliminated', `⏰ Time's up! **${player.user.username}** is out of lives.`)],
        });
      } else {
        await channel.send({
          embeds: [deeloEmbed('☕ Round', `⏰ Time's up! **${player.user.username}** loses 1 HP (**${p.hp}** left).`)],
        });
      }
    } else if (result === 'invalid') {
      const p = game.players.get(player.user.id)!;
      p.hp -= 1;
      if (p.hp <= 0) {
        p.eliminated = true;
        await channel.send({
          embeds: [deeloEmbed('☕ Eliminated', `❌ Invalid word! **${player.user.username}** is out.`)],
        });
      } else {
        await channel.send({
          embeds: [deeloEmbed('☕ Round', `❌ Invalid or duplicate word! **${player.user.username}** loses 1 HP (**${p.hp}** left).`)],
        });
      }
    }

    await sleep(1500);
  }

  games.delete(channel.id);
}

async function waitForWord(
  channel: TextChannel,
  game: BlackteaGame,
  userId: string,
  combo: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<'valid' | 'invalid' | 'timeout' | 'abort'> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve('abort');

    const collector = channel.createMessageCollector({
      filter: (m) => m.author.id === userId && !m.author.bot,
      time: timeoutMs,
      max: 1,
    });

    const onAbort = () => {
      collector.stop('abort');
      resolve('abort');
    };
    signal.addEventListener('abort', onAbort, { once: true });

    collector.on('collect', async (m) => {
      signal.removeEventListener('abort', onAbort);
      const word = m.content.trim().split(/\s+/)[0];
      if (!containsSubstring(word, combo)) {
        resolve('invalid');
        return;
      }
      if (game.usedWords.has(word.toLowerCase())) {
        resolve('invalid');
        return;
      }
      const valid = await validateDictionaryWord(word);
      if (!valid) {
        resolve('invalid');
        return;
      }
      game.usedWords.add(word.toLowerCase());
      await m.react('✅').catch(() => {});
      resolve('valid');
    });

    collector.on('end', (_collected, reason) => {
      signal.removeEventListener('abort', onAbort);
      if (reason === 'abort') resolve('abort');
      else if (reason === 'time') resolve('timeout');
    });
  });
}

function getAlivePlayers(game: BlackteaGame): Player[] {
  return [...game.players.values()].filter((p) => !p.eliminated && p.hp > 0);
}

function formatHp(game: BlackteaGame, players: Player[]): string {
  return players.map((p) => `**${p.user.username}**: ${'❤️'.repeat(p.hp)}${'🖤'.repeat(Math.max(0, game.maxHp - p.hp))}`).join(' · ');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
