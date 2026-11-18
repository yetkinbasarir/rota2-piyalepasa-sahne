/* Ekran çerçevesi: yazıların ölçüleri (CSS değişkenleri, px), logolar ve Üye Ol / Giriş düğmeleri.
   Bütün ölçüler kimliğin `screen` token'ları (H'nin, belirtilenler W'nin oranı).
   Masaüstü: uzun logo sol üstte, sol kenarı ekranın sol kenarında (SVG'nin çizgileri kenardan başlar); açık
   hâlde uzun logo sağdan kısa logonun genişliğine kırpılırken kısa logo aynı yerde, aynı yükseklikte belirir. Sağda başlık / tanıtım / künye sütunu, sol altta Üye Ol / Giriş.
   Mobil (dikey sayfa): sol üstte uzun logo (0.52W), sağ üstte üye düğmeleri; altta başlık ve tanıtım, sonra daire
   şeridi, Bilet Al ve dokununca açılan künye (gallery.ts). */
import { layoutLogo, logoVbHeight, logoWidth } from './logo';
import { snapPx, type State } from './state';
import type { Dom } from './theme';
import type { Identity, TemplateContext, TypeRole } from './types';

export function layoutScreen(S: State, id: Identity, dom: Dom, tctx: TemplateContext) {
  const T = id.screen;
  const H = S.vh;
  const W = S.vw;
  const root = document.documentElement;
  const px = (k: string, v: number) => root.style.setProperty(k, `${v.toFixed(2)}px`);
  const mpad = T.info.mobilePad * H;
  const clampCss = (c: { min: number; vw: number; max: number }) => `clamp(${c.min}px, ${+(c.vw * 100).toFixed(4)}vw, ${c.max}px)`;
  const clampPx = (c: { min: number; vw: number; max: number }) => Math.min(c.max, Math.max(c.min, c.vw * W));

  /* yazı boyları: okuma metni ve etiketler (clamp); sayılar büyük harf yüksekliğiyle okuma metnine eşit */
  root.style.setProperty('--fs-body', clampCss(T.body));
  root.style.setProperty('--lh-body', String(T.body.lh));
  root.style.setProperty('--fs-label', clampCss(T.label));
  root.style.setProperty('--ls-label', `${T.label.track}em`);
  px('--fs-label-px', clampPx(T.label));
  root.style.setProperty('--num-k', String(capRatio(id)));

  /* üye düğmeleri: masaüstünde sol altta (soldan logonun ilk harfi kadar, alttan Bilet Al kadar); mobilde sağ
     üstte (değişkenler kökte: yükleme ekranındaki kopya da kullanır) */
  const d = S.mobile ? T.members.mobileD * W : T.members.d * H;
  const pad = T.members.pad * H;
  const letterX = T.logo.letter * W;
  px('--cb-d', d);
  px('--cb-gap', T.members.gap * H);
  const ms = dom.members.style;
  // logo: masaüstünde yüksekliği logo.h·H; mobilde uzun logo logo.mobileW·W genişlikte (yükseklik orandan)
  const L = id.logo;
  const logoH = S.mobile ? (T.logo.mobileW * W * logoVbHeight(L.long)) / logoWidth(L.long, logoVbHeight(L.long)) : T.logo.h * H;
  const logoTop = S.safeTop + (S.mobile ? T.logo.mobileTop : T.logo.top) * H;
  if (S.mobile) {
    // mobil: sağ üstte, üstleri logonun üstüyle hizalı
    ms.top = `${logoTop.toFixed(2)}px`;
    ms.right = `${pad.toFixed(2)}px`;
    ms.left = ms.bottom = '';
  } else {
    ms.left = `${letterX.toFixed(2)}px`;
    ms.bottom = `${(S.safeBottom + T.ticket.bottom * H).toFixed(2)}px`;
    ms.top = ms.right = '';
  }
  if (!dom.members.childElementCount) {
    dom.members.innerHTML = id.templates.circleButtons([['Üye Ol', 'signup'], ['Giriş', 'login']], tctx);
    // şimdilik işlevsiz; tıklama galeriye geçmez
    dom.members.addEventListener('pointerdown', (e) => e.stopPropagation());
    dom.members.addEventListener('click', (e) => e.stopPropagation());
  }
  // dairelerin sığdırıldığı üst sınır: mobilde üye düğmelerinin altı; masaüstünde sabit (daire ölçüleri değişmesin)
  px('--fit-top', S.safeTop + (S.mobile ? pad + d : id.gallery.layout.fitTop * H));

  /* başlık, tanıtım ve künye sütunu: masaüstünde sağda (sağ kenarı sağdan logonun ilk harfi kadar), başlığın büyük
     harf üstü logonun üstüyle aynı çizgide; mobilde logonun altında tam genişlikte */
  const titleFs = (S.mobile ? T.info.title.mobile : T.info.title.web) * W;
  const giW = S.mobile ? W - 2 * mpad : Math.max(T.info.width * W, T.info.minWidth);
  const giLeft = S.mobile ? mpad : W - letterX - giW;
  px('--gi-left', giLeft);
  // mobil: başlığın üstünü galeri verir (Bilet Al'ın altı); logonun altı daire şeridinin üstü
  if (!S.mobile) px('--gi-top', logoTop - capOffset(T.type.title, titleFs, T.info.titleLh));
  px('--logo-bottom', logoTop + logoH);
  px('--gi-w', giW);
  // sütundaki çizgiler sağda ekran kenarını geçer: sütunun sağ kenarından ekranın sağ kenarına
  px('--gi-out', W - giLeft - giW);
  px('--gi-title', titleFs);
  root.style.setProperty('--gi-title-lh', String(T.info.titleLh));
  root.style.setProperty('--gi-title-lines', String(T.info.titleLines));

  /* logo çizgisi (başlığın ve tanıtımın altında, künyede aynası): kalınlığı ve elması uzun logonun ekrandaki
     ölçeğinde (thick / viewBox yüksekliği × uzun logonun yüksekliği); üstünde ve altında ruleGap */
  const lk = logoH / logoVbHeight(id.logo.long);
  px('--lr-t', id.logo.long.thick * lk);
  px('--lr-d', DIAMOND_H * lk);
  px('--lr-gap', (S.mobile ? T.info.ruleGap.mobile : T.info.ruleGap.web) * W);

  /* Bilet Al: ana dairenin altında ortalı (yatay merkezi galeri yazar: --gc-x), alt boşluk ticket.bottom */
  px('--gs-gap', T.stage.gap * H);
  const gcBottom = S.safeBottom + T.ticket.bottom * H;
  const tD = T.ticket.d * H;
  px('--gc-bottom', gcBottom);
  px('--gc-right', letterX);
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk');
  if (ticket) ticket.style.setProperty('--cb-d', `${tD.toFixed(2)}px`);
  // × (açık hâl): masaüstünde sağ altta; sağdan sütunun sağ boşluğu, alttan Üye Ol / Giriş'inki
  px('--xcl-bottom', gcBottom);

  /* logolar */
  const long = dom.brand.querySelector<HTMLElement>('.lg-l')!;
  const short = dom.brand.querySelector<HTMLElement>('.lg-s')!;
  const place = (el: HTMLElement, html: string, w: number, h: number, top: number) => {
    el.innerHTML = html;
    el.style.width = `${Math.max(0, w)}px`;
    el.style.height = `${h}px`;
    el.style.top = `${snapPx(top)}px`;
  };
  {
    // uzun ve kısa logo (mobilde de): sol kenarları ekranın sol kenarında (x = 0), aynı üst y ve aynı yükseklikte;
    // SVG'lerin çizgileri kenardan başlar (uzantı yok). Kısa logo yalnızca açık hâlde
    const h = logoH;
    const lay = layoutLogo(L.long, h, 0);
    place(long, lay.html, lay.width, h, logoTop);
    const lays = layoutLogo(L.short, h, 0);
    place(short, lays.html, lays.width, h, logoTop);
    // açık hâlde uzun logo sağdan kısa logonun genişliğine kırpılır
    long.dataset.clip = String(Math.max(0, lay.width - lays.width));
    long.style.display = '';
    long.style.opacity = '1';
    short.style.opacity = '0';
  }
  fitButtons(document.body, T.button.fit);
}

