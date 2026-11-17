/* İşaretçi / dokunma — GSAP Observer üzerinden komut katmanına.
   Sürükleme daireleri eğri boyunca ilerletir (web'de baskın eksen, mobilde dikey), bırakınca
   ataletle en yakın daireye oturur; dokunma kenardaki daireyi ortaya getirir, ortadakini açar. */
import { Observer } from '../motion';
import type { Commands } from '../commands';

const TAP_SLOP = 6;

export function bindPointer(surface: HTMLElement, cmd: Commands) {
  let start: { x: number; y: number } | null = null;

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
    },
    onDrag(self) {
      cmd.input();
      if (start) cmd.pan(self.deltaX, self.deltaY);
    },
    onRelease(self) {
      cmd.release();
      if (!start) return;
      const x = self.x ?? 0;
      const y = self.y ?? 0;
      const moved = Math.hypot(x - start.x, y - start.y);
      start = null;
      if (moved < TAP_SLOP) return cmd.tap(x, y);
      cmd.fling(self.velocityX, self.velocityY);
    },
  });
}
