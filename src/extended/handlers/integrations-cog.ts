import type { Message } from 'discord.js';
import type { CommandDef } from '../types';

/** Last.fm and Spotify integration cogs were removed from Deelo. */
export async function handleIntegrationsCog(_cmd: CommandDef, _message: Message, _args: string[]): Promise<boolean> {
  return false;
}
