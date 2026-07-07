import {
  createAudioPlayer,
  NoSubscriberBehavior,
  type AudioPlayer,
} from '@discordjs/voice';
import type { Track } from './types';

export interface GuildMusicState {
  queue: Track[];
  current: Track | null;
  lastPlayed: Track | null;
  volume: number;
  repeat: boolean;
  preset: string;
  voiceChannelId: string;
  textChannelId: string;
}

interface MusicStore {
  states: Map<string, GuildMusicState>;
  audioPlayers: Map<string, AudioPlayer>;
  listenerGuilds: Set<string>;
  guildPlayers: Map<string, unknown>;
}

const STORE_KEY = '__deeloMusicStore';

function defaultState(): GuildMusicState {
  return {
    queue: [],
    current: null,
    lastPlayed: null,
    volume: 100,
    repeat: false,
    preset: 'off',
    voiceChannelId: '',
    textChannelId: '',
  };
}

export function getMusicStore(): MusicStore {
  const root = globalThis as typeof globalThis & { [STORE_KEY]?: MusicStore };
  if (!root[STORE_KEY]) {
    root[STORE_KEY] = {
      states: new Map(),
      audioPlayers: new Map(),
      listenerGuilds: new Set(),
      guildPlayers: new Map(),
    };
  }
  return root[STORE_KEY]!;
}

export function getGuildState(guildId: string): GuildMusicState {
  const store = getMusicStore();
  if (!store.states.has(guildId)) {
    store.states.set(guildId, defaultState());
  }
  return store.states.get(guildId)!;
}

export function clearGuildState(guildId: string): void {
  const store = getMusicStore();
  store.states.delete(guildId);
  store.listenerGuilds.delete(guildId);
  store.guildPlayers.delete(guildId);
  const player = store.audioPlayers.get(guildId);
  if (player) {
    try {
      player.stop(true);
    } catch {
      // ignore
    }
    store.audioPlayers.delete(guildId);
  }
}

export function getAudioPlayer(guildId: string): AudioPlayer {
  const store = getMusicStore();
  let player = store.audioPlayers.get(guildId);
  if (!player) {
    player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    store.audioPlayers.set(guildId, player);
  }
  return player;
}

export function hasListeners(guildId: string): boolean {
  return getMusicStore().listenerGuilds.has(guildId);
}

export function markListeners(guildId: string): void {
  getMusicStore().listenerGuilds.add(guildId);
}
