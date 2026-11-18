/* Görsel: srcset işaretlemesi, önceden yükleme + decode. */
import type { Photo, Show } from './types';

export interface Media {
  /** Doğal oranında görsel (yerleşim transform ile): taban yüksekliği px, en-boy oranı */
  /** priority: 'high' ilk görünen görseller (fetchpriority="high"); yoksa tembel (loading="lazy"); hepsi decoding="async" */
  img(show: Show, opts: { width: number; height: number; aspect: number; priority?: 'high' }): string;
  /** Verilen gösterim genişliği için tüm A fotoğraflarını yükleyip decode eder */
  preload(shows: Show[], cssWidth: number): Promise<void>;
}

/** Görselin çözülmesi: decode varsa o, yoksa load / error; en fazla `ms` beklenir (asla askıda kalmaz) */
function decoded(img: HTMLImageElement, ms: number) {
  const done = new Promise<void>((res, rej) => {
    if (typeof img.decode === 'function') {
      img.decode().then(res, rej);
      return;
    }
    if (img.complete && img.naturalWidth > 0) return res();
    img.onload = () => res();
    img.onerror = () => rej(new Error('img'));
  });
  return Promise.race([done, new Promise<void>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

/** AVIF desteği: hiçbir durumda hata vermez ya da askıda kalmaz; şüphede webp */
async function supportsAvif() {
  try {
    const img = new Image();
    img.src =
    'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    await decoded(img, 1000);
    return img.width > 0;
  } catch {
    return false;
  }
}

export async function createMedia(base = '/img/'): Promise<Media> {
  // bir AVIF görseli çözülemezse bundan sonra webp kullanılır
  let fmt: 'avif' | 'webp' = (await supportsAvif()) ? 'avif' : 'webp';
  const srcset = (p: Photo, f = fmt) => p.widths.map((w) => `${base}${p.id}-${w}.${f} ${w}w`).join(', ');
  const fallback = (p: Photo, f = fmt) => `${base}${p.id}-${p.widths.find((w) => w >= 960) ?? p.widths[p.widths.length - 1]}.${f}`;
  const sizes = (w: number) => `${Math.max(1, Math.round(w))}px`;
  const cache = new Map<string, Promise<void>>();

  return {
    img(show, o) {
      const p = show.photo;
      if (!p) return '';
      const w = o.height * o.aspect;
      const load = o.priority === 'high' ? 'fetchpriority="high"' : 'loading="lazy"';
      return `<img class="ph phn" style="width:${w.toFixed(1)}px;height:${o.height.toFixed(1)}px;transform-origin:${show.focus.x}% ${show.focus.y}%" srcset="${srcset(p)}" sizes="${sizes(Math.max(o.width, w))}" src="${fallback(p)}" alt="" draggable="false" decoding="async" ${load}>`;
    },

    async preload(shows, cssWidth) {
      const s = sizes(cssWidth);
      const jobs = shows
        .filter((sh) => sh.photo)
        .map((sh) => {
          const p = sh.photo!;
          const key = `${p.id}|${s}`;
          if (!cache.has(key)) {
            const load = (f: 'avif' | 'webp') => {
              const img = new Image();
              img.sizes = s;
              img.srcset = srcset(p, f);
              img.src = fallback(p, f);
              return decoded(img, 8000);
            };
            // çözülemeyen AVIF: webp ile yeniden denenir; o da olmazsa atlanır
            const f0 = fmt;
            cache.set(
              key,
              load(f0).catch(() => {
                if (f0 !== 'avif') return;
                fmt = 'webp';
                return load('webp').catch(() => {});
              }),
            );
          }
          return cache.get(key)!;
        });
      await Promise.allSettled(jobs);
    },
  };
}
