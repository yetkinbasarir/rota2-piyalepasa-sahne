/* Ortak delikli doku: siyah yüzeyde kare ızgaraya dizilmiş yuvarlak delikler.
   Tek kaynak: aralık (p), kaplama oranı, delik çapı d = p × √(4 × (1 − kaplama) / π); p ve d
   ekranın piksel ızgarasına yuvarlanır (moiré olmasın). Sonuç CSS değişkenleri olarak yazılır,
   bütün kullanımlar engine.css'teki .holes sınıfını paylaşır:
   - tam ekran dokusu (.tex): fotoğraf ve videonun üstünde, delikler saydam
   - açılmış öğenin fotoğrafı (.pov): fotoğraf kutusunun içinde, delikler saydam */
import { snapPx } from './state';
import type { Identity } from './types';

export function textureMetrics(id: Identity) {
  const p = snapPx(id.texture.pitch);
  const d = snapPx(p * Math.sqrt((4 * (1 - id.texture.cover)) / Math.PI));
  return { p, d };
}

/** Doku ölçülerini CSS değişkenlerine yazar; ekran ölçüsü / dpr değişince yeniden çağrılır */
export function applyTexture(root: HTMLElement, id: Identity) {
  const { p, d } = textureMetrics(id);
  root.style.setProperty('--tex-p', `${p}px`);
  root.style.setProperty('--tex-r', `${d / 2}px`);
}
