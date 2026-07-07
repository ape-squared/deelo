import type { Command } from '../../types/command';
import { deeloEmbed, errorEmbed } from '../../utils/embeds';
import { handleBlackteaCommand } from '../../games/blacktea';
import {
  checkWinner,
  deleteTicTacToeGame,
  formatBoard,
  getTicTacToeGame,
  recordTttTie,
  recordTttWin,
  setTicTacToeGame,
  showTttLeaderboard,
  showTttStats,
} from '../../games/tictactoe';

const fun: Command[] = [
  {
    name: 'tictactoe',
    aliases: ['ttt'],
    description: 'Play tic-tac-toe with someone',
    category: 'fun',
    usage: 'tictactoe <user>',
    run: async ({ message, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === 'statistics' || sub === 'stats') {
        const target = message.mentions.users.first() ?? message.author;
        await showTttStats(message, target.id);
        return;
      }
      if (sub === 'leaderboard' || sub === 'lb') {
        await showTttLeaderboard(message);
        return;
      }

      const opponent = message.mentions.users.first();
      if (!opponent || opponent.bot) {
        await message.reply({ embeds: [errorEmbed('Mention a user to play with.')] });
        return;
      }
      if (opponent.id === message.author.id) {
        await message.reply({ embeds: [errorEmbed('You cannot play against yourself.')] });
        return;
      }
      if (getTicTacToeGame(message.channel.id)) {
        await message.reply({ embeds: [errorEmbed('A game is already active in this channel.')] });
        return;
      }

      const board = ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'];
      setTicTacToeGame(message.channel.id, {
        board,
        turn: message.author.id,
        players: [message.author.id, opponent.id],
      });
      await message.reply({
        embeds: [
          deeloEmbed(
            'Tic-Tac-Toe',
            `${message.author} vs ${opponent}\n${formatBoard(board)}\n\nUse \`,move <1-9>\` to play. ${message.author} goes first (❌).`
          ),
        ],
      });
    },
  },
  {
    name: 'move',
    description: 'Make a move in tic-tac-toe',
    category: 'fun',
    usage: 'move <1-9>',
    run: async ({ message, args }) => {
      const game = getTicTacToeGame(message.channel.id);
      if (!game) {
        await message.reply({ embeds: [errorEmbed('No active game. Start with `,tictactoe @user`')] });
        return;
      }
      if (game.turn !== message.author.id) {
        await message.reply({ embeds: [errorEmbed('Not your turn.')] });
        return;
      }
      const pos = parseInt(args[0], 10) - 1;
      if (pos < 0 || pos > 8 || game.board[pos] !== '⬜') {
        await message.reply({ embeds: [errorEmbed('Invalid move. Use positions 1-9 on empty cells.')] });
        return;
      }

      const symbol = game.players[0] === message.author.id ? '❌' : '⭕';
      game.board[pos] = symbol;
      const guildId = message.guild!.id;
      const loserId = game.players.find((p) => p !== message.author.id)!;

      if (checkWinner(game.board)) {
        deleteTicTacToeGame(message.channel.id);
        await recordTttWin(guildId, message.author.id, loserId);
        await message.reply({
          embeds: [deeloEmbed('Game Over', `${formatBoard(game.board)}\n\n**${message.author}** wins! 🎉`)],
        });
        return;
      }
      if (!game.board.includes('⬜')) {
        deleteTicTacToeGame(message.channel.id);
        await recordTttTie(guildId, game.players[0], game.players[1]);
        await message.reply({ embeds: [deeloEmbed('Game Over', `${formatBoard(game.board)}\n\nIt's a tie!`)] });
        return;
      }

      game.turn = loserId;
      await message.reply({
        embeds: [deeloEmbed('Tic-Tac-Toe', `${formatBoard(game.board)}\n\n<@${game.turn}>'s turn.`)],
      });
    },
  },
  {
    name: '8ball',
    aliases: ['8b'],
    description: 'Ask the magic 8-ball',
    category: 'fun',
    usage: '8ball <question>',
    run: async ({ message, args }) => {
      const q = args.join(' ');
      if (!q) {
        await message.reply({ embeds: [errorEmbed('Ask a question!')] });
        return;
      }
      const answers = ['Yes', 'No', 'Maybe', 'Definitely', 'Absolutely not', 'Ask again later', 'Signs point to yes', 'Cannot predict now'];
      const answer = answers[Math.floor(Math.random() * answers.length)];
      await message.reply({ embeds: [deeloEmbed('🎱 Magic 8-Ball', `**Q:** ${q}\n**A:** ${answer}`)] });
    },
  },
  {
    name: 'coinflip',
    aliases: ['flip', 'coin'],
    description: 'Flip a coin',
    category: 'fun',
    run: async ({ message }) => {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await message.reply({ embeds: [deeloEmbed('🪙 Coin Flip', `**${result}**`)] });
    },
  },
  {
    name: 'roll',
    aliases: ['dice'],
    description: 'Roll dice',
    category: 'fun',
    usage: 'roll [sides]',
    run: async ({ message, args }) => {
      const sides = parseInt(args[0] ?? '6', 10) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await message.reply({ embeds: [deeloEmbed('🎲 Roll', `Rolled **${result}** (1-${sides})`)] });
    },
  },
  {
    name: 'blacktea',
    description: 'Play blacktea word game',
    category: 'fun',
    premiumFeature: 'games',
    run: async ({ message, args }) => {
      await handleBlackteaCommand(message, args);
    },
  },
  {
    name: 'juul',
    description: 'Share a juul with your friends',
    category: 'fun',
    run: async ({ message, args }) => {
      const { handleJuulCommand } = await import('../../games/misc-fun');
      await handleJuulCommand(message, args[0]?.toLowerCase() ?? '', args.slice(1));
    },
  },
  {
    name: 'game',
    description: 'Look up video game information',
    category: 'fun',
    usage: 'game <title>',
    run: async ({ message, args }) => {
      const { handleGameLookup } = await import('../../games/misc-fun');
      await handleGameLookup(message, args.join(' '));
    },
  },
];

export default fun;
