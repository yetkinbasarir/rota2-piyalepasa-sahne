/* Kamera (S.cx — sütun). Duvar yalnızca yatayda, sonsuz kayar: sürükleme, tekerlek, parmak;
   bırakınca InertiaPlugin ile savrulur. Grid her zaman sağdan sola akar: sürükleme, tekerlek ya da
   klavye kaydırması bittiği anda akış kaldığı yerden sürer (bekleme yok). Fare grid'in üzerindeyken
   yavaşlar; öğe açıkken, tam ekranda ve grid'e dönüş hareketi sürerken durur. Bütün hız geçişleri
   yumuşaktır (driftRamp). prefers-reduced-motion'da akış kapalıdır.
   Kamera ve açılma hareketleri kimliğin tek "move" eğrisini (ease-in) kullanır. */
import { gsap } from './motion';
import type { Motion } from './motion';
import { snapCam, type State } from './state';
import type { Identity } from './types';

export interface Camera {
  /** Kamerayı yöneten animasyonu devral */
  run(a: gsap.core.Animation | null): void;
  stop(): void;
  /** Yatay kaydırma (px; pozitif = içerik sağa) */
  pan(dx: number): void;
  /** Bırakma hızı (px/s): ataletle kayar, en yakın kolona oturur */
  fling(vx: number): void;
  /** Tekerlek bitince en yakın kolona yumuşakça otur */
  settle(): void;
  /** Bir kart kaydır */
  step(di: number): void;
  /** Hedef sütuna git (açılma timeline'ının içinde) */
  to(cx: number): gsap.core.Tween;
}

export function createCamera(S: State, id: Identity, motion: Motion): Camera {
  let active: gsap.core.Animation | null = null;
  let speed = 0;
  /** Süren klavye adımının hedefi (art arda basışlar birikir) */
  let stepTarget: number | null = null;

  const busy = () => !!active && active.isActive();

  gsap.ticker.add((_t, dt) => {
    if (motion.reduced) return;
    // kullanıcı kaydırırken (sürükleme / savrulma / adım / sunum kaydırması) akış ona bırakılır
    if (S.paused || S.pressed || busy()) {
      speed = 0;
      return;
    }
    // hedef hız: açık öğe, tam ekran, grid'e dönüş hareketi ya da gizli sekmede 0; fare üzerindeyse yavaş
    const W = id.wall;
    // mobilde kendiliğinden akış yok: grid yalnızca kullanıcının dokunuşuyla kayar
    const target = S.mobile || S.open || S.full || S.merging || document.hidden ? 0 : W.drift * (S.hover ? W.driftHover : 1);
    // yumuşak geçiş: yaklaşık driftRamp saniyede hedefe varır
    const k = 1 - Math.exp(-dt / ((motion.dur('driftRamp') * 1000) / 4));
    speed += (target - speed) * k;
    if (Math.abs(speed) < 1e-5 && target === 0) speed = 0;
    // sağdan sola = kamera sağa
    S.cx += (speed * dt) / 1000;
  });

  const api: Camera = {
    run(a) {
      if (active && active !== a) active.kill();
      active = a;
    },
    stop() {
      active?.kill();
      active = null;
      gsap.killTweensOf(S, 'cx');
    },
    pan(dx) {
      api.stop();
      S.cx -= dx / S.stepX;
    },
    fling(vx) {
      api.stop();
      api.run(
        gsap.to(S, {
          inertia: {
            cx: { velocity: -vx / S.stepX, end: (v: number) => snapCam(S, v) },
            duration: { min: 0.3, max: motion.reduced ? 0.3 : 1.8 },
            resistance: 1.4,
          },
        }),
      );
    },
    settle() {
      const to = snapCam(S, S.cx);
      if (Math.abs(to - S.cx) < 1e-3) return;
      api.stop();
      api.run(gsap.to(S, { cx: to, duration: motion.dur('step'), ease: motion.ease.move }));
    },
    step(di) {
      const base = stepTarget !== null && busy() ? stepTarget : snapCam(S, S.cx);
      api.stop();
      stepTarget = base + di;
      api.run(gsap.to(S, { cx: stepTarget, duration: motion.dur('step'), ease: motion.ease.move }));
    },
    to: (cx) => gsap.to(S, { cx, duration: motion.dur('step'), ease: motion.ease.move }),
  };
  return api;
}
