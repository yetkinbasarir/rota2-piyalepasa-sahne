/* Görsel: srcset işaretlemesi, önceden yükleme + decode. */
import type { Photo, Show } from './types';

export interface Media {
  /** Doğal oranında görsel (yerleşim transform ile): taban yüksekliği px, en-boy oranı */
  img(show: Show, opts: { width: number; height: number; aspect: number }): string;
  /** Verilen gösterim genişliği için tüm A fotoğraflarını yükleyip decode eder */
  preload(shows: Show[], cssWidth: number): Promise<void>;
}

async function supportsAvif() {
  const img = new Image();
  img.src =
    'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  try {
    await img.decode();
    return img.width > 0;
  } catch {
    return false;
  }
}

export async function createMedia(base = '/img/'): Promise<Media> {
  const fmt = (await supportsAvif()) ? 'avif' : 'webp';
  const srcset = (p: Photo) => p.widths.map((w) => `${base}${p.id}-${w}.${fmt} ${w}w`).join(', ');
  const fallback = (p: Photo) => `${base}${p.id}-${p.widths.find((w) => w >= 960) ?? p.widths.at(-1)}.${fmt}`;
  const sizes = (w: number) => `${Math.max(1, Math.round(w))}px`;
  const cache = new Map<string, Promise<void>>();

  return {
    img(show, o) {
      const p = show.photo;
      if (!p) return '';
      const w = o.height * o.aspect;
      return `<img class="ph phn" style="width:${w.toFixed(1)}px;height:${o.height.toFixed(1)}px;transform-origin:${show.focus.x}% ${show.focus.y}%" srcset="${srcset(p)}" sizes="${sizes(Math.max(o.width, w))}" src="${fallback(p)}" alt="" draggable="false">`;
    },

    async preload(shows, cssWidth) {
      const s = sizes(cssWidth);
      const jobs = shows
        .filter((sh) => sh.photo)
        .map((sh) => {
          const p = sh.photo!;
          const key = `${p.id}|${s}`;
          if (!cache.has(key)) {
            const img = new Image();
            img.sizes = s;
            img.srcset = srcset(p);
            img.src = fallback(p);
            cache.set(key, img.decode().catch(() => {}));
          }
          return cache.get(key)!;
        });
      await Promise.all(jobs);
    },
  };
}
