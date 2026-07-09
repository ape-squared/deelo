/**
 * Puter AI integration for Node (Discord bot).
 * @see https://developer.puter.com/tutorials/free-unlimited-openai-api/
 * @see https://developer.puter.com/tutorials/puter-js-node-js/
 * @see https://developer.puter.com/tutorials/puter-auth-token/
 */
import { createRequire } from 'node:module';
import { config } from '../../config';

export const PUTER_OPENAI_BASE = 'https://api.puter.com/puterai/openai/v1';

type PuterClient = {
  ai: {
    chat: (prompt: string | unknown[], options?: Record<string, unknown>) => Promise<unknown>;
    txt2speech: (text: string, options?: Record<string, unknown>) => Promise<unknown>;
  };
};

let puterClient: PuterClient | null | undefined;

export function hasPuterAuth(): boolean {
  return Boolean(config.puterAuthToken?.trim());
}

export function getPuterClient(): PuterClient | null {
  if (puterClient !== undefined) return puterClient;
  if (!hasPuterAuth()) {
    puterClient = null;
    return null;
  }

  try {
    const require = createRequire(__filename);
    const { init } = require('@heyputer/puter.js/src/init.cjs') as {
      init: (token?: string) => PuterClient;
    };
    puterClient = init(config.puterAuthToken);
    return puterClient;
  } catch (err) {
    console.warn('[puter] Failed to init Puter.js SDK:', err instanceof Error ? err.message : err);
    puterClient = null;
    return null;
  }
}

export function extractPuterChatText(response: unknown): string {
  if (typeof response === 'string') return response.trim();
  if (!response || typeof response !== 'object') return '';

  const obj = response as Record<string, unknown>;

  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim();

  const message = obj.message as Record<string, unknown> | undefined;
  if (message) {
    const content = message.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    if (content != null && typeof (content as { toString?: () => string }).toString === 'function') {
      const text = String(content).trim();
      if (text && text !== '[object Object]') return text;
    }
  }

  if (Array.isArray(obj)) {
    return obj
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof (part as { text?: string }).text === 'string') {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

async function audioToBuffer(audio: unknown): Promise<Buffer | null> {
  if (!audio) return null;
  if (Buffer.isBuffer(audio)) return audio;
  if (audio instanceof ArrayBuffer) return Buffer.from(audio);
  if (ArrayBuffer.isView(audio)) {
    return Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength);
  }

  const obj = audio as Record<string, unknown>;

  if (typeof obj.arrayBuffer === 'function') {
    return Buffer.from(await (obj.arrayBuffer as () => Promise<ArrayBuffer>)());
  }

  if (typeof obj.src === 'string' && /^https?:\/\//i.test(obj.src)) {
    const res = await fetch(obj.src);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  if (typeof obj.url === 'string' && /^https?:\/\//i.test(obj.url)) {
    const res = await fetch(obj.url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  // HTMLAudioElement-like: currentSrc
  if (typeof obj.currentSrc === 'string' && /^https?:\/\//i.test(obj.currentSrc)) {
    const res = await fetch(obj.currentSrc);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  return null;
}

export async function puterChat(messages: { role: string; content: string }[], model: string): Promise<string> {
  const client = getPuterClient();
  if (!client) throw new Error('Puter is not configured.');

  // Prefer message-array form when available; fall back to concatenated prompt
  try {
    const response = await client.ai.chat(messages as unknown as string, {
      model,
      temperature: 0.7,
      max_tokens: 700,
    });
    const text = extractPuterChatText(response);
    if (text) return text;
  } catch {
    /* fall through to string prompt */
  }

  const prompt = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
    .join('\n');
  const system = messages.find((m) => m.role === 'system')?.content;
  const full = system ? `${system}\n\n${prompt}\nAssistant:` : `${prompt}\nAssistant:`;

  const response = await client.ai.chat(full, { model, temperature: 0.7, max_tokens: 700 });
  const text = extractPuterChatText(response);
  if (!text) throw new Error('Puter returned an empty chat response.');
  return text;
}

export async function puterSpeech(text: string, voice: string): Promise<Buffer> {
  const client = getPuterClient();
  if (!client) throw new Error('Puter is not configured.');

  const audio = await client.ai.txt2speech(text, {
    provider: 'openai',
    model: process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
    voice,
  });

  const buffer = await audioToBuffer(audio);
  if (!buffer?.length) throw new Error('Puter TTS returned empty audio.');
  return buffer;
}
