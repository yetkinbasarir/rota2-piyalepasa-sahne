/* Paylaşılan durum ve ekran ölçüsü. Duvar yalnızca yatayda kayar: kamera S.cx, kolon cinsinden
   (ekranın sol kenarındaki kolon). En altta siyah bant; bandın üstünde iki sıra kart: üstte, satır
   arasında ve bandın üstünde birer boşluk. Kart oranı sabit (genişlik = yükseklik × oran); ortada
   n = floor((ekran − g) / (kart + g)) tam kolon (1..maxCols) ekranın yatay ortasına yerleşir, kalan
   alan iki kenarda kesik kartlarla dolar. n = 1 ise mobil dikey açılma düzeni kullanılır. */
import type { Identity } from './types';
import { applyTexture } from './texture';

export interface State {
  vw: number;
  vh: number;
  mobile: boolean;
  /** Boşluk ve bant yüksekliği (px; mobilde üst bant, üst güvenli alan dahil) */
  gap: number;
  band: number;
  /** İçerik alanı: üst ve alt sınır (px). Web: 0 .. bandın üstü; mobil: üst bandın altı .. alt güvenli alanın üstü */
  top: number;
  bottom: number;
  /** Grid'in üst kenar boşluğu (px): web'de 0 (üst satır y = 0'dan başlar), mobilde boşluk */
  topGap: number;
  /** Mobil güvenli alanlar (px) */
  safeTop: number;
  safeBottom: number;
  rows: number;
  /** Kart genişliği / yüksekliği (px), yatay adım (kart + boşluk) */
  cw: number;
  ch: number;
  stepX: number;
  /** Ortada görünen tam kolon sayısı ve ilk tam kolonun sol kenarı (px) */
  cols: number;
  margin: number;
  /** Kolona oturmuş kameranın kesir kısmı: tam kolonlar ortada */
  snapOff: number;
  /** Kamera: ekranın sol kenarındaki kolon (sürekli) */
  cx: number;
  /** İşaretçi basılı */
  pressed: boolean;
  /** Fare grid'in üzerinde (akış yavaşlar) */
  hover: boolean;
  /** Grid'e dönüş / birleşme hareketi sürüyor (akış bekler) */
  merging: boolean;
  /** Açık öğe */
  open: { i: number; j: number } | null;
  /** Açık öğenin fotoğrafı tam ekranda */
  full: boolean;
  /** Telefonda yatay ekran katmanı açık: her şey bekler */
  paused: boolean;
}

export const mod = (a: number, n: number) => ((a % n) + n) % n;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Ekranın gerçek piksel ızgarasına yuvarla */
export const snapPx = (v: number) => {
  const d = devicePixelRatio || 1;
  return Math.round(v * d) / d;
};

export function createState(): State {
  return { vw: 0, vh: 0, mobile: false, gap: 0, band: 0, top: 0, bottom: 0, topGap: 0, safeTop: 0, safeBottom: 0, rows: 2, cw: 0, ch: 0, stepX: 0, cols: 4, margin: 0, snapOff: 0, cx: 0, pressed: false, hover: false, merging: false, open: null, full: false, paused: false };
}

