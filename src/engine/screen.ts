/* Ekran çerçevesi: yazıların ölçüleri (CSS değişkenleri, px), sol alttaki logo ve sağ üstteki
   Üye Ol / Giriş düğmeleri. Bütün ölçüler kimliğin `screen` token'ları (H'nin, belirtilenler W'nin oranı).
   Mobilde: künye bloğu üye düğmelerinin altında tam genişlikte, kısa logo, düğme çapı W'nin oranı. */
import { pickLogo, layoutLogo } from './logo';
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

  /* üye düğmeleri: sağ üst; aralarında gap, üst ve sağ boşluk pad (değişkenler kökte: yükleme ekranındaki kopya da kullanır) */
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

  /* etiket */
  px('--lb-fs', T.label.size * H);
  root.style.setProperty('--lb-ls', `${T.label.track}em`);

  /* künye bloğu: web'de sol üst; mobilde üye düğmelerinin altında tam genişlik */
  px('--gi-left', S.mobile ? mpad : T.info.left * W);
  px('--gi-top', S.mobile ? S.safeTop + pad + d + mpad : T.info.top * H);
  px('--gi-w', S.mobile ? W - 2 * mpad : Math.max(T.info.width * W, T.info.minWidth));
  px('--gi-title', T.info.title * H);
  px('--gi-value', T.info.value * H);
  px('--gi-row', T.info.row * H);
  px('--gi-cd', T.info.counter * H);
  px('--gi-dm', T.info.diamond);

  /* sahne adı: üst orta */
  px('--gs-fs', T.stage.size * H);
  root.style.setProperty('--gs-ls', `${T.stage.track}em`);
  px('--gs-top', S.safeTop + T.stage.top * H);

  /* alt orta: etiket + alıntı, Bilet Al */
  px('--gc-bottom', S.safeBottom + T.caption.bottom * H);
  px('--gc-quote', T.caption.quote * H);
  root.style.setProperty('--gc-lh', String(T.caption.lh));
  root.style.setProperty('--gc-lines', String(T.caption.lines));
  px('--gc-maxw', S.mobile ? W - 2 * mpad : T.caption.maxW * W);
  px('--gc-gap', T.caption.gap * H);
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk');
  if (ticket) {
    ticket.style.setProperty('--cb-d', `${(T.ticket.d * H).toFixed(2)}px`);
    ticket.style.setProperty('--cb-fs', `${(T.ticket.font * H).toFixed(2)}px`);
  }

  /* logo: sol alt, iki parçalı (uzun / kısa kuralı logo.ts); çizgi uzantıları ekranın sol kenarına kadar */
  const h = T.logo.h * H;
  const left = S.mobile ? mpad : T.info.left * W;
  const L = layoutLogo(pickLogo(id, h, W, S.mobile), h, snapPx(left));
  dom.brand.style.width = `${L.width}px`;
  dom.brand.style.height = `${h}px`;
  dom.brand.style.top = `${snapPx(S.vh - S.safeBottom - T.logo.bottom * H - h)}px`;
  dom.brand.innerHTML = L.html;
}