/** logo-long.svg'deki çizgi ucu elmasının yüksekliği (viewBox birimi; şablondaki elmas SVG'si) */
const DIAMOND_H = 28.626;

/** Başlık en fazla `lines` satır: sığmıyorsa (ya da bir kelime sütuna sığmıyorsa) yazı boyu sığana kadar küçülür;
    hiç kısaltılmaz. Belgede (görünmez olabilir) duran başlıklar için */
export function fitTitles(root: ParentNode, lines: number, lh: number) {
  for (const el of root.querySelectorAll<HTMLElement>('.gt')) {
    el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(el).fontSize);
    if (!(base > 0)) continue;
    const fits = (fs: number) => {
      el.style.fontSize = `${fs.toFixed(2)}px`;
      return el.getBoundingClientRect().height <= lines * fs * lh + 1 && el.scrollWidth <= el.clientWidth + 1;
    };
    if (fits(base)) {
      el.style.fontSize = '';
      continue;
    }
    let lo = base * 0.2;
    let hi = base;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      if (fits(m)) lo = m;
      else hi = m;
    }
    el.style.fontSize = `${lo.toFixed(2)}px`;
  }
}

/** Bir yazı rolünün satır kutusunun üstünden ilk satırın büyük harf ("H") üstüne uzaklık (px): yarım satır
    aralığı + fontun üst payı − büyük harf yüksekliği (canvas measureText) */
