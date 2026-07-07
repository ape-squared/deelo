import sharp from 'sharp';

const NEKOBOT_BASE = 'https://nekobot.xyz/api/imagegen';

/** NekoBot types that use `image` instead of `url`. */
const NEKO_IMAGE_PARAM = new Set(['deepfry', 'magik', 'blurpify', 'animeface']);

/** Effects served by NekoBot imagegen. */
const NEKO_TYPES = new Set([
  'deepfry',
  'magik',
  'gifmagik',
  'blurpify',
  'trash',
  'captcha',
  'threats',
  'jpeg',
  'baguette',
  'awooify',
  'lolice',
  'stickbug',
  'iphonex',
]);

/** Catalog effect name → processor kind. */
const EFFECT_MAP: Record<string, { kind: 'neko'; type: string } | { kind: 'sharp'; op: SharpOp }> = {
  deepfry: { kind: 'neko', type: 'deepfry' },
  magik: { kind: 'neko', type: 'magik' },
  gifmagik: { kind: 'neko', type: 'magik' },
  blur: { kind: 'sharp', op: 'blur' },
  pixelate: { kind: 'sharp', op: 'pixelate' },
  invert: { kind: 'sharp', op: 'invert' },
  grayscale: { kind: 'sharp', op: 'grayscale' },
  sharpen: { kind: 'sharp', op: 'sharpen' },
  brightness: { kind: 'sharp', op: 'brightness' },
  contrast: { kind: 'sharp', op: 'contrast' },
  saturation: { kind: 'sharp', op: 'saturation' },
  spin: { kind: 'sharp', op: 'rotate' },
  reverse: { kind: 'sharp', op: 'flip' },
  zoom: { kind: 'sharp', op: 'zoom' },
  neon: { kind: 'sharp', op: 'sharpen' },
  bloom: { kind: 'sharp', op: 'blur' },
  zoomblur: { kind: 'sharp', op: 'blur' },
};

type SharpOp = 'blur' | 'pixelate' | 'invert' | 'grayscale' | 'sharpen' | 'brightness' | 'contrast' | 'saturation' | 'rotate' | 'flip' | 'zoom';

export const MEDIA_EFFECT_NAMES = [
  'blur', 'deepfry', 'bloom', 'spin', 'motivate', 'meme', 'flag', 'speechbubble', 'rainbow', 'valentine',
  'toaster', 'rubiks', 'fortune', 'gifmagik', 'magik', 'glass', 'passed', 'failed', 'trash', 'wasted',
  'triggered', 'captcha', 'invert', 'pixelate', 'sharpen', 'brightness', 'contrast', 'saturation',
  'grayscale', 'neon', 'reverse', 'zoom', 'zoomblur', 'heart', 'caption', 'billboard', 'fisheye',
  'circuitboard', 'spread', 'swirl', 'book', 'wormhole', 'tattoo', 'scramble', 'speed', 'flag2',
];

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': 'DeeloBot/1.0' } });
  if (!res.ok) throw new Error(`Could not download image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function nekoGenerate(type: string, imageUrl: string, extra?: Record<string, string>): Promise<string> {
  const nekoType = type === 'gifmagik' ? 'magik' : type;
  const params = new URLSearchParams({ type: nekoType, ...extra });
  if (NEKO_IMAGE_PARAM.has(nekoType)) params.set('image', imageUrl);
  else params.set('url', imageUrl);

  const res = await fetch(`${NEKOBOT_BASE}?${params}`);
  const data = (await res.json()) as { success?: boolean; message?: string; status?: number };
  if (!data.success || !data.message) {
    throw new Error(data.message ?? `NekoBot failed (${data.status ?? res.status})`);
  }
  return data.message;
}

async function applySharp(op: SharpOp, input: Buffer): Promise<Buffer> {
  let img = sharp(input);
  switch (op) {
    case 'blur':
      img = img.blur(8);
      break;
    case 'pixelate':
      img = img.resize(64, 64, { kernel: 'nearest' }).resize(512, 512, { kernel: 'nearest' });
      break;
    case 'invert':
      img = img.negate();
      break;
    case 'grayscale':
      img = img.grayscale();
      break;
    case 'sharpen':
      img = img.sharpen();
      break;
    case 'brightness':
      img = img.modulate({ brightness: 1.35 });
      break;
    case 'contrast':
      img = img.normalise();
      break;
    case 'saturation':
      img = img.modulate({ saturation: 1.8 });
      break;
    case 'rotate':
      img = img.rotate(90);
      break;
    case 'flip':
      img = img.flip();
      break;
    case 'zoom':
      img = img.resize(768, 768, { fit: 'cover', position: 'centre' });
      break;
    default:
      break;
  }
  return img.png().toBuffer();
}

export async function generateMediaEffect(
  effect: string,
  imageUrl: string,
): Promise<{ url?: string; buffer?: Buffer; filename: string }> {
  const key = effect.toLowerCase();
  const mapped = EFFECT_MAP[key];

  if (mapped?.kind === 'neko') {
    const url = await nekoGenerate(mapped.type, imageUrl, mapped.type === 'captcha' ? { username: 'deelo' } : undefined);
    return { url, filename: `${key}.png` };
  }

  if (mapped?.kind === 'sharp') {
    const input = await fetchImageBuffer(imageUrl);
    const buffer = await applySharp(mapped.op, input);
    return { buffer, filename: `${key}.png` };
  }

  if (NEKO_TYPES.has(key)) {
    const url = await nekoGenerate(key, imageUrl, key === 'captcha' ? { username: 'deelo' } : undefined);
    return { url, filename: `${key}.png` };
  }

  throw new Error(
    `Effect **${effect}** is not available yet. Try: ${['blur', 'deepfry', 'magik', 'invert', 'pixelate', 'grayscale'].join(', ')}`,
  );
}
