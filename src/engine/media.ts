/* Görsel ve video: srcset işaretlemesi, önceden yükleme + decode, video oynatma sınırı. */
import type { MediaOptions, Photo, Show } from './types';

export interface VideoEntry {
  el: HTMLVideoElement;
  onScreen: boolean;
  /** Ekran merkezine uzaklık (öncelik) */
  dist: number;
}

export interface Media {
  html(show: Show, opts: MediaOptions): string;
  /** Doğal oranında görsel (yerleşim transform ile, crop.ts): taban yüksekliği px, en-boy oranı */
  img(show: Show, opts: { width: number; height: number; aspect: number }): string;
  /** Verilen gösterim genişliği için tüm A fotoğraflarını yükleyip decode eder */
  preload(shows: Show[], cssWidth: number): Promise<void>;
  /** Yüzeydeki videoları önceliğe göre oynatır / durdurur */
  updateVideos(entries: VideoEntry[]): void;
  /** Açık sayfadaki gibi her zaman oynaması gereken video */
  pin(el: HTMLVideoElement | null): void;
}

/** Aynı anda oynayabilecek en fazla video */
const MAX_PLAYING = 3;

/** Görsel kutuyu odak noktasına göre doldurur; zoom da odak noktasından yapılır */
const focusStyle = (s: Show) => {
  const p = `${s.focus.x}% ${s.focus.y}%`;
  return `object-position:${p};transform-origin:${p}`;
};

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
  let pinned: HTMLVideoElement | null = null;

  return {
    html(show, opts) {
      const cls = opts.className ? ` ${opts.className}` : '';
      const v = opts.video && show.video;
      if (v && (v.mp4 || v.webm)) {
        const poster = v.poster ?? (show.photo ? fallback(show.photo) : '');
        return `<div class="media${cls}"><video class="ph" style="${focusStyle(show)}" muted playsinline loop preload="metadata" disablepictureinpicture${poster ? ` poster="${poster}"` : ''}>${
          v.webm ? `<source src="${v.webm}" type="video/webm">` : ''
        }${v.mp4 ? `<source src="${v.mp4}" type="video/mp4">` : ''}</video></div>`;
      }
      const p = show.photo;
      if (!p) return '';
      return `<div class="media${cls}"><img class="ph" style="${focusStyle(show)}" srcset="${srcset(p)}" sizes="${sizes(opts.width)}" src="${fallback(p)}" alt="" draggable="false"></div>`;
    },

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

    updateVideos(entries) {
      const budget = MAX_PLAYING - (pinned ? 1 : 0);
      const ranked = entries.filter((e) => e.onScreen).sort((a, b) => a.dist - b.dist);
      const play = new Set(ranked.slice(0, budget).map((e) => e.el));
      for (const { el, onScreen } of entries) {
        el.muted = true;
        if (play.has(el)) {
          if (el.paused) el.play().catch(() => {});
        } else {
          if (!el.paused) el.pause();
          // Ekran dışındakiler ilk karede bekler
          if (!onScreen && el.currentTime > 0) el.currentTime = 0;
        }
      }
    },

    pin(el) {
      if (pinned && pinned !== el) {
        pinned.pause();
        pinned.currentTime = 0;
      }
      pinned = el;
      if (el) {
        el.muted = true;
        el.play().catch(() => {});
      }
    },
  };
}
