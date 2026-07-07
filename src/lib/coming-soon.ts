import type { Message } from 'discord.js';
import { replyInfo } from '../extended/lib/helpers';

export const COMING_SOON_MSG = '🚧 **Coming soon** — this command is on our roadmap.';
export const NOT_IMPLEMENTED_MSG = '⛔ **Not implemented** — check `,help` for supported commands.';

export async function replyComingSoon(message: Message, title = 'Coming soon', detail?: string) {
  await replyInfo(message, title, detail ?? COMING_SOON_MSG);
}

export async function replyNotImplemented(message: Message, title = 'Not implemented', detail?: string) {
  await replyInfo(message, title, detail ?? NOT_IMPLEMENTED_MSG);
}
