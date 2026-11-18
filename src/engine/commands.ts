/* Komut katmanı: işaretçi, dokunma, tekerlek, klavye ve kumanda girişlerinin tamamı
   yalnızca bu komutları çağırır. Yön kuralı: aşağı / sağ = sonraki daire ortaya gelir. */
import type { Camera } from './camera';
import type { Gallery } from './gallery';
import type { State } from './state';
import type { Identity } from './types';

export interface Commands {
  /** Her girişte çağrılır: kendiliğinden ilerleme sayacı baştan */
  input(): void;
  press(): void;
  release(): void;
  /** Sürükleme (px): web'de baskın eksen, mobilde yalnızca dikey */
  pan(dx: number, dy: number): void;
  /** Bırakma hızı (px/sn) */
  fling(vx: number, vy: number): void;
  /** Tekerlek (px): baskın eksen */
  wheel(dx: number, dy: number): void;
  /** Tekerlek bitince en yakın daireye otur (son yöne eğilimle) */
  settle(): void;
  /** Ok tuşları / kumanda: +1 sonraki, −1 önceki */
  arrow(d: 1 | -1): void;
  tap(x: number, y: number): void;
  /** Ana daireyi aç (kendi kendine sunum da bunu kullanır) */
  openMain(): void;
  /** Geri: tam ekrandan galeriye */
  close(): void;
  isOpen(): boolean;
}

export function createCommands(o: { S: State; id: Identity; camera: Camera; gallery: Gallery }): Commands {
  const { S, id, camera, gallery } = o;
  const G = id.gallery;
  const dominant = (a: number, b: number) => (Math.abs(a) >= Math.abs(b) ? a : b);
  /** Bir adımlık sürükleme mesafesi (px): ana daire ile sonraki dairenin duruş noktaları arası */
  const stepPx = () => Math.max(1, gallery.step());
  const drag = (dx: number, dy: number) => dominant(dx, dy);
  const locked = () => S.open || S.full || S.paused || S.slides;
  let lastWheel = 0;
  /* mobil: her hareketin ekseni başta kilitlenir; yatay daire şeridini, dikey sayfayı kaydırır */
  let axis: 'x' | 'y' | null = null;
  let acc = [0, 0];
  const AXIS_SLOP = 6;

  const cmd: Commands = {
    input: () => camera.touch(),
    press() {
      axis = null;
      acc = [0, 0];
      S.pressed = true;
      if (!locked()) camera.stop();
    },
    release() {
      S.pressed = false;
    },
    pan(dx, dy) {
      if (locked()) return;
      if (!S.mobile) return camera.pan(drag(dx, dy) / stepPx());
      if (!axis) {
        acc = [acc[0] + dx, acc[1] + dy];
        if (Math.hypot(acc[0], acc[1]) < AXIS_SLOP) return;
        axis = Math.abs(acc[0]) >= Math.abs(acc[1]) ? 'x' : 'y';
        [dx, dy] = acc;
      }
      if (axis === 'y') gallery.scrollBy(-dy);
      else camera.pan(dx / stepPx());
    },
    fling(vx, vy) {
      if (locked()) return;
      if (!S.mobile) return camera.fling(drag(vx, vy) / stepPx());
      if (axis === 'y') gallery.flingScroll(-vy);
      else if (axis === 'x') camera.fling(vx / stepPx());
      else camera.settle();
    },
    wheel(dx, dy) {
      if (locked()) return;
      const d = dominant(dx, dy);
      if (d) lastWheel = Math.sign(d);
      camera.pan(d / (G.wheel.step * S.vh));
    },
    settle() {
      if (!locked()) camera.settle(lastWheel * G.wheel.bias);
      lastWheel = 0;
    },
    arrow(d) {
      if (!locked()) camera.step(d);
    },
    tap(x, y) {
      // tam ekranda ekranın herhangi bir yerine dokunmak galeriye döndürür
      if (S.full) return gallery.close();
      if (locked()) return;
      const n = gallery.hit(x, y);
      if (n === null) return;
      // kenardaki daire ana yuvaya gelir; ana daire (yerine oturmuşsa) açılır
      if (n === Math.round(S.pos) && !camera.busy()) {
        camera.stop();
        // mobil: ilk dokunuş künyeyi açar, ikincisi videoyu
        if (S.mobile && !gallery.kunyeOpen()) gallery.kunye(true);
        else gallery.open();
      } else camera.go(n);
    },
    openMain() {
      if (locked()) return;
      camera.stop();
      camera.settle();
      gallery.open();
    },
    close() {
      if (S.full) gallery.close();
    },
    isOpen: () => S.open || S.full,
  };
  return cmd;
}
