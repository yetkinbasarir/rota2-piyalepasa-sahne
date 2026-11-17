/* Tekerlek / trackpad — GSAP Observer üzerinden komut katmanına.
   Dikey ya da yatay kaydırma daireleri eğri boyunca ilerletir (aşağı / sağ = sonraki); kaydırma
   durunca en yakın daire ortaya oturur. Safari'nin sayfa yakınlaştırma (gesture*) olayları engellenir. */
import { Observer } from '../motion';
import type { Commands } from '../commands';

export function bindWheel(surface: HTMLElement, cmd: Commands, idle: number) {
  let settleTimer = 0;

  Observer.create({
    target: surface,
    type: 'wheel',
    preventDefault: true,
    debounce: false,
    onWheel(self) {
      const e = self.event as WheelEvent;
      cmd.input();
      const k = e.deltaMode ? 16 : 1;
      cmd.wheel(e.deltaX * k, e.deltaY * k);
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => cmd.settle(), idle * 1000);
    },
  });

  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
}
