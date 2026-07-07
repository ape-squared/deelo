import { generateDependencyReport } from '@discordjs/voice';
import sodium from 'libsodium-wrappers';

let ready = false;

export async function initVoiceDependencies(): Promise<void> {
  if (ready) return;

  await sodium.ready;

  try {
    await import('@snazzah/davey');
  } catch {
    console.warn('[music] @snazzah/davey not available — voice may fail on encrypted channels');
  }

  try {
    const ffmpegStatic = await import('ffmpeg-static');
    const ffmpegPath = ffmpegStatic.default;
    if (ffmpegPath) {
      process.env.FFMPEG_PATH = ffmpegPath;
      const dir = ffmpegPath.replace(/[/\\][^/\\]+$/, '');
      process.env.PATH = `${dir}${process.env.PATH ? `:${process.env.PATH}` : ''}`;
    }
  } catch {
    console.warn('[music] ffmpeg-static not available — install it or add ffmpeg to PATH');
  }

  console.log('[music] Voice dependencies:\n' + generateDependencyReport());
  ready = true;
}
