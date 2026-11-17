/* Tam ekran ağı: zemin renginde yüzey, kare ızgarada eşkenar dörtgen (45° kare) delikler; video bu
   deliklerden gri zemine basılmış gibi görünür. Hücre aralığı p kimlikten; delik yarı köşegeni
   r = p × √((1 − kaplama) / 2), en fazla p / 2 (komşu delikler köşeden değer). p ve r ekranın piksel
   ızgarasına yuvarlanır (moiré olmasın); sonuç CSS değişkeni olarak yazılır (engine.css .holes).
   Yükleme ekranındaki ekran koruyucu önceki ağı kullanır (.holes-r: siyah yüzey, yuvarlak delikler). */
import { snapPx } from './state';
import type { Identity } from './types';

export function textureMetrics(id: Identity) {
  const p = snapPx(id.texture.pitch);
  const r = snapPx(p * Math.min(0.5, Math.sqrt((1 - id.texture.cover) / 2)));
  return { p, r };
}

/** Ağ desenini CSS değişkenlerine yazar; ekran ölçüsü / dpr değişince yeniden çağrılır */
export function applyTexture(root: HTMLElement, id: Identity) {
  const { p, r } = textureMetrics(id);
  const c = p / 2;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${p}' height='${p}' viewBox='0 0 ${p} ${p}'>` +
    `<path fill-rule='evenodd' fill='${id.colors.background}' d='M0 0H${p}V${p}H0Z M${c} ${c - r}L${c + r} ${c}L${c} ${c + r}L${c - r} ${c}Z'/></svg>`;
  root.style.setProperty('--tex-p', `${p}px`);
  // yükleme ekranının ekran koruyucusu: önceki ağ (siyah yüzey, yuvarlak delikler; çap kaplamadan)
  root.style.setProperty('--tex-r', `${snapPx(p * Math.sqrt((4 * (1 - id.texture.cover)) / Math.PI)) / 2}px`);
  root.style.setProperty('--tex-img', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}