export function capOffset(role: TypeRole, fs: number, lh: number) {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return 0;
  c.font = `${role.style ?? 'normal'} ${role.weight} ${fs}px ${role.family}`;
  const m = c.measureText('H');
  const a = m.fontBoundingBoxAscent;
  const d = m.fontBoundingBoxDescent;
  if (!(a > 0) || !(m.actualBoundingBoxAscent > 0)) return 0;
  return (lh * fs - (a + d)) / 2 + a - m.actualBoundingBoxAscent;
}

/** Sayıların okuma metnine oranı: aynı boyda okuma fontunun ve sayı fontunun büyük harf yüksekliği (canvas
    measureText, actualBoundingBoxAscent). Sayılar font-size: calc(oran · 1em) ile çevrelerindeki okuma metninin
    büyük harf yüksekliğine eşitlenir. Fontlar yüklenmeden ölçülmez (1) */
let capCache: { key: string; k: number } | null = null;
function capRatio(id: Identity) {
  const B = id.screen.type.body;
  const N = id.screen.type.number;
  const ch = id.screen.number.capOf;
  const fb = `${B.style ?? 'normal'} ${B.weight} 100px ${B.family}`;
  const fn = `normal ${N.weight} 100px ${N.family}`;
  const ready = !!document.fonts?.check?.(fb, ch) && !!document.fonts?.check?.(fn, ch);
  const key = `${fb}|${fn}|${ready}`;
  if (capCache?.key === key) return capCache.k;
  let k = 1;
  const c = ready ? document.createElement('canvas').getContext('2d') : null;
  if (c) {
    c.font = fb;
    const hb = c.measureText(ch).actualBoundingBoxAscent;
    c.font = fn;
    const hn = c.measureText(ch).actualBoundingBoxAscent;
    if (hb > 0 && hn > 0) k = hb / hn;
  }
  capCache = { key, k: +k.toFixed(4) };
  return capCache.k;
}

/** Daire düğme yazıları tek satırda, çapın `fit` oranına sığar; aynı gruptaki düğmeler (Üye Ol / Giriş)
    aynı boyda: en çok küçülmesi gerekenin boyu */
export function fitButtons(root: ParentNode, fit: number) {
  const groups = new Map<Element, { span: HTMLElement; fs: number }[]>();
  for (const b of root.querySelectorAll<HTMLElement>('.cb')) {
    const span = b.firstElementChild as HTMLElement | null;
    if (!span) continue;
    span.style.fontSize = '';
    const w = span.getBoundingClientRect().width;
    const d = b.getBoundingClientRect().width;
    const fs0 = parseFloat(getComputedStyle(span).fontSize);
    const fs = w > 0 && d > 0 && w > d * fit ? (fs0 * d * fit) / w : fs0;
    const g = b.parentElement ?? b;
    (groups.get(g) ?? groups.set(g, []).get(g)!).push({ span, fs });
  }
  for (const list of groups.values()) {
    const fs = Math.min(...list.map((x) => x.fs));
    for (const x of list) x.span.style.fontSize = `${fs.toFixed(2)}px`;
  }
}
