/* Tam ekran videosu. Yalnızca tam ekranda oynar; aynı anda en fazla bir video yüklüdür.
   Tam ekran açılınca video fotoğrafın arkasında (görünmez katmanda) yüklenmeye başlar; gerçekten
   oynamaya başladığı an (YouTube IFrame API: PLAYING, Vimeo Player SDK: 'playing', mp4: 'playing')
   opaklıkla videoya geçilir. Belirli süre içinde başlamazsa katman kaldırılır, fotoğraf kalır.
   Video her zaman 16:9 kabul edilir ve ekranı kaplayacak şekilde ölçeklenip ortalanır (cover).
   Bütün videolar cover boyutunun ötesinde büyütülür (oynatıcı yazıları, gömülü alt yazılar ekran dışında).
   YouTube'da PLAYING sonrası fotoğraf bir süre daha üstte kalır, otomatik altyazılar kapalıdır, video
   bitişe gelmeden başlangıca sarılır.
   Katman tıklamaları geçirir (pointer-events: none); tam ekrandan çıkış davranışı aynı kalır.
   Ses: video sessiz başlar; görünür hale geldiği anda ses 0'dan hedef seviyeye yumuşakça yükselir,
   çıkışta önce kısılır. Tarayıcı sesli oynatmayı reddederse video sessiz devam eder.
   Başlangıç: "baslangic" > 0 ise o saniye; 0 ise süre × startRatio (tam saniye; süre okunamazsa 0).
   Fotoğraf, video bu noktadan gerçekten oynamaya başlayana kadar üstte kalır; başa sarma da buraya döner.
   prefers-reduced-motion açıkken video otomatik başlamaz. */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { FullVideo, Identity } from './types';

export interface FullVideoPlayer {
  /** Açılmış öğe: oynatıcıyı arka planda (görünmez, gerçek boyutunda) kur ve başlangıca hazırla; oynamaz */
  prepare(v: FullVideo | undefined): void;
  /** Tam ekran: videoyu oynat (hazırsa tıklamanın içinde eşzamanlı; sesi açmayı dener) */
  start(v: FullVideo | undefined, onShown?: () => void): void;
  /** Sesi kıs, sonra videodan fotoğrafa geri geç (oynuyorsa opaklıkla); bitince çözülür */
  hide(): Promise<void>;
  /** iframe / video'yu tamamen kaldır */
  remove(): void;
  /** Tam ekranda yüklü (yükleniyor ya da oynuyor) bir video var mı */
  active(): boolean;
  /** Yatay telefon katmanı: on → duraklat ve sesi kapat; off → sessiz olarak kaldığı yerden sürdür */
  suspend(on: boolean): void;
}

/* ---------- dış betikler: yalnızca gerektiğinde, bir kez ---------- */
const scripts = new Map<string, Promise<void>>();
function loadScript(src: string) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error(src));
        document.head.append(s);
      }),
    );
  }
  return scripts.get(src)!;
}

type W = Window & { YT?: any; Vimeo?: any; onYouTubeIframeAPIReady?: () => void };
let ytReady: Promise<any> | null = null;
export function youtubeApi() {
  const w = window as W;
  if (!ytReady) {
    ytReady = new Promise((res, rej) => {
      if (w.YT?.Player) return res(w.YT);
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        res(w.YT);
      };
      loadScript('https://www.youtube.com/iframe_api').catch(rej);
    });
  }
  return ytReady;
}
export const vimeoApi = () => loadScript('https://player.vimeo.com/api/player.js').then(() => (window as W).Vimeo);

let seq = 0;

/* Ses: oynatıcı açılmış öğede önceden hazırlanır; tam ekranı açan tıklamanın işleyicisi içinde,
   eşzamanlı olarak ses açılır (seviye 0) ve oynatılır, sonra ses yükselme kuralıyla hedefe çıkar.
   Reddedilirse ya da video hemen durursa sessize alınıp sessiz oynatmaya devam edilir.
   iOS: ses seviyesi değiştirilemez; ses tıklamanın içinde doğrudan tam seviyede açılır (yükselme yok).
   Video playsinline; YouTube PAUSED / CUED durumuna düşerse sessiz olarak yeniden oynatılır.
   Tıklama yoksa (kendi kendine sunum) video sessiz oynar, ses oynamaya başladıktan sonra denenir.
   Aralık: "bitis" verilmişse (başlangıç > 0, bitiş > başlangıç) yalnızca bu aralık oynar; oynatma
   zamanı 100 ms'de bir kontrol edilir, bitişe gelince başlangıca sarılır (fotoğrafa dönülmez, ses kesilmez). */
const IOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Şu an bir kullanıcı dokunuşunun işleyicisi içinde miyiz */
const inGesture = () => !!(navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive;

export function createFullVideo(o: { root: HTMLElement; motion: Motion; id: Identity }): FullVideoPlayer {
  const { motion } = o;
  type Cur = {
    v: FullVideo;
    wrap: HTMLElement;
    /** Tam ekranda oynatma istendi */
    started: boolean;
    shown: boolean;
    /** Oynatıcı hazır (başlangıca konumlandı) */
    ready: boolean;
    /** Hazır olmadan oynatma istendiyse: tıklamanın içinde mi istendi */
    pending: null | { gesture: boolean };
    /** Sesin açıldığı (denendiği) an; 0: sessiz */
    unmutedAt: number;
    timer: number;
    /** Askıda (yatay telefon katmanı): duraklatma olayları sessiz yeniden oynatmayı tetiklemez */
    held: boolean;
    pause: () => void;
    onShown?: () => void;
    dispose: () => void;
    /** Oynat (gesture: tıklamanın içinde — ses açılır) */
    play: (gesture: boolean) => void;
    /** Ses seviyesini uygula (0–1); ses kapalıysa açmayı dener */
    volume: (v: number) => void;
    vol: { v: number };
    reveal: () => void;
  };
  let cur: Cur | null = null;
  const V = o.id.video;
  const fadeSound = (c: Cur, to: number, dur: number) =>
    new Promise<void>((res) => {
      gsap.killTweensOf(c.vol);
      gsap.to(c.vol, {
        v: to, duration: dur, ease: V.soundEase,
        onUpdate: () => {
          try {
            c.volume(c.vol.v);
          } catch {
            /* ses reddedildi: sessiz devam */
          }
        },
        onComplete: () => res(),
      });
    });

  function remove() {
    if (!cur) return;
    const c = cur;
    cur = null;
    clearTimeout(c.timer);
    gsap.killTweensOf(c.wrap);
    gsap.killTweensOf(c.vol);
    try {
      c.dispose();
    } catch {
      /* oynatıcı zaten kapanmış olabilir */
    }
    c.wrap.remove();
  }

  /** Oynatıcı hazır: bekleyen oynatma isteği varsa hemen uygula */
  const markReady = (me: Cur) => {
    if (cur !== me || me.ready) return;
    me.ready = true;
    if (me.pending) {
      const g = me.pending.gesture;
      me.pending = null;
      me.play(g);
    }
  };

  /** Oynatıcıyı kur (görünmez, gerçek boyutunda; oynamaz) ve başlangıca hazırla */
  function prepare(v: FullVideo | undefined) {
    if (cur && cur.v === v) return;
    remove();
    if (!v || motion.reduced) return;
    const wrap = document.createElement('div');
    wrap.className = 'fv';
    wrap.style.opacity = '0';
    const box = document.createElement('div');
    box.className = 'fv-in';
    wrap.append(box);
    o.root.append(wrap);
    const me: Cur = {
      v, wrap, started: false, shown: false, ready: false, pending: null, unmutedAt: 0, timer: 0, held: false, pause: () => {},
      dispose: () => {}, play: () => {}, volume: () => {}, vol: { v: 0 }, reveal: () => {},
    };
    cur = me;

    // oynamaya gerçekten başladığında fotoğraftan videoya geç
    me.reveal = () => {
      if (cur !== me || me.shown || !me.started) return;
      me.shown = true;
      gsap.to(wrap, { opacity: 1, duration: motion.dur('videoIn'), ease: motion.ease.fade, onComplete: () => cur === me && me.onShown?.() });
      // görünür olurken ses 0'dan hedef seviyeye yükselir (iOS'ta ses tıklamanın içinde tam seviyede açılır)
      if (!IOS) fadeSound(me, V.volume, motion.dur('soundIn'));
    };
    /** Başlangıç noktası: "baslangic" > 0 ise o; değilse süre × oran (süre bilinmiyorsa 0) */
    const startAt = (d: number) => (v.start > 0 ? v.start : d > 0 && Number.isFinite(d) ? Math.round(d * V.startRatio) : 0);
    // oynama başladı: bekleme sınırı artık geçerli değil
    const started = () => clearTimeout(me.timer);

    if (v.kind === 'mp4' && v.url) {
      const el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute('muted', '');
      el.setAttribute('playsinline', '');
      el.preload = 'auto';
      let from = -1;
      el.addEventListener('loadedmetadata', () => {
        from = startAt(el.duration);
        if (from > 0) el.currentTime = from;
        markReady(me);
      });
      // başlangıç noktasından oynayınca fotoğraftan geçilir
      const check = () => {
        if (!me.started || from < 0 || el.paused || el.seeking || el.currentTime < from - 1) return;
        started();
        me.reveal();
      };
      el.addEventListener('playing', check);
      el.addEventListener('seeked', check);
      el.addEventListener('timeupdate', check);
      // ses açılınca durursa (ya da reddedilirse): sessize al, sessiz oynatmaya devam et
      const quiet = () => {
        if (cur !== me || !me.started) return;
        el.muted = true;
        me.unmutedAt = 0;
        el.play().catch(() => {});
      };
      el.addEventListener('pause', () => {
        if (cur === me && me.started && !me.held && !el.ended) quiet();
      });
      me.pause = () => {
        el.muted = true;
        el.pause();
      };
      me.play = (gesture) => {
        if (gesture) {
          // tıklamanın içinde, eşzamanlı: ses açık (iOS'ta tam seviye, diğerlerinde 0'dan yükselir)
          el.muted = false;
          if (!IOS) el.volume = 0;
          me.unmutedAt = performance.now();
        } else el.muted = true;
        el.play().catch(quiet);
      };
      me.volume = (x) => {
        if (IOS) return;
        el.volume = Math.min(1, Math.max(0, x));
        if (!me.unmutedAt && x > 0) {
          // tıklamasız (sunum): ses oynamaya başladıktan sonra denenir
          me.unmutedAt = performance.now();
          el.muted = false;
          el.play().catch(quiet);
        }
      };
      el.src = v.url;
      box.append(el);
      // aralık döngüsü: bitişe gelince başlangıca
      const span = v.end
        ? window.setInterval(() => {
            if (me.started && !el.paused && el.currentTime >= v.end!) el.currentTime = v.start;
          }, 100)
        : 0;
      me.dispose = () => {
        clearInterval(span);
        el.pause();
        el.removeAttribute('src');
        el.load();
      };
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.id = `fv-${++seq}`;
    iframe.title = 'Video';
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.setAttribute('frameborder', '0');
    iframe.tabIndex = -1;

    if (v.kind === 'youtube' && v.id) {
      // oynatıcının kendi loop / playlist parametreleri yok: başa sarmayı biz yaparız; kendiliğinden oynamaz
      const q = new URLSearchParams({
        autoplay: '0', mute: '1', controls: '0', cc_load_policy: '0',
        playsinline: '1', rel: '0', iv_load_policy: '3', disablekb: '1', enablejsapi: '1', origin: location.origin,
      });
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?${q}`;
      box.append(iframe);
      let player: any = null;
      let hold = 0;
      let watch = 0;
      const tail = o.id.video.youtubeTail;
      /** Hesaplanan başlangıç (-1: henüz süre okunmadı); start parametresine güvenilmez, seekTo ile gidilir */
      let from = -1;
      const position = (cue = false) => {
        if (from >= 0 || !player?.getDuration) return;
        const d = player.getDuration() ?? 0;
        if (!(d > 0) && v.start <= 0) return; // süre henüz yok: bir sonraki olayda yeniden denenir
        from = startAt(d);
        if (from > 0) {
          if (cue) player.cueVideoById({ videoId: v.id, startSeconds: from });
          else player.seekTo(from, true);
        }
      };
      const rewind = () => {
        player?.seekTo?.(Math.max(0, from), true);
        player?.playVideo?.();
      };
      const quiet = () => {
        gsap.killTweensOf(me.vol);
        me.unmutedAt = 0;
        player?.mute?.();
        player?.playVideo?.();
      };
      me.pause = () => {
        player?.mute?.();
        player?.pauseVideo?.();
      };
      me.play = (gesture) => {
        if (!player?.playVideo) return;
        if (gesture) {
          // tıklamanın içinde, eşzamanlı: sesi aç (iOS'ta tam seviye), oynat
          player.unMute();
          if (!IOS) player.setVolume(0);
          me.unmutedAt = performance.now();
        } else player.mute();
        player.playVideo();
      };
      me.volume = (x) => {
        if (!player?.setVolume || IOS) return;
        if (!me.unmutedAt && x > 0) {
          // tıklamasız (sunum): ses oynamaya başladıktan sonra denenir
          me.unmutedAt = performance.now();
          player.unMute();
        }
        if (me.unmutedAt) player.setVolume(Math.round(x * 100));
      };
      youtubeApi()
        .then((YT) => {
          if (cur !== me) return;
          // otomatik altyazılar kapalı: altyazı modülü boşaltılır
          const noCaptions = () => {
            try {
              player?.unloadModule?.('captions');
              player?.unloadModule?.('cc');
            } catch {
              /* modül yok */
            }
          };
          player = new YT.Player(iframe.id, {
            events: {
              onReady: () => {
                noCaptions();
                // süre biliniyorsa başlangıca hazırla (oynatmadan)
                position(true);
                markReady(me);
              },
              onStateChange: (e: { data: number }) => {
                if (!me.started || me.held) return;
                if (e.data === YT.PlayerState.PLAYING) {
                  position();
                  // başlangıç noktasından oynamıyorsa (henüz) oraya git ve bekle
                  if (from < 0) from = 0; // süre okunamadı: başlangıç 0
                  if ((player.getCurrentTime?.() ?? 0) < from - 1) {
                    player.seekTo(from, true);
                    return;
                  }
                  started();
                  noCaptions();
                  // oynatıcının açılış yazıları kaybolana kadar fotoğraf üstte kalır, sonra geçilir
                  if (!me.shown && !hold) hold = window.setTimeout(me.reveal, motion.dur('youtubeHold') * 1000);
                } else if (IOS && (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED)) {
                  // iOS: duraklama / oynat simgesi kalmasın — sessiz olarak yeniden oynat
                  player.mute();
                  player.playVideo();
                } else if (e.data === YT.PlayerState.PAUSED && !player.isMuted?.()) {
                  // sesliyken durdu (tarayıcı sesli oynatmayı reddetti): sessize al, sessiz devam
                  quiet();
                } else if (e.data === YT.PlayerState.ENDED || e.data === YT.PlayerState.PAUSED) {
                  rewind();
                }
              },
            },
          });
          // aralık varsa: bitişe gelince başlangıca (100 ms'de bir); yoksa sona gelmeden ("tail" sn kala) başa sar
          watch = v.end
            ? window.setInterval(() => {
                if (!me.started) return;
                const t = player?.getCurrentTime?.() ?? 0;
                if (t >= v.end!) player.seekTo(v.start, true);
              }, 100)
            : window.setInterval(() => {
                if (!me.started) return;
                const d = player?.getDuration?.() ?? 0;
                const t = player?.getCurrentTime?.() ?? 0;
                if (d > 0 && from >= 0 && t >= Math.max(from + 1, d - tail)) rewind();
              }, 250);
        })
        .catch(() => {});
      me.dispose = () => {
        clearTimeout(hold);
        clearInterval(watch);
        player?.destroy?.();
      };
      return;
    }

    if (v.kind === 'vimeo' && v.id) {
      // kendiliğinden oynamaz (autoplay=0), sessiz, döngü; arayüz gizli
      iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?autoplay=0&muted=1&loop=1&controls=0&playsinline=1&title=0&byline=0&portrait=0&dnt=1`;
      box.append(iframe);
      let player: any = null;
      let from = -1;
      let span = 0;
      vimeoApi()
        .then((Vimeo) => {
          if (cur !== me || !Vimeo) return;
          player = new Vimeo.Player(iframe);
          const quiet = () => {
            gsap.killTweensOf(me.vol);
            me.unmutedAt = 0;
            player.setMuted(true).catch(() => {});
            player.play().catch(() => {});
          };
          me.play = (gesture) => {
            if (gesture) {
              // tıklamanın içinde, eşzamanlı (promise'ler beklenmez)
              if (!IOS) player.setVolume(0).catch(() => {});
              player.setMuted(false).catch(() => {});
              me.unmutedAt = performance.now();
            } else player.setMuted(true).catch(() => {});
            player.play().catch(quiet);
          };
          me.volume = (x) => {
            if (IOS) return;
            if (!me.unmutedAt && x > 0) {
              me.unmutedAt = performance.now();
              player.setMuted(false).catch(() => {});
            }
            player.setVolume(Math.min(1, Math.max(0, x))).catch(() => {});
          };
          // ses açılınca tarayıcı durdurursa: sessiz devam
          player.on('pause', () => {
            if (cur !== me || !me.started || me.held) return;
            quiet();
          });
          me.pause = () => {
            player.setMuted(true).catch(() => {});
            player.pause().catch(() => {});
          };
          // başlangıç noktası: süre okunur, oraya gidilir; hazır
          player
            .ready()
            .then(() => player.getDuration())
            .then((d: number) => {
              from = startAt(d);
              return from > 0 ? player.setCurrentTime(from) : null;
            })
            .catch(() => {
              from = Math.max(0, v.start);
            })
            .then(() => markReady(me));
          const check = (e?: { seconds?: number }) => {
            if (from < 0 || !me.started) return;
            const go = (t: number) => {
              if (t < from - 1 || cur !== me) return;
              started();
              me.reveal();
            };
            if (e?.seconds !== undefined) go(e.seconds);
            else player.getCurrentTime().then(go).catch(() => {});
          };
          player.on('playing', () => check());
          player.on('timeupdate', check);
          // aralık döngüsü: bitişe gelince başlangıca (100 ms'de bir)
          if (v.end) {
            span = window.setInterval(() => {
              if (!me.started || cur !== me) return;
              player.getCurrentTime().then((t: number) => {
                if (t >= v.end!) player.setCurrentTime(v.start).catch(() => {});
              }).catch(() => {});
            }, 100);
          }
        })
        .catch(() => {});
      me.dispose = () => {
        clearInterval(span);
        player?.destroy?.();
      };
      return;
    }
    remove();
  }

  /** Tam ekran: videoyu oynat. Tıklamanın işleyicisi içinde çağrılırsa ses eşzamanlı açılır */
  function start(v: FullVideo | undefined, onShown?: () => void) {
    if (!v || motion.reduced) {
      remove();
      return;
    }
    // hazır oynatıcı yoksa (ya da başka videoysa) mevcut yolla kur
    if (!cur || cur.v !== v) prepare(v);
    const me = cur;
    if (!me) return;
    me.started = true;
    me.onShown = onShown;
    const gesture = inGesture();
    // süre içinde oynama başlamazsa fotoğraf kalır, katman kaldırılır
    clearTimeout(me.timer);
    me.timer = window.setTimeout(() => {
      if (cur === me && !me.shown) remove();
    }, motion.dur('videoTimeout') * 1000);
    if (me.ready) me.play(gesture);
    else me.pending = { gesture };
  }

  function suspend(on: boolean) {
    const me = cur;
    if (!me || !me.started) return;
    if (on) {
      me.held = true;
      gsap.killTweensOf(me.vol);
      me.unmutedAt = 0;
      me.vol.v = 0;
      try {
        me.pause();
      } catch {
        /* oynatıcı hazır değil */
      }
    } else {
      me.held = false;
      // sessiz devam: ses ancak yeni bir dokunuşla açılır
      if (me.ready) me.play(false);
    }
  }

  return {
    prepare,
    start,
    suspend,
    remove,
    active: () => !!cur && cur.started,
    hide() {
      if (!cur) return Promise.resolve();
      if (!cur.shown) {
        remove();
        return Promise.resolve();
      }
      const me = cur;
      const wrap = me.wrap;
      // önce ses yavaşça kısılır, sonra videodan fotoğrafa geçilir
      return fadeSound(me, 0, motion.dur('soundOut')).then(
        () =>
          new Promise<void>((res) => {
            if (cur !== me) return res();
            gsap.to(wrap, { opacity: 0, duration: motion.dur('videoOut'), ease: motion.ease.fade, overwrite: true, onComplete: () => res() });
          }),
      );
    },
  };
}
