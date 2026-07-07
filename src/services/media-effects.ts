import sharp from 'sharp';

const NEKOBOT_BASE = 'https://nekobot.xyz/api/imagegen';

const NEKO_IMAGE_PARAM = new Set(['deepfry', 'magik', 'blurpify', 'animeface']);

const NEKO_URL_TYPES = new Set([
  'trash', 'threats', 'jpeg', 'baguette', 'lolice', 'stickbug', 'iphonex', 'awooify',
]);

const NEKO_TEXT_TYPES = new Set(['fact', 'changemymind', 'clyde', 'kannagen']);

type SharpOp =
  | 'blur' | 'pixelate' | 'invert' | 'grayscale' | 'sharpen' | 'brightness' | 'contrast'
  | 'saturation' | 'rotate' | 'flip' | 'zoom' | 'compress';

export interface MediaEffectOptions {
  text?: string;
  topText?: string;
  bottomText?: string;
  flag?: string;
}

const EFFECT_MAP: Record<string, { kind: 'neko'; type: string } | { kind: 'sharp'; op: SharpOp } | { kind: 'custom'; id: string }> = {
  deepfry: { kind: 'neko', type: 'deepfry' },
  magik: { kind: 'neko', type: 'magik' },
  gifmagik: { kind: 'neko', type: 'magik' },
  toaster: { kind: 'neko', type: 'jpeg' },
  trash: { kind: 'neko', type: 'trash' },
  threats: { kind: 'neko', type: 'threats' },
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
  compress: { kind: 'sharp', op: 'compress' },
  valentine: { kind: 'custom', id: 'valentine' },
  rainbow: { kind: 'custom', id: 'rainbow' },
  speechbubble: { kind: 'custom', id: 'speechbubble' },
  motivate: { kind: 'custom', id: 'motivate' },
  rubiks: { kind: 'custom', id: 'rubiks' },
  fortune: { kind: 'custom', id: 'fortune' },
  flag: { kind: 'custom', id: 'flag' },
  flag2: { kind: 'custom', id: 'flag' },
  meme: { kind: 'custom', id: 'meme' },
  heart: { kind: 'custom', id: 'heart' },
  caption: { kind: 'custom', id: 'caption' },
  circuitboard: { kind: 'custom', id: 'circuitboard' },
  spread: { kind: 'custom', id: 'spread' },
  swirl: { kind: 'custom', id: 'swirl' },
  book: { kind: 'custom', id: 'book' },
  wormhole: { kind: 'custom', id: 'wormhole' },
  billboard: { kind: 'custom', id: 'billboard' },
  tattoo: { kind: 'custom', id: 'tattoo' },
  fisheye: { kind: 'custom', id: 'fisheye' },
  scramble: { kind: 'custom', id: 'scramble' },
  speed: { kind: 'custom', id: 'speed' },
};

export const MEDIA_EFFECT_NAMES = [
  'blur', 'deepfry', 'bloom', 'spin', 'motivate', 'meme', 'flag', 'speechbubble', 'rainbow', 'valentine',
  'toaster', 'rubiks', 'fortune', 'gifmagik', 'magik', 'heart', 'caption', 'billboard', 'fisheye',
  'circuitboard', 'spread', 'swirl', 'book', 'wormhole', 'tattoo', 'scramble', 'speed', 'flag2',
  'invert', 'pixelate', 'sharpen', 'brightness', 'contrast', 'saturation', 'grayscale', 'neon',
  'reverse', 'zoom', 'zoomblur', 'compress', 'trash', 'threats', 'jpeg',
];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text: string, max = 28): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

async function imageSize(input: Buffer): Promise<{ w: number; h: number }> {
  const meta = await sharp(input).metadata();
  return { w: meta.width ?? 512, h: meta.height ?? 512 };
}

