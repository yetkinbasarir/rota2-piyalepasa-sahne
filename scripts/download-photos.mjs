#!/usr/bin/env node
/**
 * kaynaklar.json içindeki tüm kayıtları indirir.
 * Her kayıtta "bigger" adresleri ve "url" denenir; geçerli görseller arasından
 * en yüksek çözünürlüklü olan (genişlik × yükseklik) saklanır.
 * Yerel kaynaklar (Karagöz) ROTA1_dosyalar klasöründen kopyalanır.
 *
 * Çıktı: photos-raw/<dest>.<uzantı>  +  photos-raw/report.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'ROTA1_dosyalar');
const OUT_DIR = path.join(ROOT, 'photos-raw');
const LIST = JSON.parse(await fs.readFile(path.join(SRC_DIR, 'kaynaklar.json'), 'utf8'));

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TIMEOUT = 30000;
const CONCURRENCY = 6;

async function fetchBuffer(url, referer) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const headers = { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5' };
    if (referer && /^https?:/.test(referer)) headers.Referer = referer;
    const res = await fetch(url, { headers, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

/** Görseli sharp ile doğrular; boyut bilgisini döner. */
async function probe(buf) {
  const m = await sharp(buf, { failOn: 'error' }).metadata();
  if (!m.width || !m.height) throw new Error('boyut yok');
  if (m.width < 200 || m.height < 200) throw new Error(`çok küçük ${m.width}x${m.height}`);
  // Tam decode ederek bozuk dosyaları ele
  await sharp(buf, { failOn: 'error' }).resize(16).toBuffer();
  return { width: m.width, height: m.height, format: m.format };
}

const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif', heif: 'avif', gif: 'gif', tiff: 'tif' };

async function handle(entry) {
  const result = { dest: entry.dest, tried: [], ok: false };
  const isLocal = !/^https?:/.test(entry.url);
  const candidates = isLocal ? [entry.url] : [...(entry.bigger || []), entry.url];
  let best = null;

  for (const url of candidates) {
    try {
      let buf;
      if (!/^https?:/.test(url)) buf = await fs.readFile(path.join(SRC_DIR, url));
      else {
        try {
          buf = await fetchBuffer(url, entry.source);
        } catch (e) {
          // Bazı sunucular Referer ile reddeder; bir de Referer olmadan dene
          buf = await fetchBuffer(url, null);
        }
      }
      const info = await probe(buf);
      result.tried.push({ url, ...info });
      if (!best || info.width * info.height > best.info.width * best.info.height) best = { url, buf, info };
    } catch (e) {
      result.tried.push({ url, error: String(e.message || e) });
    }
  }

  if (best) {
    const file = path.join(OUT_DIR, `${entry.dest}.${EXT[best.info.format] || 'img'}`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, best.buf);
    Object.assign(result, { ok: true, file: path.relative(OUT_DIR, file), url: best.url, width: best.info.width, height: best.info.height });
  }
  const tag = result.ok ? `✓ ${result.width}×${result.height}` : '✗';
  console.log(`${tag}  ${entry.dest}`);
  return result;
}

await fs.mkdir(OUT_DIR, { recursive: true });
const results = new Array(LIST.length);
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < LIST.length) {
      const k = next++;
      results[k] = await handle(LIST[k]);
    }
  }),
);
await fs.writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 1));
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length}/${results.length} görsel alındı.`);
if (fail.length) console.log('Alınamayanlar:\n' + fail.map((f) => '  ' + f.dest).join('\n'));
