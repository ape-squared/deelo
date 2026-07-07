import type { Message } from 'discord.js';
import type { CommandDef } from '../types';
import { runNativeBridge } from '../lib/native-bridge';
import { handleUniversal } from './universal';
import { handleModerationCog } from './moderation-cog';
import { handleInformationCog } from './information-cog';
import { handleRoleplayCog } from './roleplay-cog';
import { handleFunCog } from './fun-cog';
import { handleMiscCog } from './misc-cog';
import { handleManipulationCog } from './manipulation-cog';
import { handleIntegrationsCog } from './integrations-cog';
import { handleMusicCog } from './music-cog';
import { handleFeaturesCog } from './features-cog';
import { handleServersCog } from './servers-cog';
import { handleSocialPlatformCog } from './social-cog';

const HANDLERS = [
  handleModerationCog,
  handleInformationCog,
  handleRoleplayCog,
  handleFunCog,
  handleMiscCog,
  handleManipulationCog,
  handleIntegrationsCog,
  handleMusicCog,
  handleFeaturesCog,
  handleServersCog,
  handleSocialPlatformCog,
];

export async function dispatchCatalogCommand(cmd: CommandDef, message: Message, args: string[]): Promise<boolean> {
  if (await runNativeBridge(message, cmd.name, args)) return true;

  for (const handler of HANDLERS) {
    if (await handler(cmd, message, args)) return true;
  }

  return handleUniversal(cmd, message, args);
}
