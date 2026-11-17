/* Açılış ekran koruyucusu (yalnızca sayfa ilk açıldığında). Logonun arkasında, ekranın tamamını
   kaplayan hızlı kesmeli bir akış: videosu açık gösterilerin karıştırılmış halkası; her kesme
   `cut` sn (ritim değişkenliği `variance` ile rastgeleleşir). Kesmeler serttir.
   Web: aynı anda `pool` oynatıcıdan oluşan bir havuz. Biri ekranda oynarken diğerleri sıradaki
   videoları hazırlar (yükle → seçilen bölüme git → PLAYING gelince duraklat → hazır). Sıradaki hazır
   değilse beklenmez: o kesmede aynı gösterinin fotoğrafı gösterilir.
   Mobil: yalnızca fotoğraflar. Ses hiçbir durumda açılmaz. */
import { youtubeApi, vimeoApi } from './fullVideo';
import type { Media } from './media';
import type { FullVideo, Identity, Show } from './types';

export interface Screensaver {
  /** İlk 2 oynatıcı hazır (ya da fotoğraf yedeğine düştü); mobilde hemen */
  firstReady: Promise<void>;
  /** Akışı başlat */
  start(): void;
  /** Akışı durdur ve bütün oynatıcıları tamamen kaldır */
  destroy(): void;
}

interface Slot {
  /** Hazırladığı gösterinin halka sırası (−1: boş) */
  at: number;
  el: HTMLElement;
  ready: boolean;
  failed: boolean;
  play(): void;
  pause(): void;
  destroy(): void;
}

let seq = 0;
const PREPARE_TIMEOUT = 8000;
/** Yükleme ekranı ilk 2 oynatıcıyı en fazla bu kadar bekler; sonra o kesmeler fotoğraf yedeğine düşer */
const FIRST_WAIT = 4000;

