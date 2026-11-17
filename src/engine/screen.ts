/* Ekran çerçevesi: yazıların ölçüleri (CSS değişkenleri, px), logolar ve Üye Ol / Giriş düğmeleri.
   Bütün ölçüler kimliğin `screen` token'ları (H'nin, belirtilenler W'nin oranı).
   Masaüstü: uzun logo sol altta, ilk harfi soldan `letter`·W'de, çizgilerin başı ekranın sol kenarında
   kesilir; açık hâlde ona çapraz geçen kısa logo aynı sol alt noktaya oturur ve çizgi aralığı uzun
   logonunkine eşittir. Mobil: yalnızca kısa logo; künye bloğu alıntının altında tam genişlikte. */
import { pickLogo, layoutLogo, letterStart, ruleSpacing, logoVbHeight } from './logo';
import { snapPx, type State } from './state';
import type { Dom } from './theme';
import type { Identity, TemplateContext } from './types';

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

  /* üye düğmeleri: sağ üst (değişkenler kökte: yükleme ekranındaki kopya da kullanır) */
  const d = S.mobile ? T.members.mobileD * W : T.members.d * H;
  const pad = T.members.pad * H;
  px('--cb-d', d);
  px('--cb-gap', T.members.gap * H);
  dom.members.style.top = `${(pad + S.safeTop).toFixed(2)}px`;
  dom.members.style.right = `${pad.toFixed(2)}px`;
  if (!dom.members.childElementCount) {
    dom.members.innerHTML = id.templates.circleButtons([['Üye Ol', 'signup'], ['Giriş', 'login']], tctx);
    // şimdilik işlevsiz; tıklama galeriye geçmez
    dom.members.addEventListener('pointerdown', (e) => e.stopPropagation());
    dom.members.addEventListener('click', (e) => e.stopPropagation());
  }
  const membersBottom = S.safeTop + pad + d;

  /* üst orta: tür + alıntı (mobilde üye düğmelerinin altında başlar) */
  const quoteTop = S.mobile ? Math.max(S.safeTop + T.quote.top * H, membersBottom + mpad) : T.quote.top * H;
  px('--gq-top', quoteTop);
  px('--gq-fs', (S.mobile ? T.quote.size.mobile : T.quote.size.web) * W);
  root.style.setProperty('--gq-lh', String(T.quote.lh));
  px('--gq-maxw', (S.mobile ? T.quote.maxW.mobile : T.quote.maxW.web) * W);

  /* künye bloğu: masaüstünde sol üst; mobilde alıntının altında tam genişlik (üst kenarını galeri verir) */
  px('--gi-left', S.mobile ? mpad : T.info.left * W);
  if (!S.mobile) px('--gi-top', T.info.top * H);
  px('--gi-w', S.mobile ? W - 2 * mpad : Math.max(T.info.width * W, T.info.minWidth));
  px('--gi-title', (S.mobile ? T.info.title.mobile : T.info.title.web) * W);
  px('--gi-rule', T.info.rule);
  root.style.setProperty('--gi-lines', String(T.info.descLines));

  /* alt orta: sahne adı, altında Bilet Al */
  px('--gs-gap', T.stage.gap * H);
  px('--gc-bottom', S.safeBottom + T.ticket.bottom * H);
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk');
  if (ticket) ticket.style.setProperty('--cb-d', `${(T.ticket.d * H).toFixed(2)}px`);

  /* logolar */
  const long = dom.brand.querySelector<HTMLElement>('.lg-l')!;
  const short = dom.brand.querySelector<HTMLElement>('.lg-s')!;
  const place = (el: HTMLElement, html: string, w: number, h: number, top: number) => {
    el.innerHTML = html;
    el.style.width = `${Math.max(0, w)}px`;
    el.style.height = `${h}px`;
    el.style.top = `${snapPx(top)}px`;
  };
  const L = id.logo;
  if (S.mobile) {
    const h = T.logo.mobileH * H;
    const lay = layoutLogo(pickLogo(id, h, W, true), h, snapPx(mpad));
    place(short, lay.html, lay.width, h, H - S.safeBottom - T.logo.mobileBottom * H - h);
    long.innerHTML = '';
    long.style.display = 'none';
    short.style.opacity = '1';
  } else {
    const bottom = H - S.safeBottom - T.logo.bottom * H;
    const x = T.logo.letter * W;
    // uzun logo: ilk harf x'te; çizgilerin başı sol kenarda kesilir
    const h = T.logo.h * H;
    const vh = logoVbHeight(L.long);
    const lay = layoutLogo(L.long, h, x - letterStart(L.long) * (h / vh));
    place(long, lay.html, lay.width, h, bottom - h);
    // kısa logo: aynı sol alt nokta, çizgi aralığı uzun logonunkine eşit
    const hs = h * (ruleSpacing(L.long) / vh) / (ruleSpacing(L.short) / logoVbHeight(L.short));
    const lays = layoutLogo(L.short, hs, x - letterStart(L.short) * (hs / logoVbHeight(L.short)));
    place(short, lays.html, lays.width, hs, bottom - hs);
    long.style.display = '';
    long.style.opacity = '1';
    short.style.opacity = '0';
  }
  fitButtons(document.body, T.button.fit);
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
