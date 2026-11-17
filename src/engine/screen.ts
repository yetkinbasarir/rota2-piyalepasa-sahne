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

  /* üye düğmeleri: sağ üst (değişkenler kökte: yükleme ekranındaki kopya da kullanır) */
  const d = S.mobile ? T.members.mobileD * W : T.members.d * H;
  const pad = T.members.pad * H;
  px('--cb-d', d);
  px('--cb-fs', T.members.font * H);
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

  /* tür satırı */
  px('--lb-fs', T.label.size * H);
  root.style.setProperty('--lb-ls', `${T.label.track}em`);

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
  px('--gi-value', T.info.value * H);
  px('--gi-row', T.info.row * H);
  root.style.setProperty('--gi-ls', `${T.info.track}em`);
  px('--gi-dm', T.info.diamond);
  root.style.setProperty('--gi-lines', String(T.info.descLines));

  /* alt orta: sahne adı, altında Bilet Al */
  px('--gs-fs', T.stage.size * H);
  root.style.setProperty('--gs-ls', `${T.stage.track}em`);
  px('--gs-gap', T.stage.gap * H);
  px('--gc-bottom', S.safeBottom + T.ticket.bottom * H);
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk');
  if (ticket) {
    ticket.style.setProperty('--cb-d', `${(T.ticket.d * H).toFixed(2)}px`);
    ticket.style.setProperty('--cb-fs', `${(T.ticket.font * H).toFixed(2)}px`);
  }

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
