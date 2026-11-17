/* Kendi kendine sunum. Kullanıcı bir süre hiçbir etkileşim yapmazsa başlar ve döngüde çalışır:
   1. grid'de boşta akış (presentGrid sn)
   2. halka sırasında sıradaki öğe (ilk turda ekranın ortasına en yakın öğe); duvar sakin bir
      hareketle kayıp öğeyi ortadaki kolonlardan birine getirir
   3. öğe mevcut açılma hareketiyle açılır, presentOpen sn açık kalır
   4. mevcut tam ekran geçişi; videosu varsa mevcut davranışla oynar ve mevcut dönüşle grid'e dönülür,
      videosu yoksa (ya da video başlamazsa) fotoğraf presentPhoto sn kalır, sonra aynı dönüş
   5. grid'e dönüşten sonra döngü 1. adımdan tekrar başlar.
   Etkileşim (tıklama, dokunma, tekerlek/trackpad, sürükleme, klavye, kumanda; farenin yalnızca
   hareketi sayılmaz) olduğu anda sunum durur, bütün zamanlayıcıları iptal edilir; etkileşimin
   kendisi normal davranışını yapar. Son etkileşimden presentResume sn sonra yeniden başlar: açık öğe
   ya da tam ekrandaysa önce grid'e dönülür. prefers-reduced-motion açıkken çalışmaz.
   Halka sırası ve son sunulan öğe yalnızca bellekte tutulur.
   Mobilde (tek kolon) hiç çalışmaz: zamanlayıcı kurulmaz; ekran mobile geçerse çalışan sunum hemen
   durdurulur, mobilden masaüstüne geçilince masaüstü kuralı geçerli olur (refresh). */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Camera } from './camera';
import type { Wall } from './wall';
import type { Commands } from './commands';
import type { Identity } from './types';
import { snapCamForward, viewCols, type State } from './state';

export function startPresentation(o: { S: State; camera: Camera; wall: Wall; cmd: Commands; motion: Motion; id: Identity }) {
  const { S, camera, wall, cmd, motion } = o;
  if (motion.reduced) return { refresh() {} };
  const sec = (k: Parameters<Motion['dur']>[0]) => motion.dur(k);

  /** Son sunulan öğenin halka sırası (2·kolon + satır); null: henüz sunulmadı */
  let last: number | null = null;
  let running = false;
  /** Sunuma ait bütün zamanlayıcılar / animasyonlar (durunca hepsi iptal) */
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
    // açık öğe ya da tam ekrandaysa önce grid'e dön
    if (S.full) wall.fullscreen(false);
    else if (S.open) wall.close();
    until(settled, () => later(sec('open'), grid));
  }

  // 1. grid'de boşta akış
  function grid() {
    later(sec('presentGrid'), pick);
  }

  // 2. sıradaki öğe; duvar onu ortadaki kolonlardan birine getirir
  function pick() {
    let q: number;
    if (last === null) {
      const i = Math.floor(S.cx + viewCols(S) / 2);
      q = 2 * i;
    } else q = last + 1;
    let i = Math.floor(q / 2);
    const j = q - 2 * i;
    // duvar hiç geri gitmez: öğe solda kalıyorsa halkada ileride (sağda) gelen aynı öğenin kopyasına git
    const P = wall.ringPeriod();
    const centerOf = (col: number) => snapCamForward(S, col + 0.5 - viewCols(S) / 2);
    const leftEdge = (col: number) => (col - S.cx) * S.stepX;
    while (leftEdge(i) < S.margin - 1 && centerOf(i) < S.cx) i += P;
    q = 2 * i + j;
    last = q;
    const x = (i - S.cx) * S.stepX;
    // ortadaki n tam kolondan birinde mi
    const inView = x >= S.margin - 1 && x + S.cw <= S.margin + S.cols * S.stepX - S.gap + 1;
    // web: ortadaki 4 kolon içindeyse kaydırma yok; değilse öğe ortaya en yakın kolona gelir
    if (inView && !S.mobile) return open(i, j);
    const to = Math.max(S.cx, centerOf(i));
    // süre mesafeyle uzar (bir ekran genişliğinden uzaksa), en fazla moveMaxFactor katı; aynı yönde hızlanıp yavaşlar
    const dist = (to - S.cx) / Math.max(1, viewCols(S));
    const dur = sec('presentMove') * Math.min(o.id.wall.moveMaxFactor, Math.max(1, dist));
    camera.stop();
    const tw = gsap.to(S, { cx: to, duration: dur, ease: motion.ease.page });
    camera.run(tw);
    calls.push(tw);
    later(dur, () => open(i, j));
  }

  // 3. açılır (kullanıcı tıklamasıyla aynı yol: panel başlığı, metni, butonları ve sayacı aynı sırayla),
  //    bir süre açık kalır
  function open(i: number, j: number) {
    cmd.openItem(i, j);
    later(sec('open') + sec('presentOpen'), full);
  }

  // 4. tam ekran: video varsa mevcut davranış (oynar, süre dolunca kendiliğinden döner);
  //    yoksa ya da başlamazsa fotoğraf bir süre kalır, sonra aynı dönüş
  function full() {
    if (!S.open) return grid();
    cmd.fullscreen();
    let photoFor = 0;
    const tick = () => {
      if (!S.full) return until(settled, () => later(sec('open'), grid)); // 5. grid'e dönüldü
      photoFor = wall.videoActive() ? 0 : photoFor + 0.2;
      if (photoFor >= sec('presentPhoto')) wall.fullscreen(false);
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
    if (running) {
      running = false;
      cancel();
    }
  }
  function activity() {
    stop();
    schedule(sec(last === null ? 'presentIdle' : 'presentResume'));
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
        schedule(sec(last === null ? 'presentIdle' : 'presentResume'));
      }
    },
  };
}
