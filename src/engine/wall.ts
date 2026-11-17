/* ROTA2 daire grid'i. Bütün ölçüler ekran yüksekliği H'ye oranlı (kimliğin `ring` token'ları).

   Grid: daire çapı D, kolon aralığı P = D / pitch (merkezden merkeze); ekranın yatay ortasında bir
   kolon merkezi, kenarlarda kesik kolonlar. İki satır, satır aralığı R. Her öğe: isim (tek satır),
   noktalı sayaç ve daire (içinde fotoğrafın odak noktasına göre yakınlaştırılmış duotone detayı).
   Yalnızca görünen kolonlar DOM'da; hareket yalnızca transform.

   Kolon ayraçları: iki kolonun tam ortasında ekranın üstünden altına dikey çizgi, her satırda sayaç
   hizasında bir elmas. Sarkaç: üst uçtan asılı; kameranın yatay hızının ters yönüne geri kalır, duvar
   durunca yay-sönümle dikleşir (yalnızca rotate).

   Alt bant (tam genişlik, grid'in ve ayraçların üstünde): logo solda, Üye Ol / Giriş sağda.
   Açılmış öğe: tıklanan dairenin içinden büyüyen dairesel maskeyle (iris) renkli fotoğraf bütün ekranı
   kaplar; aynı anda bant yükselir, içinde metin kolonu ve dört daire düğme belirir. Detay künyeyi
   açar (bant içerik kadar yükselir). Video ya da bandın üstündeki görsel: bant aşağı inip ekrandan
   çıkar, tam ekran video davranışı çalışır. Kapanınca bant iner, görsel iris ile daireye küçülür. */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Media } from './media';
import { clamp, mod, snapPx, type State } from './state';
import type { Identity, Show, TemplateContext } from './types';
import { placePhoto } from './crop';
import type { FullVideoPlayer } from './fullVideo';

export interface Wall {
  rebuild(): void;
  render(): void;
  /** Ekran noktasındaki hedef */
  hit(x: number, y: number): { i: number; j: number; part: 'card' | 'photo' | 'act' | 'open'; act?: string; el?: HTMLElement } | null;
  /** (i, j) öğesini aç */
  open(i: number, j: number): gsap.core.Timeline;
  close(): gsap.core.Timeline | null;
  /** Açık öğenin fotoğrafı tam ekran (bant çıkar, video); false: tam ekrandan doğrudan grid'e dön */
  fullscreen(on: boolean): void;
  /** Tam ekranda yüklü bir video var mı (başlamazsa kaldırılır) */
  videoActive(): boolean;
  /** Halkanın kolon cinsinden periyodu: (i + periyot, j) aynı öğedir */
  ringPeriod(): number;
  /** Yatay telefon katmanı: videoyu duraklat (on) / sessiz sürdür (off) */
  suspend(on: boolean): void;
  /** Açık öğenin künyesini aç / kapat (on verilmezse değiştir) */
  credits(on?: boolean): void;
  creditsOpen(): boolean;
  /** Mıknatıs hareketi: kolonlar açık boşlukla başlayıp merkezden dışa birbirine çekilir */
  magnet(): void;
  tapOpen(x: number, y: number): void;
  creditsWheel(x: number, y: number, dy: number): boolean;
  scrollOpen(dy: number): void;
  flingOpen(v: number): void;
  stepOpen(dir: 1 | -1): void;
  stopOpen(): void;
  refresh(): void;
  visible(): Element[];
}

interface Item {
  key: string;
  i: number;
  j: number;
  show: Show;
  el: HTMLElement;
  name: HTMLElement;
  disc: HTMLElement;
  tf: string;
}

interface Sep {
  i: number;
  el: HTMLElement;
  /** Açı (°) ve açısal hız (°/sn); frekans çarpanı (küçük rastgele faz farkı) */
  a: number;
  v: number;
  k: number;
  tf: string;
}

interface Opened {
  i: number;
  j: number;
  show: Show;
  ar: number;
  iris: HTMLElement;
  duo: HTMLImageElement | null;
  col: HTMLImageElement | null;
  /** İris ilerlemesi (0: daire, 1: tam ekran) */
  p: { v: number };
  /** Dairenin ekrandaki merkezi (açıldığı andaki) */
  cx: number;
  cy: number;
  /** Duvardaki görünür kopyası (açıkken gizli değil; iris üstünü örter) */
  closing: boolean;
  tl: gsap.core.Timeline | null;
}

