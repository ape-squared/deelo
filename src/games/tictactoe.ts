import type { Message } from 'discord.js';
import { deeloEmbed, errorEmbed } from '../utils/embeds';
import { getConfigValue, setExtraConfig } from '../extended/lib/guild-config';

export interface TicTacToeGame {
  board: string[];
  turn: string;
  players: [string, string];
}

const activeGames = new Map<string, TicTacToeGame>();

export function getTicTacToeGame(channelId: string): TicTacToeGame | undefined {
  return activeGames.get(channelId);
}

export function setTicTacToeGame(channelId: string, game: TicTacToeGame): void {
  activeGames.set(channelId, game);
}

export function deleteTicTacToeGame(channelId: string): void {
  activeGames.delete(channelId);
}

export function formatBoard(board: string[]): string {
  return `${board[0]}${board[1]}${board[2]}\n${board[3]}${board[4]}${board[5]}\n${board[6]}${board[7]}${board[8]}`;
}

export function checkWinner(board: string[]): boolean {
  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  return wins.some(([a, b, c]) => board[a] !== '⬜' && board[a] === board[b] && board[b] === board[c]);
}

interface TttStats {
  wins: number;
  losses: number;
  ties: number;
}

async function getStats(guildId: string, userId: string): Promise<TttStats> {
  return (
    (await getConfigValue<TttStats>(guildId, `games.tictactoe.${userId}`)) ?? {
      wins: 0,
      losses: 0,
      ties: 0,
    }
  );
}

async function recordResult(guildId: string, winnerId: string | null, loserId: string | null, tie: boolean): Promise<void> {
  if (tie && winnerId && loserId) {
    const a = await getStats(guildId, winnerId);
    const b = await getStats(guildId, loserId);
    a.ties += 1;
    b.ties += 1;
    await setExtraConfig(guildId, `games.tictactoe.${winnerId}`, a);
    await setExtraConfig(guildId, `games.tictactoe.${loserId}`, b);
    return;
  }
  if (winnerId) {
    const w = await getStats(guildId, winnerId);
    w.wins += 1;
    await setExtraConfig(guildId, `games.tictactoe.${winnerId}`, w);
  }
  if (loserId) {
    const l = await getStats(guildId, loserId);
    l.losses += 1;
    await setExtraConfig(guildId, `games.tictactoe.${loserId}`, l);
  }
}

export async function recordTttWin(guildId: string, winnerId: string, loserId: string): Promise<void> {
  await recordResult(guildId, winnerId, loserId, false);
}

export async function recordTttTie(guildId: string, p1: string, p2: string): Promise<void> {
  await recordResult(guildId, p1, p2, true);
}

export async function showTttStats(message: Message, userId: string): Promise<void> {
  if (!message.guild) return;
  const stats = await getStats(message.guild.id, userId);
  const user = await message.client.users.fetch(userId).catch(() => null);
  const name = user?.username ?? userId;
  const total = stats.wins + stats.losses + stats.ties;
  const winRate = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : '0';
  await message.reply({
    embeds: [
      deeloEmbed(
        `⭕ Tic-Tac-Toe — ${name}`,
        `**Wins:** ${stats.wins}\n**Losses:** ${stats.losses}\n**Ties:** ${stats.ties}\n**Win rate:** ${winRate}%`
      ),
    ],
  });
}

export async function showTttLeaderboard(message: Message): Promise<void> {
  if (!message.guild) return;
  const { listConfigSection } = await import('../extended/lib/guild-config');
  const entries = await listConfigSection(message.guild.id, 'games.tictactoe');
  const ranked = entries
    .map(([userId, raw]) => {
      const s = raw as TttStats;
      return { userId, wins: s.wins ?? 0, losses: s.losses ?? 0, ties: s.ties ?? 0 };
    })
    .filter((e) => e.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  if (!ranked.length) {
    await message.reply({ embeds: [errorEmbed('No tic-tac-toe wins recorded yet. Play with `,tictactoe @user`!')] });
    return;
  }

  const lines = await Promise.all(
    ranked.map(async (e, i) => {
      const user = await message.client.users.fetch(e.userId).catch(() => null);
      return `**${i + 1}.** ${user?.username ?? e.userId} — **${e.wins}** wins (${e.losses}L ${e.ties}T)`;
    })
  );

  await message.reply({ embeds: [deeloEmbed('⭕ Tic-Tac-Toe Leaderboard', lines.join('\n'))] });
}
