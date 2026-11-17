/* Kendi kendine sunum. Kullanıcı bir süre hiçbir etkileşim yapmazsa başlar ve döngüde çalışır:
   1. galeride auto.every sn bekler
   2. kendiliğinden ilerleme adımıyla sonraki daire ortaya gelir (auto.dur sn)
   3. presentOpen sn sonra ortadaki daire iris ile açılır (kullanıcı tıklamasıyla aynı yol)
   4. videosu varsa mevcut davranışla oynar ve mevcut dönüşle galeriye dönülür; videosu yoksa
      (ya da video başlamazsa) fotoğraf presentPhoto sn kalır, sonra aynı dönüş
   5. dönüşten sonra döngü 1. adımdan tekrar başlar.
   Sunum sürerken kendiliğinden ilerlemeyi sunum yönetir. Etkileşim (tıklama, dokunma, tekerlek /
   trackpad, sürükleme, klavye, kumanda; farenin yalnızca hareketi sayılmaz) olduğu anda sunum durur,
   bütün zamanlayıcıları iptal edilir; etkileşimin kendisi normal davranışını yapar. Son etkileşimden
   presentResume sn sonra yeniden başlar: tam ekrandaysa önce galeriye dönülür.
   prefers-reduced-motion açıkken ve mobilde (tek kolon) çalışmaz. */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Camera } from './camera';
import type { Gallery } from './gallery';
import type { Commands } from './commands';
import type { Identity } from './types';
import type { State } from './state';

export function startPresentation(o: { S: State; camera: Camera; gallery: Gallery; cmd: Commands; motion: Motion; id: Identity }) {
  const { S, camera, gallery, cmd, motion, id } = o;
  if (motion.reduced) return { refresh() {} };
  const sec = (k: Parameters<Motion['dur']>[0]) => motion.dur(k);
  const A = id.gallery.auto;

  let started = false;
  let running = false;
  /** Sunuma ait bütün zamanlayıcılar (durunca hepsi iptal) */
  let calls: gsap.core.Animation[] = [];
  let idle: gsap.core.Tween | null = null;

  const later = (s: number, f: () => void) => {
    const c = gsap.delayedCall(s, f);
    calls.push(c);
    return c;
  };
  /** Koşul sağlanana kadar bekle (kısa aralıklarla yokla) */
  const until = (test: () => boolean, f: () => void) => {
    const tick = () => (test() ? f() : later(0.2, tick));
    tick();
  };
  const settled = () => !S.open && !S.full;

  function cancel() {
    calls.forEach((c) => c.kill());
    calls = [];
  }

  /* ---------- döngü ---------- */
  function begin() {
    running = true;
    started = true;
    camera.autoplay(false);
    if (S.full) gallery.close();
    until(settled, wait);
  }
  // 1. galeride bekleme
  function wait() {
    later(A.every, next);
  }
  // 2. sonraki daire ortaya gelir
  function next() {
    camera.advance();
    later(A.dur + sec('presentOpen'), open);
  }
  // 3–4. açılır; video varsa oynar (süre dolunca kendiliğinden döner), yoksa fotoğraf bir süre kalır
  function open() {
    cmd.openCenter();
    if (!S.full) return wait();
    let photoFor = 0;
    const tick = () => {
      if (!S.full) return until(settled, wait); // 5. galeriye dönüldü
      photoFor = gallery.videoActive() ? 0 : photoFor + 0.2;
      if (photoFor >= sec('presentPhoto')) gallery.close();
      later(0.2, tick);
    };
    later(0.2, tick);
  }

  /* ---------- etkileşim ---------- */
  function schedule(s: number) {
    idle?.kill();
    idle = null;
    // mobilde başlatma zamanlayıcısı kurulmaz
    if (S.mobile) return;
    idle = gsap.delayedCall(s, () => {
      if (!S.mobile) begin();
    });
  }
  function stop() {
    if (!running) return;
    running = false;
    cancel();
    camera.autoplay(true);
  }
  function activity() {
    stop();
    schedule(sec(started ? 'presentResume' : 'presentIdle'));
  }
  const opts = { capture: true, passive: true } as const;
  for (const t of ['pointerdown', 'touchstart', 'wheel', 'keydown']) addEventListener(t, activity, opts);
  schedule(sec('presentIdle'));

  return {
    /** Ekran ölçüsü değişince: mobile geçildiyse sunum hemen durur ve zamanlayıcılar iptal edilir;
        masaüstüne geçildiyse masaüstü kuralıyla zamanlayıcı kurulur */
    refresh() {
      if (S.mobile) {
        stop();
        idle?.kill();
        idle = null;
      } else if (!running && !idle?.isActive()) {
        schedule(sec(started ? 'presentResume' : 'presentIdle'));
      }
    },
  };
}
