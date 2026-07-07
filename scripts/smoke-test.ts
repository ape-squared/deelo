/**
 * Smoke tests for command routing and game logic (no Discord connection required).
 * Run: npx tsx scripts/smoke-test.ts
 */

import { commandRegistry } from '../src/extended/registry';
import { dispatchCatalogCommand } from '../src/extended/handlers/dispatch';
import { containsSubstring, isLikelyWord, randomCombo } from '../src/games/wordlist';
import { checkWinner, formatBoard } from '../src/games/tictactoe';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function main() {
  console.log('\n=== Catalog Registry ===');
  const count = commandRegistry.load();
  assert(count >= 1100, `Loaded ${count} catalog commands`);

  const blacktea = commandRegistry.match('blacktea');
  assert(blacktea?.command.name === 'blacktea', 'Matches blacktea');
  const blackteaEnd = commandRegistry.match('blacktea end');
  assert(blackteaEnd?.command.name === 'blacktea end', 'Matches blacktea end');
  const juulHit = commandRegistry.match('juul hit');
  assert(juulHit?.command.name === 'juul hit', 'Matches juul hit');
  const tttLb = commandRegistry.match('tictactoe leaderboard');
  assert(tttLb?.command.name === 'tictactoe leaderboard', 'Matches tictactoe leaderboard');

  console.log('\n=== Word Game Logic ===');
  assert(containsSubstring('steak', 'ste'), 'steak contains ste');
  assert(!containsSubstring('steak', 'ets'), 'steak does not contain ets');
  assert(isLikelyWord('hello'), 'hello is valid word');
  assert(!isLikelyWord('ab'), 'ab too short');
  const combo = randomCombo(3);
  assert(combo.length === 3, `randomCombo returns 3 chars (${combo})`);

  console.log('\n=== Tic-Tac-Toe Logic ===');
  const winBoard = ['❌', '❌', '❌', '⭕', '⭕', '⬜', '⬜', '⬜', '⬜'];
  assert(checkWinner(winBoard), 'Detects row win');
  const tieBoard = ['❌', '⭕', '❌', '⭕', '❌', '⭕', '⭕', '❌', '⭕'];
  assert(!checkWinner(tieBoard), 'No false win on tie board');
  assert(formatBoard(winBoard).includes('\n'), 'formatBoard has newlines');

  console.log('\n=== Native Bridge Resolution ===');
  const { resolveNative } = await import('../src/extended/lib/native-bridge');
  assert(resolveNative('blacktea')?.cmd === 'blacktea', 'blacktea → blacktea cmd');
  assert(resolveNative('blacktea end')?.args.includes('end'), 'blacktea end → end arg');
  assert(resolveNative('juul hit')?.args.includes('hit'), 'juul hit → hit arg');
  assert(resolveNative('tictactoe leaderboard')?.args.includes('leaderboard'), 'ttt lb mapped');

  console.log('\n=== Dispatch Handlers (mock) ===');
  const mockMessage = {
    author: { id: '1', bot: false, username: 'test' },
    guild: { id: 'g1' },
    member: { permissions: { has: () => true } },
    channel: { id: 'c1', isTextBased: () => true, isDMBased: () => false },
    client: { commands: new Map(), aliases: new Map() },
    reply: async () => ({ react: async () => {} }),
  } as unknown as import('discord.js').Message;

  const rpsCmd = commandRegistry.get('rps');
  if (rpsCmd) {
    let rpsReply = '';
    const rpsMsg = {
      ...mockMessage,
      reply: async (opts: { embeds: Array<{ data?: { description?: string } }> }) => {
        rpsReply = opts.embeds[0]?.data?.description ?? '';
        return {};
      },
    } as unknown as import('discord.js').Message;
    await dispatchCatalogCommand(rpsCmd, rpsMsg, ['rock']);
    assert(rpsReply.includes('rock'), 'misc rps handles rock');
  }

  const unknownFun = commandRegistry.get('ocr');
  if (unknownFun) {
    const handled = await dispatchCatalogCommand(unknownFun, mockMessage, ['test']);
    assert(handled === true, 'ocr with args gets universal handler');
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