async function compositeSvg(input: Buffer, svg: string): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const svgBuf = Buffer.from(svg.replace(/\{w\}/g, String(w)).replace(/\{h\}/g, String(h)));
  return sharp(input).composite([{ input: svgBuf, top: 0, left: 0 }]).png().toBuffer();
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': 'DeeloBot/1.0' } });
  if (!res.ok) throw new Error(`Could not download image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function nekoGenerate(type: string, imageUrl: string, extra?: Record<string, string>): Promise<string> {
  const params = new URLSearchParams({ type, ...extra });
  if (NEKO_IMAGE_PARAM.has(type)) params.set('image', imageUrl);
  else if (!NEKO_TEXT_TYPES.has(type)) params.set('url', imageUrl);

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
    case 'compress':
      return img.jpeg({ quality: 35, mozjpeg: true }).toBuffer();
    default:
      break;
  }
  return img.png().toBuffer();
}

async function customValentine(input: Buffer): Promise<Buffer> {
  const tinted = await sharp(input).modulate({ saturation: 1.4, brightness: 1.05 }).tint({ r: 255, g: 120, b: 150 }).toBuffer();
  const svg = `<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff4d8d" stop-opacity="0.35"/><stop offset="100%" stop-color="#ff1744" stop-opacity="0.2"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="92%" text-anchor="middle" font-size="42" fill="#fff">♥</text>
  </svg>`;
  return compositeSvg(tinted, svg);
}

async function customRainbow(input: Buffer): Promise<Buffer> {
  const svg = `<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff0000" stop-opacity="0.25"/>
      <stop offset="20%" stop-color="#ff8800" stop-opacity="0.25"/>
      <stop offset="40%" stop-color="#ffff00" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#00ff00" stop-opacity="0.25"/>
      <stop offset="80%" stop-color="#0088ff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#8800ff" stop-opacity="0.25"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#r)"/>
  </svg>`;
  return compositeSvg(input, svg);
}

async function customSpeechBubble(input: Buffer, opts: MediaEffectOptions): Promise<Buffer> {
  const text = esc(opts.text ?? 'Hello!');
  const { w, h } = await imageSize(input);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${w / 2}" cy="${h * 0.82}" rx="${w * 0.38}" ry="${h * 0.12}" fill="white" stroke="#222" stroke-width="4"/>
    <polygon points="${w / 2 - 20},${h * 0.9} ${w / 2},${h * 0.98} ${w / 2 + 20},${h * 0.9}" fill="white" stroke="#222" stroke-width="4"/>
    <text x="50%" y="${h * 0.84}" text-anchor="middle" font-size="22" font-family="Arial" fill="#111">${text}</text>
  </svg>`;
  return compositeSvg(input, svg);
}

