import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { Command } from './types/command';

export class DeeloClient extends Client {
  commands = new Collection<string, Command>();
  aliases = new Collection<string, string>();
  cooldowns = new Collection<string, Collection<string, number>>();
  snipes = new Map<string, { content: string; author: string; attachment?: string; timestamp: number }>();
  editSnipes = new Map<string, { oldContent: string; newContent: string; author: string; timestamp: number }>();
  /** Prevent duplicate command handling for the same message */
  handledMessages = new Set<string>();
  /** Prevent runCommand from executing twice for one user message */
  commandExecutions = new Set<string>();
  /** Track suggestion voters per message (in-memory) */
  suggestionVoters = new Map<string, Set<string>>();
  eventsRegistered = false;
  buttonsRegistered = false;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
    });
  }
}
