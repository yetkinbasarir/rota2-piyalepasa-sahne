/* Delikli doku (ROTA1'in tam ekran dokusuyla aynı): siyah yüzeyde kare ızgaraya dizilmiş yuvarlak delikler.
   Aralık p (id.texture.pitch), kaplama oranı; delik çapı d = p × √(4 × (1 − kaplama) / π). p ve d ekranın piksel
   ızgarasına yuvarlanır (moiré olmasın); sonuç CSS değişkeni olarak yazılır (engine.css .holes-r). Açık hâlde
   videonun üstündeki ağ (.tex; arada başka katman yok). */
import { snapPx } from './state';
import type { Identity } from './types';

/** Doku ölçülerini CSS değişkenlerine yazar; ekran ölçüsü / dpr değişince yeniden çağrılır */
export function applyTexture(root: HTMLElement, id: Identity) {
  const p = snapPx(id.texture.pitch);
  const d = snapPx(p * Math.sqrt((4 * (1 - id.texture.cover)) / Math.PI));
  root.style.setProperty('--tex-p', `${p}px`);
  root.style.setProperty('--tex-r', `${d / 2}px`);
}
