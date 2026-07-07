import { validateConfig } from './config';
import { testConnection } from './database';
import { DeeloClient } from './client';
import { loadCommands } from './handlers/commandLoader';
import { registerSlashCommands } from './handlers/commandHandler';
import { registerEvents } from './handlers/eventHandler';
import { registerButtonHandlers } from './handlers/buttonHandler';
import { acquireBotLock, releaseBotLock } from './utils/lock';
import { initCommandCatalog } from './extended/router';
import { initMusicService } from './services/music';

let client: DeeloClient | null = null;

async function main() {
  acquireBotLock();
  validateConfig();
  await testConnection();
  console.log('Supabase connected');

  await initMusicService();

  const catalogCount = initCommandCatalog();

  client = new DeeloClient();
  await loadCommands(client);
  console.log(`Loaded ${client.commands.size} native + ${catalogCount} catalog commands`);
  registerEvents(client);
  registerButtonHandlers(client);
  const { startStatusEmbedLoop } = await import('./services/status-embed');
  startStatusEmbedLoop(client);

  await client.login(process.env.DISCORD_TOKEN);

  client.once('ready', async () => {
    try {
      await registerSlashCommands(client!);
    } catch (err) {
      console.warn('Slash command registration failed (may need time):', err);
    }
  });
}

async function shutdown() {
  if (client) {
    console.log('Shutting down...');
    client.destroy();
    client = null;
  }
  releaseBotLock();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
