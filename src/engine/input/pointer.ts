/* İşaretçi / dokunma — GSAP Observer üzerinden komut katmanına.
   Kapalıyken: sürükleme (yatay veya dikey) duvarı yatayda kaydırır, bırakınca savrulur;
   dokunma kartı açar. Açıkken: yatay kaydırma sonraki / önceki kart; dikey sürükleme açık öğeyi
   kaydırır (sığmıyorsa). */
import { Observer } from '../motion';
import type { Commands } from '../commands';

const TAP_SLOP = 6;
const SWIPE_MIN = 50;

export function bindPointer(surface: HTMLElement, cmd: Commands) {
  let start: { x: number; y: number } | null = null;
  let axis: 'x' | 'y' | null = null;

  Observer.create({
    target: surface,
    type: 'touch,pointer',
    dragMinimum: 2,
    preventDefault: true,
    allowClicks: false,
    onPress(self) {
      cmd.input();
      cmd.press();
      start = { x: self.startX ?? 0, y: self.startY ?? 0 };
      axis = null;
    },
    onDrag(self) {
      cmd.input();
      if (!start) return;
      if (!cmd.isOpen()) return cmd.pan(self.deltaX, self.deltaY);
      const dx = (self.x ?? 0) - start.x;
      const dy = (self.y ?? 0) - start.y;
      if (!axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'y') cmd.openScroll(-self.deltaY);
    },
    onRelease(self) {
      cmd.release();
      if (!start) return;
      const x = self.x ?? 0;
      const y = self.y ?? 0;
      const dx = x - start.x;
      const dy = y - start.y;
      start = null;
      if (Math.hypot(dx, dy) < TAP_SLOP) return cmd.tap(x, y);
      if (cmd.isOpen()) {
        if (axis === 'x' && Math.abs(dx) >= SWIPE_MIN) cmd.next(dx < 0 ? 1 : -1);
        else if (axis === 'y') cmd.openFling(-self.velocityY);
        return;
      }
      cmd.fling(self.velocityX, self.velocityY);
    },
  });

  /* her türlü işaretçi hareketi boşta akışı durdurur */
  const anyInput = Observer.create({
    target: window,
    type: 'pointer,touch',
    onMove: () => cmd.input(),
    onPress: () => cmd.input(),
  });
  // Observer ilk harekette deltayı önceki konumdan hesaplar; başlangıç konumu yoksa (NaN) ilk olay kaçar
  Object.assign(anyInput, { x: -1, y: -1 });
}
