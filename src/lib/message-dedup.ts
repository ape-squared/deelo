import fs from 'node:fs';
import path from 'node:path';

const DEDUP_DIR = path.join(__dirname, '..', '.cmd-dedup');
const TTL_MS = 60_000;

/** Cross-process claim so only one bot instance handles a message (dev restarts, overlapping PIDs). */
export function tryClaimMessage(messageId: string): boolean {
  try {
    fs.mkdirSync(DEDUP_DIR, { recursive: true });
    const file = path.join(DEDUP_DIR, messageId);
    const fd = fs.openSync(file, 'wx');
    fs.closeSync(fd);
    setTimeout(() => {
      fs.unlink(file, () => {});
    }, TTL_MS);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw err;
  }
}