async function customMotivate(input: Buffer, opts: MediaEffectOptions): Promise<Buffer> {
  const text = esc(opts.text ?? opts.topText ?? 'You can do it!');
  const { w, h } = await imageSize(input);
  const framed = await sharp(input).resize(w - 40, h - 120, { fit: 'cover' }).extend({ top: 60, bottom: 60, left: 20, right: 20, background: '#111' }).toBuffer();
  const svg = `<svg width="${w}" height="${h + 120}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111"/>
    <rect x="10" y="10" width="${w - 20}" height="50" fill="#c0392b"/>
    <text x="50%" y="45" text-anchor="middle" font-size="24" font-family="Impact, Arial" fill="white">${text}</text>
  </svg>`;
  return sharp(framed).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

async function customRubiks(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const size = Math.min(w, h, 480);
  const cells = 9;
  const cell = Math.floor(size / cells);
  const small = await sharp(input).resize(size, size, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
  const pixels = small.data;
  const out = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cell) * cell + Math.floor(cell / 2);
      const cy = Math.floor(y / cell) * cell + Math.floor(cell / 2);
      const si = (cy * size + cx) * 3;
      const di = (y * size + x) * 3;
      out[di] = pixels[si];
      out[di + 1] = pixels[si + 1];
      out[di + 2] = pixels[si + 2];
    }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

async function customFortune(input: Buffer, opts: MediaEffectOptions): Promise<Buffer> {
  const text = esc(opts.text ?? 'Your fortune awaits.');
  const { w, h } = await imageSize(input);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${w * 0.15}" y="${h * 0.65}" width="${w * 0.7}" height="${h * 0.22}" rx="12" fill="#f5e6c8" stroke="#8b6914" stroke-width="3"/>
    <text x="50%" y="${h * 0.78}" text-anchor="middle" font-size="18" font-family="Georgia" fill="#333">${text}</text>
    <text x="50%" y="${h * 0.58}" text-anchor="middle" font-size="36">🥠</text>
  </svg>`;
  return compositeSvg(input, svg);
}

function countryFlag(code: string): string {
  const c = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  if (c.length < 2) return '🏳️';
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

async function customFlag(input: Buffer, opts: MediaEffectOptions): Promise<Buffer> {
  const flag = countryFlag(opts.flag ?? opts.text ?? 'US');
  const { w, h } = await imageSize(input);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${w}" height="${h * 0.15}" fill="rgba(0,0,0,0.55)"/>
    <text x="50%" y="${h * 0.11}" text-anchor="middle" font-size="48">${flag}</text>
  </svg>`;
  return compositeSvg(input, svg);
}

async function customMeme(input: Buffer, opts: MediaEffectOptions): Promise<Buffer> {
  const top = esc((opts.topText ?? opts.text?.split('|')[0] ?? 'TOP TEXT').toUpperCase());
  const bottom = esc((opts.bottomText ?? opts.text?.split('|')[1] ?? 'BOTTOM TEXT').toUpperCase());
  const { w, h } = await imageSize(input);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <style>text { font-family: Impact, Arial Black, sans-serif; font-size: ${Math.max(28, Math.floor(w / 14))}px; fill: white; stroke: black; stroke-width: 3px; paint-order: stroke; }</style>
    <text x="50%" y="8%" text-anchor="middle">${top}</text>
    <text x="50%" y="96%" text-anchor="middle">${bottom}</text>
  </svg>`;
  return compositeSvg(input, svg);
}

async function customHeart(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="v"><stop offset="70%" stop-color="transparent"/><stop offset="100%" stop-color="#ff4d8d" stop-opacity="0.45"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#v)"/>
    <text x="8%" y="12%" font-size="36">♥</text><text x="88%" y="12%" font-size="36">♥</text>
    <text x="8%" y="95%" font-size="36">♥</text><text x="88%" y="95%" font-size="36">♥</text>
  </svg>`;
  return compositeSvg(input, svg);
}

async function customCaption(input: Buffer, opts: MediaEffectOptions): Promise<Buffer> {
  const lines = wrapText(opts.text ?? opts.bottomText ?? 'Caption');
  const { w, h } = await imageSize(input);
  const lineH = 26;
  const boxH = lines.length * lineH + 24;
  const texts = lines.map((l, i) => `<text x="50%" y="${h - boxH + 30 + i * lineH}" text-anchor="middle" font-size="22" fill="white" font-family="Arial">${esc(l)}</text>`).join('');
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${h - boxH}" width="${w}" height="${boxH}" fill="rgba(0,0,0,0.65)"/>
    ${texts}
  </svg>`;
  return compositeSvg(input, svg);
}

async function customCircuitboard(input: Buffer): Promise<Buffer> {
  const edges = await sharp(input).grayscale().convolve({
    width: 3,
    height: 3,
    kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  }).toBuffer();
  return sharp(edges).tint({ r: 0, g: 255, b: 120 }).modulate({ brightness: 1.1 }).png().toBuffer();
}

async function customSpread(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const strips = 6;
  const stripH = Math.floor(h / strips);
  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < strips; i++) {
    const offset = (i % 2 === 0 ? 1 : -1) * 12;
    const strip = await sharp(input).extract({ left: 0, top: i * stripH, width: w, height: stripH }).toBuffer();
    composites.push({ input: strip, top: i * stripH, left: offset });
  }
  return sharp({ create: { width: w + 24, height: h, channels: 3, background: '#000' } }).composite(composites).png().toBuffer();
}

async function customSwirl(input: Buffer): Promise<Buffer> {
  const blurred = await sharp(input).blur(6).rotate(8, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp(input).composite([{ input: blurred, blend: 'screen' }]).sharpen().png().toBuffer();
}

async function customBook(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const padded = await sharp(input).extend({ top: 20, bottom: 20, left: 30, right: 30, background: '#5c3a21' }).toBuffer();
  const svg = `<svg width="${w + 60}" height="${h + 40}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="28" height="100%" fill="#3e2723"/>
    <line x1="28" y1="0" x2="28" y2="100%" stroke="#1a0f0a" stroke-width="2"/>
  </svg>`;
  return sharp(padded).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

async function customWormhole(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const center = await sharp(input).resize(Math.floor(w * 0.45), Math.floor(h * 0.45), { fit: 'cover' }).blur(2).toBuffer();
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="b"><stop offset="30%" stop-color="transparent"/><stop offset="100%" stop-color="black" stop-opacity="0.85"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
  </svg>`;
  const base = await compositeSvg(input, svg);
  return sharp(base).composite([{ input: center, gravity: 'centre' }]).png().toBuffer();
}

async function customBillboard(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const framed = await sharp(input).resize(w - 80, Math.floor(h * 0.55), { fit: 'cover' }).extend({
    top: 30, bottom: 10, left: 40, right: 40, background: '#2c3e50',
  }).toBuffer();
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${w * 0.08}" y="${h * 0.58}" width="12" height="${h * 0.35}" fill="#555"/>
    <rect x="${w * 0.92}" y="${h * 0.58}" width="12" height="${h * 0.35}" fill="#555"/>
  </svg>`;
  return sharp({ create: { width: w, height: h, channels: 3, background: '#87ceeb' } })
    .composite([{ input: framed, top: Math.floor(h * 0.08), left: 40 }, { input: Buffer.from(svg), top: 0, left: 0 }])
    .png().toBuffer();
}

async function customTattoo(input: Buffer): Promise<Buffer> {
  const gray = await sharp(input).grayscale().normalise().linear(1.2, -10).toBuffer();
  return sharp(gray).tint({ r: 30, g: 20, b: 40 }).modulate({ brightness: 0.9 }).png().toBuffer();
}

async function customFisheye(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const size = Math.min(w, h);
  const bulge = await sharp(input)
    .extract({ left: Math.floor((w - size) / 2), top: Math.floor((h - size) / 2), width: size, height: size })
    .resize(Math.floor(size * 1.35), Math.floor(size * 1.35), { fit: 'fill' })
    .toBuffer();
  return sharp(bulge).resize(w, h, { fit: 'cover' }).png().toBuffer();
}

async function customScramble(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const tiles = 4;
  const tw = Math.floor(w / tiles);
  const th = Math.floor(h / tiles);
  const order = [...Array(tiles * tiles).keys()].sort(() => Math.random() - 0.5);
  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < order.length; i++) {
    const src = order[i];
    const sx = (src % tiles) * tw;
    const sy = Math.floor(src / tiles) * th;
    const dx = (i % tiles) * tw;
    const dy = Math.floor(i / tiles) * th;
    const tile = await sharp(input).extract({ left: sx, top: sy, width: tw, height: th }).toBuffer();
    composites.push({ input: tile, left: dx, top: dy });
  }
  return sharp({ create: { width: w, height: h, channels: 3, background: '#000' } }).composite(composites).png().toBuffer();
}

async function customSpeed(input: Buffer): Promise<Buffer> {
  const { w, h } = await imageSize(input);
  const streaks = await sharp(input).blur(0.8).linear(1.1, 0).resize(w + 40, h, { fit: 'fill' }).extract({ left: 20, top: 0, width: w, height: h }).toBuffer();
  return sharp(input).composite([{ input: streaks, blend: 'lighten' }]).png().toBuffer();
}

const CUSTOM_HANDLERS: Record<string, (input: Buffer, opts: MediaEffectOptions) => Promise<Buffer>> = {
  valentine: customValentine,
  rainbow: customRainbow,
  speechbubble: customSpeechBubble,
  motivate: customMotivate,
  rubiks: customRubiks,
  fortune: customFortune,
  flag: customFlag,
  meme: customMeme,
  heart: customHeart,
  caption: customCaption,
  circuitboard: customCircuitboard,
  spread: customSpread,
  swirl: customSwirl,
  book: customBook,
  wormhole: customWormhole,
  billboard: customBillboard,
  tattoo: customTattoo,
  fisheye: customFisheye,
  scramble: customScramble,
  speed: customSpeed,
};

export async function generateMediaEffect(
  effect: string,
  imageUrl: string,
  options: MediaEffectOptions = {},
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
    const ext = mapped.op === 'compress' ? 'jpg' : 'png';
    return { buffer, filename: `${key}.${ext}` };
  }

  if (mapped?.kind === 'custom') {
    const handler = CUSTOM_HANDLERS[mapped.id];
    if (!handler) throw new Error(`Effect **${effect}** handler missing.`);
    const input = await fetchImageBuffer(imageUrl);
    const buffer = await handler(input, options);
    return { buffer, filename: `${key}.png` };
  }

  if (NEKO_URL_TYPES.has(key)) {
    const url = await nekoGenerate(key, imageUrl);
    return { url, filename: `${key}.png` };
  }

  if (NEKO_TEXT_TYPES.has(key) || key === 'fortune') {
    const text = options.text ?? 'Deelo';
    const url = await nekoGenerate(key === 'fortune' ? 'fact' : key, imageUrl, { text });
    return { url, filename: `${key}.png` };
  }

  throw new Error(`Unknown effect **${effect}**. Use \`,media\` to list effects.`);
}
