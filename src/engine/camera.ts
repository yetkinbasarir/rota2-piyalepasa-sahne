/* Galeri konumu (S.pos). Sürükleme, tekerlek, ok tuşları ve kumanda daireleri eğri boyunca ilerletir;
   bırakınca ataletle en yakın daire ortaya oturur (settle). Etkileşim yokken auto.every sn'de bir
   sonraki daire ortaya gelir (auto). Mobilde ve prefers-reduced-motion'da kendiliğinden ilerleme yok;
   kendi kendine sunum sürerken kendiliğinden ilerlemeyi sunum yönetir. */
import { gsap } from './motion';
import type { Motion } from './motion';
import { clamp, type State } from './state';
import type { Identity } from './types';

export interface Camera {
  stop(): void;
  /** Konuma ekle (adım cinsinden; pozitif = sonraki) */
  pan(d: number): void;
  /** Bırakma hızı (adım/sn): ataletle ilerler, en yakın daireye oturur */
  fling(v: number): void;
  /** En yakın daireye otur; bias: son yöne eğilim (adım) */
  settle(bias?: number): void;
  /** Ok tuşları: bir adım (art arda basışlar birikir) */
  step(d: number): void;
  /** n. daireyi ortaya getir */
  go(n: number): void;
  /** Kendiliğinden ilerleme adımı (sunum da bunu kullanır) */
  advance(): void;
  /** Her girişte: kendiliğinden ilerleme sayacı baştan */
  touch(): void;
  /** Kendiliğinden ilerleme açık / kapalı (sunum sürerken kapalı) */
  autoplay(on: boolean): void;
  busy(): boolean;
}

export function createCamera(S: State, id: Identity, motion: Motion): Camera {
  const G = id.gallery;
  const k = motion.reduced ? 0.2 : 1;
  let active: gsap.core.Tween | null = null;
  /** Süren adımın hedefi (art arda basışlar birikir) */
  let target: number | null = null;
  // ekran koruyucu kalkana kadar kapalı (index.ts açar)
  let autoOn = false;
  let timer: gsap.core.Tween | null = null;

  const busy = () => !!active && active.isActive();
  const run = (to: number, dur: number, ease: string) => {
    active?.kill();
    target = to;
    active = gsap.to(S, { pos: to, duration: dur * k, ease, onComplete: () => void (target = null) });
  };
  const settleTo = (to: number) => run(to, G.settle.dur, G.settle.ease);

  /** Kendiliğinden ilerleme: son girişten auto.every sn sonra, sonra her auto.every sn'de bir */
  function arm() {
    timer?.kill();
    timer = gsap.delayedCall(G.auto.every, () => {
      const idle = autoOn && !S.mobile && !motion.reduced && !S.pressed && !S.open && !S.full && !S.paused && !document.hidden && !busy();
      if (idle) api.advance();
      arm();
    });
  }

  const api: Camera = {
    stop() {
      active?.kill();
      active = null;
      target = null;
    },
    pan(d) {
      api.stop();
      S.pos += d;
    },
    fling(v) {
      const t = G.throw;
      const go = Math.round(S.pos + clamp(v * t.time, -t.max, t.max));
      settleTo(go);
    },
    settle(bias = 0) {
      const to = Math.round(S.pos + bias);
      if (Math.abs(to - S.pos) < 1e-3) {
        S.pos = to;
        return;
      }
      settleTo(to);
    },
    step(d) {
      const base = target !== null && busy() ? target : Math.round(S.pos);
      settleTo(base + d);
    },
    go: (n) => settleTo(n),
    advance() {
      const base = target !== null && busy() ? target : Math.round(S.pos);
      run(base + 1, G.auto.dur, G.auto.ease);
    },
    touch: arm,
    autoplay(on) {
      autoOn = on;
      arm();
    },
    busy,
  };
  arm();
  return api;
}
