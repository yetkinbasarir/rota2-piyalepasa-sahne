#!/usr/bin/env node
/* PWA ikonları: kimliğin logo SVG'sinden siyah zemin üzerine beyaz logo.
   public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png + favicon.svg */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = path.join(ROOT, 'src', 'identity', 'rota1', 'logo.svg');
const OUT = path.join(ROOT, 'public', 'icons');
const BG = '#000000';
const FG = '#ffffff';

const raw = await fs.readFile(LOGO, 'utf8');
const viewBox = /viewBox="([^"]+)"/.exec(raw)[1];
const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(raw)[1].replace(/currentColor/g, FG);
const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);

/** Kare tuval; logo genişliği = size × scale, ortalı */
function squareSvg(size, scale) {
  const w = size * scale;
  const h = (w * vh) / vw;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="100%" height="100%" fill="${BG}"/>
<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${viewBox}">${inner}</svg></svg>`;
}

await fs.mkdir(OUT, { recursive: true });
const jobs = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  // maskable: güvenli alan (%80 çember) içinde kalsın
  ['maskable-512.png', 512, 0.62],
  ['apple-touch-icon.png', 180, 0.78],
];
for (const [name, size, scale] of jobs) {
  await sharp(Buffer.from(squareSvg(size, scale))).png().toFile(path.join(OUT, name));
  console.log('✓', name);
}
await fs.writeFile(path.join(OUT, 'favicon.svg'), squareSvg(64, 0.86));
console.log('✓ favicon.svg');
