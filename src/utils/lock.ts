import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(__dirname, '..', '.bot.lock');

function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy wait — only used briefly during startup
  }
}

export function acquireBotLock(): void {
  if (fs.existsSync(LOCK_FILE)) {
    const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
    if (!isNaN(oldPid) && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 0);
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
          console.warn(`Stopping previous bot instance (PID ${oldPid})...`);
          try {
            process.kill(oldPid, 'SIGTERM');
            for (let i = 0; i < 20; i++) {
              sleepSync(100);
              try {
                process.kill(oldPid, 0);
              } catch {
                break;
              }
              if (i === 19) {
                console.warn(`Force-killing previous bot instance (PID ${oldPid})...`);
                process.kill(oldPid, 'SIGKILL');
                sleepSync(200);
              }
            }
          } catch {
            // already gone
          }
        } else {
          console.error(`\n❌ Bot already running (PID ${oldPid}). Stop it first:\n   kill ${oldPid}\n`);
          process.exit(1);
        }
      } catch {
        // stale lock — previous process died
      }
    }
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

export function releaseBotLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8') === String(process.pid)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // ignore
  }
}
