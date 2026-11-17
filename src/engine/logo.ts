/* İki parçalı, uzayıp kısalabilen logo. Uzun ve kısa logoda yatay çizgiler x = 0'dan başlar, sağda
   elmasla biter; harfler, el yazısı ve elmaslar sabit ölçekte çizilir, çizgilerin sol kısmı esner:
   logo verilen yükseklikte çizilir ve sol kenarından kapsayıcının sol kenarına kadar uzanan çizgi
   uzantıları (aynı y hizası, aynı kalınlık × ölçek, aynı renk) eklenir. Uzantı ile SVG'deki çizginin
   başlangıcı 1px üst üste biner; uzantılar piksel ızgarasına yuvarlanır.
   Seçim: hedef yükseklikte uzun logonun genişliği kullanılabilir genişliğin `longFit`'ine sığıyorsa uzun,
   sığmıyorsa kısa logo; mobilde her zaman kısa. */
import type { Identity, LogoPart } from './types';

const snap = (v: number) => {
  const d = devicePixelRatio || 1;
  return Math.round(v * d) / d;
};

interface Parsed {
  vb: [number, number, number, number];
  inner: string;
  part: LogoPart;
}
const cache = new Map<string, Parsed>();
function parse(part: LogoPart): Parsed {
  const hit = cache.get(part.svg);
  if (hit) return hit;
  const vb = (/viewBox="([^"]+)"/.exec(part.svg)?.[1] ?? '0 0 100 100').split(/[\s,]+/).map(Number) as Parsed['vb'];
  const inner = (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(part.svg)?.[1] ?? '')
    .replace(/\s(id|data-name)="[^"]*"/g, '')
    .replace(/\sfill="(?!none)[^"]*"/g, '');
  const p = { vb, inner, part };
  cache.set(part.svg, p);
  return p;
}

/** Hedef yükseklik ve kullanılabilir genişliğe göre uzun ya da kısa logo */
export function pickLogo(id: Identity, height: number, avail: number, mobile: boolean): LogoPart {
  const L = id.logo;
  if (mobile) return L.short;
  const long = parse(L.long);
  return height * (long.vb[2] / long.vb[3]) <= avail * L.longFit ? L.long : L.short;
}

/** Logonun verilen yükseklikteki genişliği */
export const logoWidth = (part: LogoPart, height: number) => {
  const p = parse(part);
  return height * (p.vb[2] / p.vb[3]);
};

export interface LogoLayout {
  /** Kapsayıcının içine konacak HTML (SVG + çizgi uzantıları), mutlak konumlu */
  html: string;
  /** Kapsayıcının toplam genişliği (sol kenardan logonun sağ kenarına) */
  width: number;
  /** Logonun kapsayıcıdaki sol kenarı ve genişliği */
  left: number;
  logoW: number;
  /** Maske için bağımsız SVG (kapsayıcı boyutunda, uzantılar dahil; dolgu siyah) */
  maskSvg: string;
}

/** Logoyu kapsayıcıda `left` konumunda, `height` yüksekliğinde çiz; çizgileri kapsayıcının sol kenarına uzat */
export function layoutLogo(part: LogoPart, height: number, left: number): LogoLayout {
  const p = parse(part);
  const s = height / p.vb[3];
  const logoW = p.vb[2] * s;
  const L = snap(left);
  const lines = p.part.lines.map((y) => {
    const th = Math.max(1 / (devicePixelRatio || 1), snap(p.part.thick * s));
    const top = snap(y * s - th / 2);
    return { top, th };
  });
  // 1px bindirme: uzantı SVG'deki çizginin başlangıcının 1px içine uzanır
  const ext = lines
    .map(({ top, th }) => `<i style="position:absolute;left:0;top:${top}px;width:${L + 1}px;height:${th}px;background:currentColor"></i>`)
    .join('');
  const svg = `<svg viewBox="${p.vb.join(' ')}" fill="currentColor" aria-hidden="true" style="position:absolute;left:${L}px;top:0;width:${logoW}px;height:${height}px;display:block;overflow:visible">${p.inner}</svg>`;
  const W = L + logoW;
  const maskSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" fill="#000">` +
    lines.map(({ top, th }) => `<rect x="0" y="${top}" width="${L + 1}" height="${th}"/>`).join('') +
    `<svg x="${L}" y="0" width="${logoW}" height="${height}" viewBox="${p.vb.join(' ')}">${p.inner}</svg></svg>`;
  return { html: ext + svg, width: W, left: L, logoW, maskSvg };
}
