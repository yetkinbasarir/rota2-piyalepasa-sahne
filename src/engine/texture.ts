/* Açık hâlin ağı: zemin grisinde ince çizgilerden ızgara; hücreyi neredeyse dolduran eşkenar dörtgen (45° kare)
   delikler. Hücre c px (gallery.mesh.cell), komşu delikler arası `line` px gri; delik köşegeni c − line. Delikler
   şaşırtmalı dizilir (hücre merkezi ve köşeler), kenarları komşusununkine paraleldir. c ekranın piksel ızgarasına
   yuvarlanır (moiré olmasın); sonuç CSS değişkeni olarak yazılır (engine.css .holes). Video bu deliklerden tam
   parlaklık ve renkle görünür; arada başka katman yok.
   Yükleme ekranındaki ekran koruyucu önceki ağı kullanır (.holes-r: siyah yüzey, yuvarlak delikler; id.texture). */
import { snapPx } from './state';
import type { Identity } from './types';

/** Ağ desenini CSS değişkenlerine yazar; ekran ölçüsü / dpr değişince yeniden çağrılır */
export function applyTexture(root: HTMLElement, id: Identity) {
  const M = id.gallery.mesh;
  const c = snapPx(M.cell);
  const r = Math.max(0, (c - M.line) / 2);
  const h = c / 2;
  const n = (v: number) => +v.toFixed(3);
  // delikler: merkezde bir tane, dört köşede çeyrekleri (komşu hücrelerle tam delik olur)
  const dia = (x: number, y: number) => `M${n(x)} ${n(y - r)}L${n(x + r)} ${n(y)}L${n(x)} ${n(y + r)}L${n(x - r)} ${n(y)}Z`;
  const holes = [dia(h, h), dia(0, 0), dia(c, 0), dia(0, c), dia(c, c)].join(' ');
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${c}' height='${c}' viewBox='0 0 ${c} ${c}'>` +
    `<path fill-rule='evenodd' fill='${id.colors.background}' d='M0 0H${c}V${c}H0Z ${holes}'/></svg>`;
  root.style.setProperty('--mesh-p', `${c}px`);
  root.style.setProperty('--mesh-img', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  // yükleme ekranının ekran koruyucusu: önceki ağ (siyah yüzey, yuvarlak delikler; çap kaplamadan)
  const p = snapPx(id.texture.pitch);
  root.style.setProperty('--tex-p', `${p}px`);
  root.style.setProperty('--tex-r', `${snapPx(p * Math.sqrt((4 * (1 - id.texture.cover)) / Math.PI)) / 2}px`);
}
