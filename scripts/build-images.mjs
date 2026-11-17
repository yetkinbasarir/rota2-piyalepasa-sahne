#!/usr/bin/env node
/**
 * Kullanım: node scripts/build-images.mjs [--force] [--focus-only]
 *   --focus-only  görselleri ve renkleri yeniden üretmeden yalnızca odak dosyasını yeniler
 *
 * photos-raw/ içindeki indirilmiş görsellerden birkaç genişlikte WebP + AVIF üretir.
 *   public/img/<id>-<genişlik>.webp|avif
 *   src/content/photos.generated.json   (id → boyut, genişlikler, açıklama)
 *   eksik_fotograflar.txt               (indirilemeyen fotoğraflar, içerik bazında)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Vibrant } from 'node-vibrant/node';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'photos-raw');
const OUT = path.join(ROOT, 'public', 'img');
const MANIFEST = path.join(ROOT, 'src', 'content', 'photos.generated.json');
const MISSING = path.join(ROOT, 'eksik_fotograflar.txt');
const COLORS = path.join(ROOT, 'src', 'content', 'colors.generated.json');
const FOCUS = path.join(ROOT, 'src', 'content', 'focus.generated.json');
/** Renk kutusundaki koyu yazı rengi; seçilen renk bununla en az 4.5:1 kontrast vermeli */
const INK = '#0b0b0b';
const MIN_CONTRAST = 4.5;
const WIDTHS = [480, 960, 1920];

const list = JSON.parse(await fs.readFile(path.join(ROOT, 'ROTA1_dosyalar', 'kaynaklar.json'), 'utf8'));
const report = JSON.parse(await fs.readFile(path.join(RAW, 'report.json'), 'utf8'));
const byDest = new Map(report.map((r) => [r.dest, r]));
await fs.mkdir(OUT, { recursive: true });

const manifest = {};
const missing = [];
const force = process.argv.includes('--force');
const focusOnly = process.argv.includes('--focus-only');
if (focusOnly) Object.assign(manifest, JSON.parse(await fs.readFile(MANIFEST, 'utf8')));

if (!focusOnly) {
/** İndirilemeyen ama photos-raw'a elle eklenmiş görsel: <dest>.<uzantı> */
async function manualFile(dest) {
  for (const ext of ['webp', 'jpg', 'jpeg', 'png', 'avif']) {
    const file = `${dest}.${ext}`;
    try {
      await fs.access(path.join(RAW, file));
      return file;
    } catch {}
  }
  return null;
}

for (const entry of list) {
  const id = path.basename(entry.dest);
  let r = byDest.get(entry.dest);
  if (!r?.ok) {
    const file = await manualFile(entry.dest);
    if (file) r = { ...r, dest: entry.dest, ok: true, file, elle: true };
  }
  if (!r?.ok) {
    missing.push({ entry, r });
    continue;
  }
  const src = path.join(RAW, r.file);
  const img = sharp(src).rotate(); // EXIF yönünü uygula
  const meta = await img.metadata();
  const ow = meta.autoOrient?.width ?? meta.width;
  const oh = meta.autoOrient?.height ?? meta.height;
  let widths = WIDTHS.filter((w) => w <= ow);
  if (ow < WIDTHS.at(-1) && !widths.includes(ow)) widths.push(ow);
  widths = widths.sort((a, b) => a - b);

  for (const w of widths) {
    for (const fmt of ['webp', 'avif']) {
      const file = path.join(OUT, `${id}-${w}.${fmt}`);
      if (!force) {
        try {
          await fs.access(file);
          continue;
        } catch {}
      }
      const pipe = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
      if (fmt === 'webp') await pipe.webp({ quality: 78, effort: 5 }).toFile(file);
      else await pipe.avif({ quality: 52, effort: 4 }).toFile(file);
    }
  }
  manifest[id] = { w: ow, h: oh, widths, alt: entry.caption };
  console.log(`✓ ${id}  ${ow}×${oh}  [${widths.join(', ')}]`);
}

await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
}

