#!/usr/bin/env node
/**
 * Convert black-on-white brand PNGs → crisp white-on-transparent for dark UI.
 * Run: node web/scripts/process-brand-assets.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(__dirname, '..', 'public', 'brand');

const SOURCES = {
  icon: {
    source: path.join(brandDir, 'logo-icon-source.png'),
    out: path.join(brandDir, 'logo-icon.png'),
    favicon: path.join(__dirname, '..', 'src', 'app', 'favicon.ico'),
  },
  wordmark: {
    source: path.join(brandDir, 'logo-wordmark-source.png'),
    out: path.join(brandDir, 'logo-wordmark.png'),
  },
};

function resolveSource(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing brand source: ${filePath}`);
  }
  return filePath;
}

/** Pixels lighter than threshold become transparent; dark pixels become white. */
async function toWhiteTransparent(input, output, threshold = 210) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r + g + b) / 3;
    if (lum >= threshold) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    } else {
      const strength = 1 - lum / threshold;
      const v = Math.round(200 + strength * 55);
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(output);
}

async function main() {
  fs.mkdirSync(brandDir, { recursive: true });

  const iconSrc = resolveSource(SOURCES.icon.source);
  const wordmarkSrc = resolveSource(SOURCES.wordmark.source);

  await toWhiteTransparent(iconSrc, SOURCES.icon.out, 220);
  await toWhiteTransparent(wordmarkSrc, SOURCES.wordmark.out, 220);

  await sharp(SOURCES.icon.out)
    .resize(256, 256, { fit: 'contain', background: { r: 5, g: 5, b: 8, alpha: 255 } })
    .png()
    .toFile(path.join(brandDir, 'logo-icon-og.png'));

  await sharp(SOURCES.icon.out)
    .resize(32, 32, { fit: 'contain', background: { r: 5, g: 5, b: 8, alpha: 255 } })
    .toFile(SOURCES.icon.favicon);

  console.log('Brand assets processed →', brandDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