export function measure(S: State, id: Identity) {
  const Wl = id.wall;
  S.vw = innerWidth;
  S.vh = innerHeight;
  // alt bant ölçüsü eski ölçütle (dikey dar ekran) aynı kalır
  const portrait = S.vw < S.vh && S.vw < 760;
  S.gap = Wl.gap;
  S.band = snapPx(S.vh * (portrait ? Wl.band.mobile : Wl.band.web));
  S.rows = Wl.rows;
  S.top = 0;
  S.bottom = S.vh - S.band;
  S.safeTop = S.safeBottom = 0;
  // kart yüksekliği = (içerik alanı − üst boşluk − alt boşluk − satır araları) / satır
  // web: üst boşluk yok (yalnızca satır arası ve bant üstü boşluk); mobil: üst boşluk var
  S.topGap = 0;
  const rowsH = () => (S.bottom - S.top - S.topGap - S.gap - (S.rows - 1) * S.gap) / S.rows;
  S.ch = rowsH();
  // kart genişliği sabit orandan; ekran genişliğinden hesaplanmaz
  S.cw = S.ch * Wl.cardRatio;
  S.stepX = S.cw + S.gap;
  // ortadaki tam kolon sayısı ve ekranın ortasına yerleşmeleri
  S.cols = Math.max(1, Math.min(Wl.maxCols, Math.floor((S.vw - S.gap) / (S.cw + S.gap))));
  if (S.cols === 1) {
    // mobil (tek kolon): görünür alan yüksekliği (100dvh / visualViewport), üstte siyah bant,
    // alt güvenli alan en alttaki içeriğe boşluk olarak eklenir
    const vp = viewportMetrics();
    S.vh = vp.h;
    S.safeTop = vp.top;
    S.safeBottom = vp.bottom;
    S.band = snapPx(Wl.mobileBand + S.safeTop);
    S.top = S.band;
    S.bottom = S.vh - S.safeBottom;
    S.topGap = S.gap;
    S.ch = rowsH();
    S.cw = S.ch * Wl.cardRatio;
    S.stepX = S.cw + S.gap;
    S.cols = 1;
  }
  S.margin = (S.vw - (S.cols * S.cw + (S.cols - 1) * S.gap)) / 2;
  // kolona oturmuş kamera: ilk tam kolonun sol kenarı margin'de
  S.snapOff = mod(-S.margin / S.stepX, 1);
  // tek kolon: mobil dikey açılma düzeni
  S.mobile = S.cols === 1;
  const root = document.documentElement;
  root.classList.toggle('is-mobile', S.mobile);
  root.style.setProperty('--card-w', `${S.cw}px`);
  root.style.setProperty('--card-h', `${S.ch}px`);
  root.style.setProperty('--band-h', `${S.band}px`);
  root.style.setProperty('--logo-pad', `${snapPx(Wl.logoPad * S.gap)}px`);
  root.style.setProperty('--mpad', `${Wl.mobileLogoPad}px`);
  root.style.setProperty('--xcl-d', `${Wl.closeSize}px`);
  root.style.setProperty('--m-fs', `${Wl.mobileBody}px`);
  root.style.setProperty('--safe-top', `${S.safeTop}px`);
  // görünür alan yüksekliği (tam ekran video kaplaması); masaüstünde 100vh ile aynı
  root.style.setProperty('--vvh', `${S.vh}px`);
  root.style.setProperty('--gap', `${S.gap}px`);
  root.style.setProperty('--perf', String(Wl.perforation));
  root.style.setProperty('--mono-contrast', String(Wl.monoContrast));
  // ortak delikli doku: aralık ve çap ekranın piksel ızgarasına yuvarlanır (texture.ts)
  applyTexture(root, id);
  // tam ekran videosu: büyütme ve dikey merkez
  root.style.setProperty('--fv-k', String(id.video.scale));
  root.style.setProperty('--fv-oy', String(id.video.originY));
}

/** j. satırın üst kenarı (px) */
export const rowTop = (S: State, j: number) => S.top + S.topGap + j * (S.ch + S.gap);

/** Mobil: görünür alan yüksekliği (100dvh; desteklenmiyorsa visualViewport) ve güvenli alanlar */
function viewportMetrics() {
  const probe = document.createElement('div');
  const dvh = typeof CSS !== 'undefined' && CSS.supports?.('height', '100dvh');
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;box-sizing:border-box;' +
    `height:${dvh ? '100dvh' : '0'};padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)`;
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const top = parseFloat(cs.paddingTop) || 0;
  const bottom = parseFloat(cs.paddingBottom) || 0;
  const h = dvh ? probe.getBoundingClientRect().height : (visualViewport?.height ?? innerHeight);
  probe.remove();
  return { h: h || innerHeight, top, bottom };
}
/** Ekranda görünen kolon sayısı */
export const viewCols = (S: State) => S.vw / S.stepX;
/** En yakın kolona oturmuş kamera */
export const snapCam = (S: State, cx: number) => Math.round(cx - S.snapOff) + S.snapOff;
/** İleriye (sağdan sola) doğru ilk kolona oturmuş kamera: otomatik hareketler hiç geri gitmez */
export const snapCamForward = (S: State, cx: number) => Math.ceil(cx - S.snapOff - 1e-6) + S.snapOff;