/* ---------- fotoğraftan renk ----------
   Paletten açık tonlu renk: LightVibrant → LightMuted → ortalama renk (açılaştırılmış);
   koyu yazıyla kontrast en az 4.5 olana kadar beyaza doğru açılaştırılır. */
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (rgb) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mixWhite = (rgb, t) => rgb.map((v) => v + (255 - v) * t);

const colors = {};
if (!focusOnly) {
for (const pid of Object.keys(manifest)) {
  const entry = list.find((e) => path.basename(e.dest) === pid);
  const src = path.join(RAW, byDest.get(entry.dest).file);
  const small = await sharp(src).rotate().resize(240).png().toBuffer();
  let rgb;
  let from;
  try {
    const pal = await Vibrant.from(small).getPalette();
    const sw = pal.LightVibrant ?? pal.LightMuted;
    if (sw) {
      rgb = sw.rgb;
      from = pal.LightVibrant ? 'LightVibrant' : 'LightMuted';
    }
  } catch {}
  if (!rgb) {
    const { dominant } = await sharp(small).stats();
    rgb = mixWhite([dominant.r, dominant.g, dominant.b], 0.45);
    from = 'ortalama';
  }
  let t = 0;
  let c = rgb;
  while (contrast(c, parse(INK)) < MIN_CONTRAST && t < 1) {
    t += 0.04;
    c = mixWhite(rgb, t);
  }
  colors[pid] = { renk: hex(c), kaynak: from, acilastirma: +t.toFixed(2) };
}
await fs.writeFile(COLORS, JSON.stringify(colors, null, 1) + '\n');
console.log(`${Object.keys(colors).length} fotoğraftan renk çıkarıldı → src/content/colors.generated.json`);
}

/* ---------- odak noktası (yüzde) ----------
   Önce yüz algılama (face-api, SSD MobileNet v1, saf WASM). Odak en büyük yüzün merkezidir.
   Yüz kutusu: yüksekliği en büyük yüzün en az FACE_KEEP katı olan yüzleri kapsar (arka plandaki
   kalabalık yok sayılır); üst kenarı ve yüksekliği yüzde olarak yazılır (saç / alın payı için).
   Yüz yoksa sharp "attention" stratejisinin bulduğu bölge (orijinal görsel pikseli → yüzde);
   sonuç 0–100 dışındaysa odak x 50, y 40. */
const require = createRequire(import.meta.url);
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const tf = faceapi.tf;
await tf.setBackend('wasm');
await tf.ready();
const MODEL = path.join(ROOT, 'node_modules', '@vladmandic', 'face-api', 'model');
const wm = JSON.parse(await fs.readFile(path.join(MODEL, 'ssd_mobilenetv1_model-weights_manifest.json'), 'utf8'));
const wbin = await fs.readFile(path.join(MODEL, 'ssd_mobilenetv1_model.bin'));
await faceapi.nets.ssdMobilenetv1.loadFromWeightMap(tf.io.decodeWeights(new Uint8Array(wbin).buffer, wm[0].weights));
const DETECT = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
/** Arka plandaki çok küçük yüzleri (kalabalık) sayma: görsel kısa kenarının bu oranından küçükler elenir */
const MIN_FACE = 0.035;
/** Yüz kutusuna dahil edilecek yüzler: en büyük yüzün yüksekliğinin en az bu oranı */
const FACE_KEEP = 0.6;
const FALLBACK = { x: 50, y: 40 };

