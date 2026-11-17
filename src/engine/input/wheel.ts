/* Tekerlek / trackpad — GSAP Observer üzerinden komut katmanına.
   Kapalıyken: yatay ve dikey tekerlek duvarı yatayda kaydırır. Açıkken: yatay kaydırma sonraki /
   önceki kart (bir kaydırma akışı en fazla bir adım), dikey kaydırma açık öğeyi kaydırır.
   Safari'nin sayfa yakınlaştırma (gesture*) olayları engellenir. */
import { Observer } from '../motion';
import type { Commands } from '../commands';

const STEP_THRESHOLD = 70;
const SETTLE_DELAY = 160;
const GESTURE_GAP = 200;

export function bindWheel(surface: HTMLElement, cmd: Commands) {
  let last = 0;
  let settleTimer = 0;
  let accX = 0;
  let swallow = false;

  Observer.create({
    target: surface,
    type: 'wheel',
    preventDefault: true,
    debounce: false,
    onWheel(self) {
      const e = self.event as WheelEvent;
      cmd.input();
      const k = e.deltaMode ? 16 : 1;
      const dx = e.deltaX * k;
      const dy = e.deltaY * k;
      if (!cmd.isOpen()) {
        cmd.pan(-dx, -dy);
        // durunca en yakın kolona yumuşakça otur
        clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => cmd.settle(), SETTLE_DELAY);
        return;
      }
      // fare uzun künyenin üzerindeyse: künye dikeyde kayar, duvar yatay kaymaz
      if (cmd.creditsWheel(e.clientX, e.clientY, Math.abs(dy) >= Math.abs(dx) ? dy : 0)) return;
      const now = performance.now();
      if (now - last > GESTURE_GAP) {
        accX = 0;
        swallow = false;
      }
      last = now;
      if (swallow) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        accX += dx;
        if (Math.abs(accX) > STEP_THRESHOLD) {
          cmd.next(accX > 0 ? 1 : -1);
          swallow = true;
        }
      } else cmd.openScroll(dy);
    },
  });

  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
}