/** Bölüm başı: "bitis" varsa bölüm içinde rastgele bir nokta (bölüm 1 sn'den uzunsa); yoksa mevcut kural */
function pickStart(v: FullVideo, d: number, ratio: number) {
  if (v.end && v.end - v.start > 1) return v.start + Math.random() * (v.end - v.start - 1);
  if (v.start > 0) return v.start;
  return d > 0 && Number.isFinite(d) ? Math.round(d * ratio) : 0;
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createScreensaver(o: {
  root: HTMLElement;
  shows: Show[];
  media: Media;
  id: Identity;
  mobile: boolean;
  reduced: boolean;
}): Screensaver {
  const SS = o.id.screensaver;
  const ratio = o.id.video.startRatio;
  const withVideo = o.shows.filter((s) => s.fullVideo && s.photo);
  const ring = shuffle((withVideo.length ? withVideo : o.shows.filter((s) => s.photo)).slice());
  const L = ring.length;
  const useVideo = !o.mobile && !o.reduced && withVideo.length > 0;
  let alive = true;
  let timer = 0;
  let shown = -1; // ekrandaki gösterinin halka sırası (sınırsız artar)
  let visible: HTMLElement | null = null;

  /* ---------- fotoğraf katmanı (renkli, cover, odak kuralı) ---------- */
  const photo = document.createElement('div');
  photo.className = 'ss-photo';
  photo.style.cssText = 'position:absolute;inset:0;visibility:hidden';
  o.root.append(photo);
  const photoFor = (s: Show) => {
    photo.innerHTML = o.media.img(s, { width: innerWidth, height: innerHeight, aspect: s.photo ? s.photo.w / s.photo.h : 1 });
    const img = photo.firstElementChild as HTMLImageElement | null;
    if (img) {
      img.removeAttribute('class');
      img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${s.focus.x}% ${s.focus.y}%`;
      img.sizes = `${innerWidth}px`;
    }
  };
  const showEl = (el: HTMLElement) => {
    if (visible && visible !== el) visible.style.visibility = 'hidden';
    el.style.visibility = 'visible';
    visible = el;
  };

  /* ---------- oynatıcılar ---------- */
  const slots: Slot[] = [];
  const firstState = new Map<number, 'ready' | 'failed'>();
  let firstResolve: () => void = () => {};
  const firstReady = new Promise<void>((res) => (firstResolve = res));
  const reportFirst = (at: number, st: 'ready' | 'failed') => {
    if (at > 1 || firstState.has(at)) return;
    firstState.set(at, st);
    if (firstState.size >= Math.min(2, L)) firstResolve();
  };
  if (!useVideo) firstResolve();
  else
    window.setTimeout(() => {
      reportFirst(0, 'failed');
      reportFirst(1, 'failed');
    }, FIRST_WAIT);

  function makeSlot(): Slot {
    const el = document.createElement('div');
    el.className = 'fv';
    el.style.cssText = 'position:absolute;inset:0;visibility:hidden;background:#000';
    const box = document.createElement('div');
    box.className = 'fv-in';
    el.append(box);
    o.root.append(el);
    return { at: -1, el, ready: false, failed: false, play() {}, pause() {}, destroy() {} };
  }

  /** Slotu halkadaki `at` sırasındaki gösteri için hazırla */
  function prepare(slot: Slot, at: number) {
    slot.destroy();
    const box = slot.el.firstElementChild as HTMLElement;
    box.innerHTML = '';
    slot.at = at;
    slot.ready = false;
    slot.failed = false;
    slot.el.style.visibility = 'hidden';
    const v = ring[((at % L) + L) % L].fullVideo!;
    let done = false;
    const ready = () => {
      if (done || !alive || slot.at !== at) return;
      done = true;
      clearTimeout(to);
      slot.ready = true;
      reportFirst(at, 'ready');
    };
    const fail = () => {
      if (done || slot.at !== at) return;
      done = true;
      clearTimeout(to);
      slot.failed = true;
      reportFirst(at, 'failed');
    };
    const to = window.setTimeout(fail, PREPARE_TIMEOUT);
    let cleanup = () => {};

    if (v.kind === 'mp4' && v.url) {
      const el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute('muted', '');
      el.setAttribute('playsinline', '');
      el.preload = 'auto';
      el.addEventListener('loadedmetadata', () => {
        el.currentTime = pickStart(v, el.duration, ratio);
        el.play().catch(fail);
      });
      el.addEventListener('playing', () => {
        if (done) return;
        el.pause();
        ready();
      });
      el.addEventListener('error', fail);
      el.src = v.url;
      box.append(el);
      slot.play = () => void el.play().catch(() => {});
      slot.pause = () => el.pause();
      cleanup = () => {
        el.pause();
        el.removeAttribute('src');
        el.load();
      };
    } else if ((v.kind === 'youtube' || v.kind === 'vimeo') && v.id) {
      const iframe = document.createElement('iframe');
      iframe.id = `ss-${++seq}`;
      iframe.title = 'Video';
      iframe.allow = 'autoplay; encrypted-media';
      iframe.setAttribute('frameborder', '0');
      iframe.tabIndex = -1;
      let player: any = null;
      if (v.kind === 'youtube') {
        const q = new URLSearchParams({
          autoplay: '0', mute: '1', controls: '0', cc_load_policy: '0', playsinline: '1', rel: '0',
          iv_load_policy: '3', disablekb: '1', enablejsapi: '1', origin: location.origin,
        });
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?${q}`;
        box.append(iframe);
        let t = -1;
        youtubeApi()
          .then((YT) => {
            if (!alive || slot.at !== at) return;
            player = new YT.Player(iframe.id, {
              events: {
                onReady: () => {
                  try {
                    player.unloadModule?.('captions');
                    player.unloadModule?.('cc');
                  } catch {
                    /* modül yok */
                  }
                  player.mute();
                  player.playVideo();
                },
                onStateChange: (e: { data: number }) => {
                  if (e.data !== YT.PlayerState.PLAYING) return;
                  player.mute();
                  if (done) return;
                  if (t < 0) {
                    t = pickStart(v, player.getDuration?.() ?? 0, ratio);
                    if (Math.abs((player.getCurrentTime?.() ?? 0) - t) > 1) {
                      player.seekTo(t, true);
                      return;
                    }
                  }
                  if ((player.getCurrentTime?.() ?? 0) < t - 1) return;
                  // YouTube duraklatılıp yeniden oynatılınca ortada kendi oynat / duraklat simgesini gösterir:
                  // hazır oynatıcı gizliyken sessiz oynamaya devam eder (kesmede yalnızca görünür olur)
                  ready();
                },
                onError: fail,
              },
            });
          })
          .catch(fail);
        slot.play = () => {
          player?.mute?.();
          player?.playVideo?.();
        };
        slot.pause = () => player?.pauseVideo?.();
      } else {
        iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?autoplay=0&muted=1&loop=1&controls=0&playsinline=1&title=0&byline=0&portrait=0&dnt=1`;
        box.append(iframe);
        vimeoApi()
          .then((Vimeo) => {
            if (!alive || slot.at !== at || !Vimeo) return fail();
            player = new Vimeo.Player(iframe);
            player.on('playing', () => {
              if (done) return;
              player.pause().catch(() => {});
              ready();
            });
            return player
              .ready()
              .then(() => player.setMuted(true))
              .then(() => player.getDuration())
              .then((d: number) => player.setCurrentTime(pickStart(v, d, ratio)))
              .then(() => player.play());
          })
          .catch(fail);
        slot.play = () => {
          player?.setMuted?.(true).catch(() => {});
          player?.play?.().catch(() => {});
        };
        slot.pause = () => player?.pause?.().catch(() => {});
      }
      cleanup = () => player?.destroy?.();
    } else fail();

    slot.destroy = () => {
      clearTimeout(to);
      try {
        cleanup();
      } catch {
        /* zaten kapalı */
      }
      box.innerHTML = '';
      slot.play = slot.pause = () => {};
    };
  }

  /** Boş ya da geride kalmış slotlara sıradaki gösterileri ver */
  let assign = 0;
  function refill() {
    for (const s of slots) {
      if (s.el === visible) continue;
      if (s.at < 0 || s.at <= shown) {
        // halkada bir sonraki, henüz hazırlanmamış sıra
        while (slots.some((x) => x.at === assign) || assign <= shown) assign++;
        prepare(s, assign++);
      }
    }
  }

  /* ---------- kesmeler ---------- */
  function cut() {
    if (!alive) return;
    shown++;
    const s = ring[((shown % L) + L) % L];
    const slot = useVideo ? slots.find((x) => x.at === shown && x.ready) : undefined;
    const prev = visible;
    if (slot) {
      slot.play();
      showEl(slot.el);
    } else {
      // sıradaki oynatıcı hazır değil: beklenmez, aynı gösterinin fotoğrafı
      photoFor(s);
      showEl(photo);
    }
    // ekrandaki oynatıcı gizlenir ve sıradaki videoyu hazırlamaya başlar
    const old = slots.find((x) => x.el === prev);
    if (old) {
      old.pause();
      old.at = -1;
    }
    if (useVideo) refill();
    const d = SS.cut * (1 + SS.variance * (Math.random() * 2 - 1));
    if (!o.reduced) timer = window.setTimeout(cut, Math.max(0.1, d) * 1000);
  }

  if (useVideo) {
    for (let k = 0; k < Math.max(1, SS.pool); k++) slots.push(makeSlot());
    // ilk sıradakiler hemen hazırlanmaya başlar (ilk 2'si yüklemenin parçası)
    slots.forEach((s, k) => prepare(s, k));
    assign = slots.length;
  }

  return {
    firstReady,
    start() {
      if (!alive || shown >= 0) return;
      cut();
    },
    destroy() {
      alive = false;
      clearTimeout(timer);
      slots.forEach((s) => s.destroy());
      o.root.innerHTML = '';
    },
  };
}
