/* Paylaşılan durum ve ekran ölçüsü. Galeri tek bir sürekli konumla (S.pos) yönetilir: tam sayı
   değerinde o sıradaki daire ortadadır; konum arttıkça sağdaki (sonraki) daireler ortaya gelir.
   n = 1 (dar dikey ekran) ise mobil yerleşim kullanılır. */
import type { Identity } from './types';
import { applyTexture } from './texture';

export interface State {
  vw: number;
  vh: number;
  mobile: boolean;
  /** Mobil güvenli alanlar (px) */
  safeTop: number;
  safeBottom: number;
  /** Galeri konumu (sürekli; tam sayı = o daire ortada) */
  pos: number;
  /** İşaretçi basılı */
  pressed: boolean;
  /** İris açılıyor / açık / kapanıyor: galeri girişleri bekler */
  open: boolean;
  /** Tam ekran (video akışı) */
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
  return { vw: 0, vh: 0, mobile: false, safeTop: 0, safeBottom: 0, pos: 0, pressed: false, open: false, full: false, paused: false };
}

export function measure(S: State, id: Identity) {
  S.vw = innerWidth;
  S.vh = innerHeight;
  // mobil (n = 1): dikey dar ekran; görünür alan yüksekliği (100dvh / visualViewport)
  S.mobile = S.vw < S.vh && S.vw < 760;
  S.safeTop = S.safeBottom = 0;
  if (S.mobile) {
    const vp = viewportMetrics();
    S.vh = vp.h;
    S.safeTop = vp.top;
    S.safeBottom = vp.bottom;
  }
  const H = S.vh;
  const root = document.documentElement;
  root.classList.toggle('is-mobile', S.mobile);
  root.style.setProperty('--H', `${H}px`);
  // tam ekran ikonlarının ve yükleme ekranının kenar boşluğu
  const pad = `${snapPx(id.closeButton.pad * H)}px`;
  root.style.setProperty('--logo-pad', pad);
  root.style.setProperty('--mpad', pad);
  root.style.setProperty('--xcl-d', `${id.closeButton.size}px`);
  root.style.setProperty('--safe-top', `${S.safeTop}px`);
  // görünür alan yüksekliği (tam ekran video kaplaması); masaüstünde 100vh ile aynı
  root.style.setProperty('--vvh', `${S.vh}px`);
  // tam ekran delikli doku: aralık ve çap ekranın piksel ızgarasına yuvarlanır (texture.ts)
  applyTexture(root, id);
  // tam ekran videosu: büyütme ve dikey merkez
  root.style.setProperty('--fv-k', String(id.video.scale));
  root.style.setProperty('--fv-oy', String(id.video.originY));
}

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