export function createWall(o: {
  S: State;
  id: Identity;
  motion: Motion;
  media: Media;
  shows: Show[];
  tctx: () => TemplateContext;
  layer: HTMLElement;
  top: HTMLElement;
  /** Tam ekran videosu */
  video: FullVideoPlayer;
  /** Tam ekran delikli doku katmanı */
  texture: HTMLElement;
  /** Tam ekran başlığı ve sayacı katmanı */
  title: HTMLElement;
  /** Tam ekran sahne etiketi katmanı */
  stage: HTMLElement;
  /** Alt bant düğmeleri (Üye Ol / Giriş) */
  band: HTMLElement;
  /** Kapatma ikonu (açılmış öğede ve tam ekranda) */
  close: HTMLElement;
  onCreate(el: Element): void;
}): Wall {
  const { S, id, motion, media, shows } = o;
  const G = id.ring;
  const Wl = id.wall;
  const N = shows.length;
  const items = new Map<string, Item>();
  const seps = new Map<number, Sep>();
  let visibleEls: Element[] = [];
  const key = (i: number, j: number) => `${i},${j}`;
  /** Halka: (2·kolon + satır) — tekrarsız */
  const showAt = (i: number, j: number) => shows[mod(2 * i + j, N)];
  const f = (n: number, d = 2) => n.toFixed(d);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  /* ---------- ölçüler ---------- */
  const dims = () => {
    const H = S.vh;
    const D = S.cw;
    return {
      H, D, P: S.stepX, R: S.ch,
      nameY: G.nameY * H, nameS: G.nameSize * H,
      cdY: G.counterY * H, cdS: G.counterSize * H,
      discTop: G.discTop * H,
      dH: G.sep.diamondH * H, dW: G.sep.diamondW * H,
      pad: snapPx(G.band.logoPad * H),
      /** Bant: kapalı / açık / künye en fazla (px; mobilde alt güvenli alan dahil) */
      bandClosed: S.band,
      bandOpen: snapPx(H * (S.mobile ? G.band.openMobile : G.band.open) + S.safeBottom),
      bandMax: snapPx(H * G.band.credits + S.safeBottom),
      btnD: S.mobile ? (S.band - S.safeBottom) * G.button.mobile : G.button.d * H,
      btnGap: G.button.gap * H,
      btnRight: G.button.right * H,
      btnFont: G.button.font * H,
    };
  };
  let M = dims();
  const colCenter = (i: number) => (i - S.cx) * M.P + M.D / 2;
  const discCenter = (i: number, j: number) => ({ x: colCenter(i) + magDx(i), y: j * M.R + M.discTop + M.D / 2 });

  /* ---------- bant, logo, açık öğe paneli ---------- */
  const strip = document.querySelector<HTMLElement>('.band');
  const brand = document.querySelector<HTMLElement>('.brand');
  /** Görünen bant yüksekliği (px) ve logonun açık konuma geçişi (0..1) */
  const bh = { v: S.band };
  const lo = { v: 0 };
  /** Metin ve düğmelerin opaklığı */
  const tx = { v: 0 };
  /** Üye Ol / Giriş görünürlüğü */
  let memberOn = true;

  const panel = document.createElement('div');
  panel.className = 'obp';
  panel.innerHTML = '<div class="obt"><div class="obs"></div></div><div class="obb"></div>';
  document.body.append(panel);
  const obt = panel.querySelector<HTMLElement>('.obt')!;
  const obs = panel.querySelector<HTMLElement>('.obs')!;
  const obb = panel.querySelector<HTMLElement>('.obb')!;
  /** Metin kolonunun dikey kaydırması (px) */
  const scroll = { v: 0 };
  let scrollTween: gsap.core.Tween | null = null;
  const scrollMax = () => Math.max(0, obs.offsetHeight - obt.clientHeight);
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b || !S.open || S.full) return;
    if (b.dataset.act === 'video') api.fullscreen(true);
    else if (b.dataset.act === 'detail') api.credits();
  });
  obt.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      scrollTween?.kill();
      scroll.v = clamp(scroll.v + e.deltaY, 0, scrollMax());
    },
    { passive: false },
  );
  // dokunmatik / fare ile sürükleyerek kaydırma
  obt.addEventListener('pointerdown', (e) => {
    if (scrollMax() <= 0) return;
    scrollTween?.kill();
    const y0 = e.clientY;
    const s0 = scroll.v;
    obt.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => void (scroll.v = clamp(s0 - (ev.clientY - y0), 0, scrollMax()));
    const up = () => {
      obt.removeEventListener('pointermove', move);
      obt.removeEventListener('pointerup', up);
      obt.removeEventListener('pointercancel', up);
    };
    obt.addEventListener('pointermove', move);
    obt.addEventListener('pointerup', up);
    obt.addEventListener('pointercancel', up);
  });

  /** Logonun ölçüsü (index.ts çizer) */
  const logoBox = () => ({ w: brand?.offsetWidth ?? 0, h: brand?.offsetHeight ?? 0 });

  /** Açık öğe panelinin yerleşimi: web'de logonun sağında metin kolonu + sağda düğmeler; mobilde logonun
      altında tam genişlikte metin, düğmeler metnin altında */
  function layoutPanel() {
    const L = logoBox();
    const st = panel.style;
    st.setProperty('--ot', `${f(G.open.titleSize * M.H)}px`);
    st.setProperty('--oi', `${f(G.open.introSize * M.H)}px`);
    st.setProperty('--oi-lh', String(G.open.introLh));
    st.setProperty('--oi-gap', `${f(G.open.introGap * M.H)}px`);
    st.setProperty('--cd-s', `${f(M.cdS)}px`);
    st.setProperty('--cd-ls', `${G.counterTrack}em`);
    st.setProperty('--cb-d', `${f(M.btnD)}px`);
    st.setProperty('--cb-fs', `${f(M.btnFont)}px`);
    st.setProperty('--cb-gap', `${f(M.btnGap)}px`);
    if (S.mobile) {
      obt.style.left = `${M.pad}px`;
      obt.style.top = `${f(M.pad + L.h + M.pad)}px`;
      obt.style.width = `${f(S.vw - 2 * M.pad)}px`;
      obb.style.cssText = '';
      obb.classList.add('obb-m');
      obs.append(obb);
    } else {
      obt.style.left = `${f(M.pad + L.w + G.open.textGap * M.H)}px`;
      obt.style.top = `${M.pad}px`;
      obt.style.width = `${f(S.vw * G.open.textW)}px`;
      obb.classList.remove('obb-m');
      panel.append(obb);
      obb.style.cssText = `top:${M.pad}px;right:${f(M.btnRight)}px`;
    }
  }

  /** Bant, logo ve panelin konumu: her karede (değiştiyse) */
  let bandCache = '';
  function applyBand() {
    const vh = S.vh;
    const b = bh.v;
    const L = logoBox();
    // logo: kapalı bantta dikeyde ortalı; açık bantta sol üst köşede (üst boşluk logo-pad). Bant
    // ekrandan çıkarken (tam ekran) logo kapalı bandaki yerinde kalır
    const cOff = (M.bandClosed - S.safeBottom - L.h) / 2;
    const closedTop = vh - M.bandClosed + cOff;
    const lt = b >= M.bandClosed ? vh - b + lerp(cOff, M.pad, lo.v) : closedTop;
    const textH = Math.max(0, b - parseFloat(obt.style.top || '0') - M.pad - S.safeBottom);
    const k = `${f(b)}|${f(lt)}|${f(tx.v, 3)}|${f(textH)}|${f(scroll.v)}`;
    if (k === bandCache) return;
    bandCache = k;
    if (strip) strip.style.transform = `translate3d(0,${f(snapPx(vh - b))}px,0)`;
    if (brand) brand.style.transform = `translate3d(0,${f(snapPx(lt))}px,0)`;
    panel.style.transform = `translate3d(0,${f(snapPx(vh - b))}px,0)`;
    panel.style.height = `${f(b)}px`;
    obt.style.height = `${f(textH)}px`;
    panel.style.opacity = f(tx.v, 3);
    panel.style.visibility = tx.v > 0.001 ? 'visible' : 'hidden';
    obs.style.transform = `translate3d(0,${f(-snapPx(scroll.v))}px,0)`;
  }

  function members(on: boolean) {
    if (memberOn === on) return;
    memberOn = on;
    gsap.to(o.band, { autoAlpha: on ? 1 : 0, duration: G.open.textFade, ease: motion.ease.fade, overwrite: true });
  }

  /* ---------- kapatma ikonu ---------- */
  let closeOn = false;
  function closeIcon(on: boolean) {
    if (closeOn === on) return;
    closeOn = on;
    gsap.to(o.close, { autoAlpha: on ? 1 : 0, duration: motion.dur('scrollbarIn'), ease: motion.ease.fade, overwrite: true });
  }

  /* ---------- tam ekran başlığı ve sayacı ---------- */
  let titleWait: gsap.core.Tween | null = null;
  let titleTl: gsap.core.Timeline | null = null;
  const titleParts = () => [...o.title.children] as HTMLElement[];
  function titleClear() {
    titleWait?.kill();
    titleTl?.kill();
    titleWait = titleTl = null;
    gsap.killTweensOf(titleParts());
    o.title.innerHTML = '';
    o.title.style.visibility = 'hidden';
    gsap.killTweensOf([...o.stage.children]);
    o.stage.innerHTML = '';
    o.stage.style.visibility = 'hidden';
  }
  /** Tam ekran fotoğrafı yerine oturunca: başlık soldan kayıp ortada durur, sayaç ardından aşağıdan belirir */
  function titleShow(show: Show) {
    titleClear();
    const T = id.fullTitle;
    o.title.innerHTML = id.templates.fullTitle(show, o.tctx());
    o.onCreate(o.title);
    const [t, k, hr] = titleParts();
    let size = S.vw * T.size;
    t.style.fontSize = `${size}px`;
    const max = S.vw * T.maxWidth;
    const w0 = t.getBoundingClientRect().width;
    if (w0 > max) {
      size *= max / w0;
      t.style.fontSize = `${size}px`;
    }
    let cs = size * T.counter;
    k.style.fontSize = `${cs}px`;
    hr.style.fontSize = `${cs}px`;
    if (S.mobile) {
      const cw0 = (k.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 0;
      if (cw0 > max) {
        cs *= max / cw0;
        k.style.fontSize = `${cs}px`;
        hr.style.fontSize = `${cs}px`;
      }
    }
    const gap = size * T.gap;
    const lh = t.getBoundingClientRect().height;
    const kh = k.getBoundingClientRect().height;
    const hh = hr.getBoundingClientRect().height;
    const top0 = (S.vh - (lh + gap + kh + gap + hh)) / 2;
    t.style.position = 'relative';
    t.style.top = `${top0 + lh / 2 - S.vh / 2}px`;
    k.style.top = `${top0 + lh + gap}px`;
    hr.style.top = `${top0 + lh + gap + kh + gap}px`;
    o.title.style.visibility = 'visible';
    o.stage.innerHTML = id.templates.stageLabel(show, M.P, o.tctx());
    const sl = o.stage.firstElementChild as HTMLElement | null;
    o.stage.style.visibility = sl ? 'visible' : 'hidden';
    if (motion.reduced) return;
    const tw = t.getBoundingClientRect().width;
    gsap.set(t, { x: -(S.vw / 2 + tw / 2) });
    gsap.set([k, hr], { autoAlpha: 0, y: cs * 0.6 });
    titleTl = gsap
      .timeline()
      .to(t, { x: 0, duration: motion.dur('titleIn'), ease: 'expo.out' })
      .to(k, { y: 0, autoAlpha: 1, duration: motion.dur('counterIn'), ease: 'power3.out' }, `>${motion.dur('counterDelay')}`)
      .to(hr, { y: 0, autoAlpha: 1, duration: motion.dur('counterIn'), ease: 'power3.out' }, `<${motion.dur('hourDelay')}`);
    if (sl) titleTl.fromTo(sl, { y: -sl.getBoundingClientRect().height * 0.6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: motion.dur('stageIn'), ease: 'power3.out' }, 0);
  }
  /** Çıkış başlarken başlık ve sayaç birlikte sağa kayarak ekrandan çıkar */
  function titleHide() {
    titleWait?.kill();
    titleTl?.kill();
    const parts = titleParts();
    if (!parts.length || motion.reduced) {
      titleClear();
      return Promise.resolve();
    }
    const sl = o.stage.firstElementChild;
    if (sl) gsap.to(sl, { autoAlpha: 0, duration: motion.dur('titleOut'), ease: motion.ease.fade, overwrite: true });
    return new Promise<void>((res) => {
      gsap.to(parts, {
        x: (_k: number, el: HTMLElement) => S.vw / 2 + el.getBoundingClientRect().width / 2 + 2,
        duration: motion.dur('titleOut'), ease: 'power2.in', overwrite: true,
        onComplete: () => {
          titleClear();
          res();
        },
      });
    });
  }
  const texture = (on: boolean, delay = 0, done?: () => void) =>
    gsap.to(o.texture, {
      autoAlpha: on ? 1 : 0, duration: motion.dur(on ? 'textureIn' : 'textureOut'), delay, ease: motion.ease.fade, overwrite: true,
      onComplete: done,
    });

  /* ---------- mıknatıs: kolonlar açık boşlukla başlar, merkezden dışa çekilir ---------- */
  const mag = { t: { v: 0 }, total: 0, center: 0, tween: null as gsap.core.Tween | null };
  const magEase = gsap.parseEase(Wl.magnetEase);
  let magOn = false;
  function magnet() {
    if (motion.reduced) return;
    mag.center = S.cx + (S.vw / 2 - M.D / 2) / M.P;
    mag.total = motion.dur('magnet') + 6 * motion.dur('magnetStagger');
    mag.t.v = 0;
    magOn = true;
    mag.tween?.kill();
    mag.tween = gsap.to(mag.t, { v: mag.total, duration: mag.total, ease: 'none', onComplete: () => void (magOn = false) });
  }
  /** Kolonun mıknatıs kayması (px): boşluk fazlası × merkeze uzaklık, yavaşça sıfıra oturur */
  function magDx(i: number) {
    if (!magOn) return 0;
    const extra = (Wl.magnetGap - 1) * Wl.gap;
    const d = i - mag.center;
    const delay = Math.min(6, Math.abs(d)) * motion.dur('magnetStagger');
    const k = 1 - magEase(clamp((mag.t.v - delay) / motion.dur('magnet'), 0, 1));
    return extra * d * k;
  }

  /* ---------- öğe ---------- */
  /** Daire içindeki fotoğraf: odak noktası dairenin merkezinde, kaplama boyutunun photoZoom katı */
  function discFrame(show: Show, ar: number) {
    const D = M.D;
    const ih = Math.max(D, D / ar) * G.photoZoom;
    const iw = ih * ar;
    const x = clamp(D / 2 - (show.focus.x / 100) * iw, D - iw, 0);
    const y = clamp(D / 2 - (show.focus.y / 100) * ih, D - ih, 0);
    return { x, y, w: iw, h: ih };
  }

  function fitName(it: Item) {
    const el = it.name;
    el.style.fontSize = `${f(M.nameS)}px`;
    const w = el.scrollWidth;
    if (w > M.D) el.style.fontSize = `${f((M.nameS * M.D) / w, 3)}px`;
  }

  function make(i: number, j: number): Item {
    const show = showAt(i, j);
    const el = document.createElement('div');
    el.className = 'it';
    el.dataset.i = String(i);
    el.dataset.j = String(j);
    el.style.width = `${f(M.D)}px`;
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const fr = discFrame(show, ar);
    const img = media.img(show, { width: fr.w, height: fr.h, aspect: ar }).replace('class="ph phn"', 'class="ph phn phm"');
    el.innerHTML =
      id.templates.ringItem(show, o.tctx()) +
      `<div class="rd" style="top:${f(M.discTop)}px;width:${f(M.D)}px;height:${f(M.D)}px">${img}</div>`;
    const im = el.querySelector<HTMLImageElement>('.rd img');
    if (im) im.style.transform = `translate3d(${f(fr.x)}px,${f(fr.y)}px,0)`;
    const rn = el.querySelector<HTMLElement>('.rn')!;
    const rc = el.querySelector<HTMLElement>('.rc')!;
    rn.style.cssText = `top:${f(M.nameY - M.nameS / 2)}px;height:${f(M.nameS)}px;line-height:${f(M.nameS)}px`;
    rc.style.cssText = `top:${f(M.cdY - M.cdS / 2)}px;height:${f(M.cdS)}px;line-height:${f(M.cdS)}px;font-size:${f(M.cdS)}px;letter-spacing:${G.counterTrack}em`;
    o.layer.append(el);
    o.onCreate(el);
    const it: Item = { key: key(i, j), i, j, show, el, name: rn, disc: el.querySelector<HTMLElement>('.rd')!, tf: '' };
    fitName(it);
    return it;
  }

  function makeSep(i: number): Sep {
    const el = document.createElement('div');
    el.className = 'sp';
    const w = G.sep.width;
    el.style.cssText = `width:${w}px;height:${f(S.vh)}px;margin-left:${-w / 2}px`;
    let html = '';
    for (let k = 0; k < S.rows; k++) {
      const cy = M.cdY + k * M.R;
      html += `<i style="left:${f(w / 2 - M.dW / 2)}px;top:${f(cy - M.dH / 2)}px;width:${f(M.dW)}px;height:${f(M.dH)}px"></i>`;
    }
    el.innerHTML = html;
    o.layer.append(el);
    // küçük rastgele faz farkı: her ayracın frekansı biraz farklı, başlangıç hızı küçük rastgele
    const h = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    return { i, el, a: 0, v: 0, k: 1 + (h * 2 - 1) * G.sep.phase, tf: '' };
  }

  /* ---------- sarkaç ---------- */
  let lastCx = S.cx;
  let velX = 0;
  function swing(dt: number) {
    // kameranın ekrandaki yatay hızı (px/sn; içerik sola giderken negatif), hafif yumuşatılmış
    const raw = dt > 0 ? (-(S.cx - lastCx) * M.P) / dt : 0;
    lastCx = S.cx;
    velX += (raw - velX) * clamp(dt * 12, 0, 1);
    if (motion.reduced) return;
    const max = G.sep.maxAngle;
    // içerik sola giderken çizginin alt ucu sağa geri kalır: rotate negatif
    const target = clamp(velX * G.sep.gain, -max, max);
    const z = G.sep.damping;
    const wd = Math.PI / G.sep.halfPeriod;
    const w0 = wd / Math.sqrt(1 - z * z);
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (const s of seps.values()) {
      const w = w0 * s.k;
      for (let n = 0; n < steps; n++) {
        const acc = -w * w * (s.a - target) - 2 * z * w * s.v;
        s.v += acc * h;
        s.a += s.v * h;
      }
      s.a = clamp(s.a, -max, max);
    }
  }

  /* ---------- açık öğe: iris ---------- */
  let op: Opened | null = null;
  let credOn = false;
  /** Tam ekrandan dönüş ya da kapanma hareketi sürüyor (akış bekler) */
  let exiting = false;
  let closingTl: gsap.core.Timeline | null = null;
  let autoTimer: gsap.core.Tween | null = null;
  const clearAuto = () => {
    autoTimer?.kill();
    autoTimer = null;
  };

  function makeIris(show: Show, i: number, j: number): Opened {
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const el = document.createElement('div');
    el.className = 'iris';
    const cov = placePhoto(ar, S.vw, S.vh, show.focus);
    const one = (cls: string) =>
      media.img(show, { width: S.vw, height: cov.h, aspect: ar }).replace('class="ph phn"', `class="ph phn ${cls}"`);
    el.innerHTML = one('phm') + one('phc');
    o.top.append(el);
    const [duo, col] = [...el.querySelectorAll<HTMLImageElement>('img')];
    for (const im of [duo, col]) if (im) im.sizes = `${Math.round(S.vw)}px`;
    const c = discCenter(i, j);
    return { i, j, show, ar, iris: el, duo: duo ?? null, col: col ?? null, p: { v: 0 }, cx: c.x, cy: c.y, closing: false, tl: null };
  }

  let irisCache = '';
  function applyIris(x: Opened) {
    const p = x.p.v;
    const r0 = M.D / 2;
    const r1 = Math.hypot(Math.max(x.cx, S.vw - x.cx), Math.max(x.cy, S.vh - x.cy)) + 1;
    const r = lerp(r0, r1, p);
    // fotoğraf: dairedeki çerçeveden (odak merkezde, yakınlaştırılmış) tam ekran kaplamaya
    const fr = discFrame(x.show, x.ar);
    const from = { x: x.cx - M.D / 2 + fr.x, y: x.cy - M.D / 2 + fr.y, w: fr.w, h: fr.h };
    const to = placePhoto(x.ar, S.vw, S.vh, x.show.focus);
    const q = { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p), h: lerp(from.h, to.h, p) };
    const k = `${f(r)}|${f(q.x)}|${f(q.y)}|${f(q.h)}`;
    if (k === irisCache) return;
    irisCache = k;
    x.iris.style.clipPath = `circle(${f(r)}px at ${f(x.cx)}px ${f(x.cy)}px)`;
    const s = q.h / to.h;
    const tf = `translate3d(${f(q.x)}px,${f(q.y)}px,0) scale(${f(s, 5)})`;
    for (const im of [x.duo, x.col]) {
      if (!im) continue;
      im.style.width = `${f(to.w)}px`;
      im.style.height = `${f(to.h)}px`;
      im.style.transform = tf;
    }
    // renkli kopya irisin büyümesiyle belirir; tam açıkken duotone kopya çizilmez
    if (x.col) x.col.style.opacity = f(clamp(p * 2.5, 0, 1), 3);
    if (x.duo) x.duo.style.visibility = p >= 0.999 ? 'hidden' : 'visible';
  }

  function dropIris(x: Opened | null) {
    if (!x) return;
    x.tl?.kill();
    gsap.killTweensOf(x.p);
    x.iris.remove();
    irisCache = '';
  }

  /** Metin kolonu: başlık, sayaç, tanıtım; künye Detay ile */
  function fillPanel(show: Show) {
    obs.innerHTML = id.templates.openText(show, o.tctx());
    obb.innerHTML = id.templates.circleButtons(
      [['Video', 'video'], ['Detay', 'detail'], ['Bilet Al', 'ticket'], ['Paylaş', 'share']],
      o.tctx(),
    );
    obs.querySelector('.oc .cd')?.setAttribute('style', `font-size:${f(M.cdS)}px;letter-spacing:${G.counterTrack}em`);
    layoutPanel();
    o.onCreate(obs);
    scroll.v = 0;
  }
  function setDetail(on: boolean) {
    obb.querySelector('[data-act="detail"]')?.setAttribute('aria-pressed', String(on));
  }

  /** Künye açıkken bandın hedef yüksekliği: içerik kadar, en fazla bandMax */
  function creditsBand() {
    const top = parseFloat(obt.style.top || '0');
    const need = top + obs.offsetHeight + M.pad + S.safeBottom;
    return clamp(need, M.bandOpen, M.bandMax);
  }

  function bandTo(v: number, dur: number, ease: string, extra: gsap.TweenVars = {}) {
    return gsap.to(bh, { v, duration: motion.reduced ? 0 : dur, ease, overwrite: true, ...extra });
  }

  function credits(on: boolean) {
    if (!op || S.full) return;
    const ok = obs.querySelector<HTMLElement>('.ok');
    if (!ok) return;
    credOn = on;
    setDetail(on);
    scrollTween?.kill();
    if (on) {
      if (!ok.childElementCount) {
        const w = obt.clientWidth;
        ok.innerHTML = id.templates.credits(op.show, w, 0, w, o.tctx());
        o.onCreate(ok);
      }
      ok.hidden = false;
      bandTo(creditsBand(), motion.dur('credits'), G.open.ease);
    } else {
      gsap.to(scroll, { v: 0, duration: motion.dur('credits'), ease: G.open.ease, overwrite: true });
      bandTo(M.bandOpen, motion.dur('credits'), G.open.ease, {
        onComplete: () => {
          if (!credOn) ok.hidden = true;
        },
      });
    }
  }

  /** Kapanma: bant iner, metin ve düğmeler kaybolur, Üye Ol / Giriş gelir; görsel iris ile daireye küçülür */
  function shut(x: Opened, done?: () => void) {
    x.closing = true;
    credOn = false;
    setDetail(false);
    scrollTween?.kill();
    exiting = true;
    // dairenin o anki yeri (kamera açıkken durur)
    const c = discCenter(x.i, x.j);
    x.cx = c.x;
    x.cy = c.y;
    members(true);
    const T = motion.reduced ? 0 : G.open.irisOut;
    const tl = gsap.timeline({
      onComplete: () => {
        dropIris(x);
        if (op === x) op = null;
        exiting = false;
        closingTl = null;
        const ok = obs.querySelector<HTMLElement>('.ok');
        if (ok) ok.hidden = true;
        done?.();
      },
    });
    tl.to(tx, { v: 0, duration: Math.min(T, G.open.textFade), ease: motion.ease.fade, overwrite: true }, 0);
    tl.to(bh, { v: M.bandClosed, duration: T, ease: G.open.ease, overwrite: true }, 0);
    tl.to(lo, { v: 0, duration: T, ease: G.open.ease, overwrite: true }, 0);
    tl.to(x.p, { v: 0, duration: T, ease: G.open.ease, overwrite: true }, 0);
    x.tl = tl;
    closingTl = tl;
    return tl;
  }

  /* ---------- çizim ---------- */
  function render() {
    const dt = Math.min(0.1, gsap.ticker.deltaRatio() / 60);
    // grid'e dönüş / birleşme hareketi sürerken akış bekler
    S.merging = exiting || magOn;
    if (!S.full && !exiting) {
      if (o.texture.style.visibility !== 'hidden' && +gsap.getProperty(o.texture, 'opacity') > 0) {
        gsap.killTweensOf(o.texture);
        gsap.set(o.texture, { autoAlpha: 0 });
      }
      if (o.title.childElementCount || o.stage.childElementCount) titleClear();
    }
    swing(dt);
    const i0 = Math.floor(S.cx) - 1;
    const i1 = Math.floor(S.cx + S.vw / M.P) + 1;
    const vis: Element[] = [];
    const seen = new Set<string>();
    for (let i = i0; i <= i1; i++) {
      const x = colCenter(i) + magDx(i);
      for (let j = 0; j < S.rows; j++) {
        const k = key(i, j);
        let it = items.get(k);
        if (!it) {
          it = make(i, j);
          items.set(k, it);
        }
        seen.add(k);
        const tf = `translate3d(${f(x - M.D / 2)}px,${f(j * M.R)}px,0)`;
        if (it.tf !== tf) {
          it.el.style.transform = tf;
          it.tf = tf;
        }
        vis.push(it.el);
      }
    }
    for (const [k, it] of items) {
      if (seen.has(k)) continue;
      it.el.remove();
      items.delete(k);
    }
    // ayraçlar: i. kolon ile (i + 1). kolonun tam ortasında
    for (let i = i0 - 1; i <= i1; i++) {
      let s = seps.get(i);
      if (!s) {
        s = makeSep(i);
        seps.set(i, s);
      }
      const x = colCenter(i) + M.P / 2 + (magDx(i) + magDx(i + 1)) / 2;
      const tf = `translate3d(${f(x)}px,0,0) rotate(${f(s.a, 3)}deg)`;
      if (s.tf !== tf) {
        s.el.style.transform = tf;
        s.tf = tf;
      }
    }
    for (const [i, s] of seps) {
      if (i >= i0 - 1 && i <= i1) continue;
      s.el.remove();
      seps.delete(i);
    }
    if (op) applyIris(op);
    applyBand();
    if (op) vis.push(obs);
    visibleEls = vis;
  }

  const api: Wall = {
    rebuild() {
      o.video.remove();
      clearAuto();
      titleClear();
      closingTl?.kill();
      closingTl = null;
      dropIris(op);
      op = null;
      credOn = false;
      exiting = false;
      gsap.killTweensOf([bh, lo, tx, scroll, o.band]);
      M = dims();
      bh.v = M.bandClosed;
      lo.v = 0;
      tx.v = 0;
      scroll.v = 0;
      bandCache = '';
      memberOn = true;
      gsap.set(o.band, { autoAlpha: 1 });
      closeOn = false;
      gsap.killTweensOf(o.close);
      gsap.set(o.close, { autoAlpha: 0 });
      gsap.killTweensOf(o.texture);
      gsap.set(o.texture, { autoAlpha: 0 });
      items.forEach((it) => it.el.remove());
      items.clear();
      seps.forEach((s) => s.el.remove());
      seps.clear();
      lastCx = S.cx;
      velX = 0;
      S.open = null;
      S.full = false;
    },
    render,
    hit(x, y) {
      if (S.open) {
        // açık öğe: bandın üstündeki görsel tam ekranı açar
        return { i: S.open.i, j: S.open.j, part: y < S.vh - bh.v ? 'photo' : 'open' };
      }
      // bandın üstüne tıklama daireyi açmaz
      if (y >= S.vh - bh.v) return null;
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const it = el?.closest('.rd')?.closest<HTMLElement>('.it');
      if (!it) return null;
      return { i: +it.dataset.i!, j: +it.dataset.j!, part: 'card' };
    },
    open(i, j) {
      const tl = gsap.timeline();
      if (S.full) return tl;
      // önceki (açık ya da kapanmakta olan) iris hemen kaldırılır
      closingTl?.kill();
      closingTl = null;
      exiting = false;
      const wasOpen = !!op && !op.closing;
      dropIris(op);
      o.video.remove();
      credOn = false;
      const show = showAt(i, j);
      const x = makeIris(show, i, j);
      op = x;
      S.open = { i, j };
      S.full = false;
      fillPanel(show);
      setDetail(false);
      const T = motion.reduced ? 0 : G.open.iris;
      const E = G.open.ease;
      tl.to(x.p, { v: 1, duration: T, ease: E }, 0);
      tl.to(bh, { v: M.bandOpen, duration: T, ease: E, overwrite: true }, 0);
      tl.to(lo, { v: 1, duration: T, ease: E, overwrite: true }, 0);
      // metin ve düğmeler bant yükselirken kısa gecikmeyle belirir
      if (wasOpen) tx.v = 0;
      tl.to(tx, { v: 1, duration: motion.reduced ? 0 : G.open.textFade, ease: motion.ease.fade, overwrite: true }, motion.reduced ? 0 : G.open.textDelay);
      x.tl = tl;
      members(false);
      closeIcon(true);
      // videosu varsa oynatıcı arka planda hemen kurulur (görünmez; tam ekranı açan tıklamada oynar)
      o.video.prepare(show.fullVideo);
      return tl;
    },
    close() {
      const x = op;
      if (!x || x.closing) return null;
      S.open = null;
      S.full = false;
      closeIcon(false);
      o.video.remove();
      return shut(x, () => magnet());
    },
    fullscreen(on) {
      const x = op;
      if (!x || x.closing) return;
      if (on) {
        if (S.full || exiting) return;
        S.full = true;
        credOn = false;
        setDetail(false);
        // görsel zaten ekranı kaplıyor (iris tamamlanmamışsa tamamlanır); bant aşağı inerek ekrandan çıkar
        const T = motion.reduced ? 0 : G.open.bandOut;
        gsap.to(x.p, { v: 1, duration: (1 - x.p.v) * G.open.iris, ease: 'power2.out', overwrite: true });
        gsap.to(tx, { v: 0, duration: T * 0.6, ease: motion.ease.fade, overwrite: true });
        bandTo(0, T, 'power2.in');
        const settle = T;
        texture(true, settle);
        titleWait?.kill();
        titleWait = gsap.delayedCall(settle, () => {
          if (S.full && op === x && !exiting) titleShow(x.show);
        });
        clearAuto();
        o.video.start(x.show.fullVideo, () => {
          clearAuto();
          if (S.mobile) return;
          autoTimer = gsap.delayedCall(motion.dur('autoReturn'), () => {
            if (S.full && op === x) api.fullscreen(false);
          });
        });
        return;
      }
      if (!S.full || exiting) return;
      // çıkış doğrudan grid'e: başlık çıkar, videodan fotoğrafa geçilir, doku kaybolur; sonra bant
      // kapalı yüksekliğine gelir ve görsel iris ile daireye küçülür
      exiting = true;
      clearAuto();
      closeIcon(false);
      titleHide()
        .then(() => o.video.hide())
        .then(() => new Promise<void>((res) => void texture(false, 0, res)))
        .then(() => {
          if (!S.full || op !== x) {
            exiting = false;
            return;
          }
          S.full = false;
          S.open = null;
          shut(x, () => {
            o.video.remove();
            magnet();
          });
        });
    },
    videoActive: () => o.video.active(),
    // showAt = shows[(2i + j) mod N] → 2·periyot ≡ 0 (mod N)
    ringPeriod: () => (N % 2 === 0 ? N / 2 : N),
    suspend(on) {
      o.video.suspend(on);
    },
    credits(on) {
      credits(on ?? !credOn);
    },
    creditsOpen: () => credOn,
    magnet,
    tapOpen() {},
    creditsWheel: () => false,
    scrollOpen(dy) {
      if (!op) return;
      scrollTween?.kill();
      scroll.v = clamp(scroll.v + dy, 0, scrollMax());
    },
    flingOpen(vel) {
      if (!op || Math.abs(vel) < 30) return;
      scrollTween?.kill();
      scrollTween = gsap.to(scroll, { inertia: { v: { velocity: vel, min: 0, max: scrollMax() }, resistance: 1400 } });
    },
    stepOpen(dir) {
      if (!op) return;
      scrollTween?.kill();
      scrollTween = gsap.to(scroll, { v: clamp(scroll.v + dir * obt.clientHeight * 0.6, 0, scrollMax()), duration: motion.dur('scroll'), ease: motion.ease.page });
    },
    stopOpen() {
      scrollTween?.kill();
      scrollTween = null;
    },
    refresh() {
      items.forEach((it) => {
        o.onCreate(it.el);
        fitName(it);
      });
    },
    visible: () => visibleEls,
  };
  return api;
}