const focus = {};
for (const pid of Object.keys(manifest)) {
  const entry = list.find((e) => path.basename(e.dest) === pid);
  const src = path.join(RAW, byDest.get(entry.dest).file);
  const { data, info } = await sharp(src).rotate().resize(800, 800, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const t = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
  const dets = (await faceapi.detectAllFaces(t, DETECT)).filter((d) => d.box.height >= Math.min(info.width, info.height) * MIN_FACE);
  t.dispose();
  let x;
  let y;
  let kaynak;
  let face = null;
  if (dets.length) {
    const big = dets.reduce((a, b) => (b.box.height > a.box.height ? b : a));
    // odak: en büyük yüzün merkezi
    x = ((big.box.x + big.box.width / 2) / info.width) * 100;
    y = ((big.box.y + big.box.height / 2) / info.height) * 100;
    // yüz kutusu: en büyüğün en az %60'ı yüksekliğindeki yüzler
    const kept = dets.filter((d) => d.box.height >= big.box.height * FACE_KEEP);
    const y0 = Math.min(...kept.map((d) => d.box.y));
    const y1 = Math.max(...kept.map((d) => d.box.y + d.box.height));
    face = { top: (y0 / info.height) * 100, h: ((y1 - y0) / info.height) * 100, n: kept.length };
    kaynak = 'yuz';
  } else {
    // attention: sharp odağı orijinal (yönü düzeltilmiş) görselin pikseli olarak verir
    const meta = await sharp(src).rotate().metadata();
    const ow = meta.autoOrient?.width ?? meta.width;
    const oh = meta.autoOrient?.height ?? meta.height;
    const r = await sharp(src).rotate().resize(400, 400, { fit: 'cover', position: 'attention' }).toBuffer({ resolveWithObject: true });
    x = r.info.attentionX != null ? (r.info.attentionX / ow) * 100 : NaN;
    y = r.info.attentionY != null ? (r.info.attentionY / oh) * 100 : NaN;
    if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) ({ x, y } = FALLBACK);
    kaynak = 'dikkat';
  }
  focus[pid] = {
    x: +x.toFixed(1),
    y: +y.toFixed(1),
    kaynak,
    yuz: dets.length,
    ...(face ? { yuzUst: +face.top.toFixed(1), yuzYukseklik: +face.h.toFixed(1), kutudakiYuz: face.n } : {}),
  };
}
await fs.writeFile(FOCUS, JSON.stringify(focus, null, 1) + '\n');
const nf = Object.values(focus).filter((f) => f.kaynak === 'yuz').length;
console.log(`odak noktası: ${nf} fotoğrafta yüz, ${Object.keys(focus).length - nf} fotoğrafta attention → src/content/focus.generated.json`);

if (!focusOnly) {
// eksik_fotograflar.txt — içerik (klasör) bazında
const lines = [
  'İndirilemeyen fotoğraflar',
  `Oluşturma: ${new Date().toISOString().slice(0, 10)} · scripts/download-photos.mjs + scripts/build-images.mjs`,
  'A fotoğrafı eksikse yerine B kullanılır; ikisi de eksikse içerik renkli zeminle (fotoğrafsız) görünür.',
  '',
];
{
  const byFolder = new Map();
  for (const { entry } of missing) {
    const folder = entry.dest.split('/')[1];
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), path.basename(entry.dest)]);
  }
  const colorOnly = [...byFolder].filter(([, ids]) => ids.some((x) => /_A$/.test(x)) && ids.some((x) => /_B$/.test(x)));
  const bInstead = [...byFolder].filter(([, ids]) => ids.some((x) => /_A$/.test(x)) && !ids.some((x) => /_B$/.test(x)));
  lines.push('Renkli zeminle görünen (A ve B yok): ' + (colorOnly.map(([f]) => f).join(', ') || '—'));
  lines.push('A yerine B kullanılan: ' + (bInstead.map(([f]) => f).join(', ') || '—'));
  lines.push('');
}
for (const { entry, r } of missing) {
  const folder = entry.dest.split('/')[1];
  const kind = /_A$/.test(entry.dest) ? 'A' : 'B';
  lines.push(`${folder} · ${path.basename(entry.dest)} · ${kind}`);
  for (const t of r?.tried ?? []) lines.push(`    ${t.url}  →  ${t.error ?? 'geçersiz'}`);
}
await fs.writeFile(MISSING, lines.join('\n') + '\n');
console.log(`\n${Object.keys(manifest).length} görsel işlendi, ${missing.length} eksik → eksik_fotograflar.txt`);
}
