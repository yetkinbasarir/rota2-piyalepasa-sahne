/* ROTA2 çapraz 3B daire galerisi (CSS 3B; WebGL yok). Bütün ölçüler kimliğin `gallery` token'ları.

   Daireler: her öğe düz, kenarsız bir daire (yalnızca dairesel görsel; odak noktası merkezde, normal
   kaplamanın photoZoom katı). Hafif bir eğri boyunca dizilir: ortadaki dairenin merkezi `center`,
   sağdaki komşu `next`, soldaki `prev` adımıyla; daha uzaktakiler aynı yönde aynı adımlarla. Ara
   konumlar bu noktalar arasında Catmull-Rom eğrisiyle hesaplanır; ölçek de aynı eğriyle. Sağdaki öne
   gelir (z-index), soldaki uzaklaşır. Eğim rotateX · rotateY · rotateZ; rotateY eğri üzerindeki konuma
   göre sol uçtan sağ uca değişir. Sahnenin perspective'i ve perspective-origin'i ekranın ortası.
   Ortadaki daire renkli, diğerleri duotone; ortaya gelen colorFade sn'de renklenir.
   Süzülme: her daire kendi rastgele fazıyla dikeyde ve rotateX'te salınır (yoyo, sine.inOut).
   Fare eğimi: fare bir dairenin üzerindeyken daire ekran eksenlerinde imlece doğru eğilir; bırakınca
   yay-sönümle döner (dokunmatikte yok).

   Gölge: her dairenin gölgesi zemin düzleminde ayrı bir öğe (dairelerin arkasında). Konumu dairenin
   ekrandaki izdüşümünden (süzülmesiz) hesaplanır: alt kenarın altında, biraz sağda; daire yukarı
   süzüldükçe küçülür, bulanıklaşır, açılır. Yalnızca transform, opacity ve filter.

   Açılma: ortadaki daireye tıklanınca renkli görsel dairesel maskeyle (iris) ekranı kaplar ve tam ekran
   video akışı başlar (video, ses, doku, başlık grubu, × ve 15 sn dönüş aynen); dönüşte aynı hareketle
   daireye geri küçülür.

   Yazılar (künye bloğu, sahne adı, etiket + alıntı) ortadaki daireye göre değişir: eski satırlar yukarı
   kayarak kaybolur, yeniler aşağıdan gelir (satırlar arası gecikmeyle). */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Media } from './media';
import { clamp, mod, type State } from './state';
import type { Identity, Show, TemplateContext } from './types';
import { placePhoto } from './crop';
import type { FullVideoPlayer } from './fullVideo';
import type { Dom } from './theme';

export interface Gallery {
  rebuild(): void;
  render(): void;
  /** Ekran noktasındaki dairenin sırası */
  hit(x: number, y: number): number | null;
  /** Ortadaki dairenin sırası */
  center(): number;
  /** Ortadaki daireyi iris ile aç, tam ekran video akışını başlat */
  open(): void;
  /** Tam ekrandan galeriye: aynı hareketle daireye geri küçülür */
  close(): void;
  /** Tam ekranda yüklü bir video var mı (başlamazsa kaldırılır) */
  videoActive(): boolean;
  /** Yatay telefon katmanı: videoyu duraklat (on) / sessiz sürdür (off) */
  suspend(on: boolean): void;
  /** Fare hareketi (eğim); null: fare yüzeyden çıktı */
  hover(e: PointerEvent | null): void;
  /** Fontlar yüklenince yazıları yeniden kur */
  refresh(): void;
  visible(): Element[];
}

interface Disc {
  n: number;
  show: Show;
  el: HTMLElement;
  col: HTMLElement | null;
  sh: HTMLElement;
  /** Süzülme (−1..1; +1 en yukarı) */
  fl: { f: number };
  flTw: gsap.core.Tween | null;
  /** Renkli mi (hedef) */
  lit: boolean;
  /** Eğim (°) ve hızı; hedef */
  tilt: { x: number; y: number; vx: number; vy: number; tx: number; ty: number };
  /** Ekrandaki izdüşüm (son kare) */
  box: Box;
  tf: string;
  sk: string;
}

interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
  bottom: number;
}

interface Iris {
  show: Show;
  ar: number;
  el: HTMLElement;
  img: HTMLElement | null;
  p: { v: number };
  /** Başlangıç dairesi: merkez, yarıçap, görselin ekrandaki ölçeği */
  cx: number;
  cy: number;
  r0: number;
  k: number;
  tw: gsap.core.Tween | null;
}

export function createGallery(o: {
  S: State;
  id: Identity;
  motion: Motion;
  media: Media;
  shows: Show[];
  dom: Dom;
  tctx: () => TemplateContext;
  video: FullVideoPlayer;
  onCreate(el: Element): void;
}): Gallery {
  const { S, id, motion, media, shows, dom } = o;
  const G = id.gallery;
  const T = id.screen;
  const N = shows.length;
  const red = motion.reduced ? 0.2 : 1;
  const items = new Map<number, Disc>();
  const showAt = (n: number) => shows[mod(n, N)];
  const f = (n: number, d = 2) => n.toFixed(d);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  /* ---------- geometri ---------- */
  const curve = () => (S.mobile ? G.mobile : G.web);
  /** Ölçek 1'deki daire çapı (px) */
  const discD = () => (S.mobile ? G.mobile.disc * S.vw : G.web.disc * S.vh);
  let D = discD();

  /** k. tam adımın ekrandaki noktası */
  function anchor(k: number): [number, number] {
    const C = curve();
    const x = C.center[0] * S.vw;
    const y = C.center[1] * S.vh;
    if (k >= 0) return [x + k * C.next[0] * S.vw, y + k * C.next[1] * S.vh];
    return [x - k * C.prev[0] * S.vw, y - k * C.prev[1] * S.vh];
  }
  /** k. tam adımın ölçeği: sol 2, sol, orta, sağ; uzakta aynı adımla */
  function scaleAt(k: number) {
    const s = G.scale;
    if (k >= 0) return s.center + k * (s.next - s.center);
    if (k === -1) return s.prev;
    return Math.max(s.min, s.prev2 + (k + 2) * (s.prev - s.prev2));
  }
  const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
    0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  /** Eğri üzerindeki konum t (ortadan adım): Catmull-Rom */
  function place(t: number) {
    const i = Math.floor(t);
    const u = t - i;
    const [a, b, c, d] = [anchor(i - 1), anchor(i), anchor(i + 1), anchor(i + 2)];
    const R = G.rotate;
    const ry = t < 0 ? lerp(R.y, R.yLeft, clamp(t / R.leftAt, 0, 1)) : lerp(R.y, R.yRight, clamp(t / R.rightAt, 0, 1));
    return {
      x: cr(a[0], b[0], c[0], d[0], u),
      y: cr(a[1], b[1], c[1], d[1], u),
      s: Math.max(G.scale.min, cr(scaleAt(i - 1), scaleAt(i), scaleAt(i + 1), scaleAt(i + 2), u)),
      ry,
    };
  }
  /** Daire matrisi: konum · ölçek · (ekran eksenlerinde fare eğimi) · rotateX · rotateY · rotateZ */
  function matrix(x: number, y: number, s: number, rx: number, ry: number, tx = 0, ty = 0) {
    const m = new DOMMatrix().translateSelf(x, y, 0).scaleSelf(s, s, s);
    if (tx || ty) m.rotateAxisAngleSelf(1, 0, 0, tx).rotateAxisAngleSelf(0, 1, 0, ty);
    return m.rotateAxisAngleSelf(1, 0, 0, rx).rotateAxisAngleSelf(0, 1, 0, ry).rotateAxisAngleSelf(0, 0, 1, G.rotate.z);
  }
  /** Dairenin kenarını perspektifle ekrana iz düşür: sınır kutusu */
  const RING = Array.from({ length: 24 }, (_, i) => [Math.cos((i / 24) * Math.PI * 2), Math.sin((i / 24) * Math.PI * 2)]);
  function project(m: DOMMatrix): Box {
    const r = D / 2;
    const d = G.perspective;
    const ox = S.vw / 2;
    const oy = S.vh / 2;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [c, s] of RING) {
      const lx = c * r, ly = s * r;
      const X = m.m11 * lx + m.m21 * ly + m.m41;
      const Y = m.m12 * lx + m.m22 * ly + m.m42;
      const Z = m.m13 * lx + m.m23 * ly + m.m43;
      const k = d / Math.max(1, d - Z);
      const px = ox + (X - ox) * k;
      const py = oy + (Y - oy) * k;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, bottom: y1 };
  }

  /** Daire içindeki fotoğraf: odak noktası dairenin merkezinde, kaplama boyutunun photoZoom katı */
  function discFrame(show: Show, ar: number) {
    const ih = Math.max(D, D / ar) * G.photoZoom;
    const iw = ih * ar;
    const x = clamp(D / 2 - (show.focus.x / 100) * iw, D - iw, 0);
    const y = clamp(D / 2 - (show.focus.y / 100) * ih, D - ih, 0);
    return { x, y, w: iw, h: ih };
  }

  /* ---------- daire ---------- */
  function make(n: number, lit: boolean): Disc {
    const show = showAt(n);
    const el = document.createElement('div');
    el.className = 'gd';
    el.dataset.n = String(n);
    el.style.cssText = `width:${f(D)}px;height:${f(D)}px;left:${f(-D / 2)}px;top:${f(-D / 2)}px`;
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const fr = discFrame(show, ar);
    const one = (cls: string) => media.img(show, { width: fr.w, height: fr.h, aspect: ar }).replace('class="ph phn"', `class="ph phn ${cls}"`);
    el.innerHTML = one('phm') + one('phc');
    for (const im of el.querySelectorAll<HTMLElement>('img')) im.style.transform = `translate(${f(fr.x)}px,${f(fr.y)}px)`;
    const col = el.querySelector<HTMLElement>('.phc');
    if (col) col.style.opacity = lit ? '1' : '0';
    dom.stage.append(el);
    const sh = document.createElement('div');
    sh.className = 'gsh';
    const sw = D * G.shadow.width;
    sh.style.cssText = `width:${f(sw)}px;height:${f(sw * G.shadow.height)}px;background:${G.shadow.color};opacity:0`;
    dom.shadows.append(sh);
    const fl = { f: 0 };
    let flTw: gsap.core.Tween | null = null;
    if (!motion.reduced) {
      // kendi rastgele fazı ve periyodu: yarım periyotta −1 → +1, yoyo
      const period = lerp(G.float.min, G.float.max, Math.random());
      fl.f = -1;
      flTw = gsap.to(fl, { f: 1, duration: period / 2, ease: G.float.ease, yoyo: true, repeat: -1 });
      flTw.totalTime(Math.random() * period);
    }
    return {
      n, show, el, col, sh, fl, flTw, lit,
      tilt: { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 },
      box: { cx: 0, cy: 0, w: 0, h: 0, bottom: 0 },
      tf: '', sk: '',
    };
  }
  function drop(it: Disc) {
    it.flTw?.kill();
    if (it.col) gsap.killTweensOf(it.col);
    it.el.remove();
    it.sh.remove();
  }
  /** Renklenme: ortadaki renkli, diğerleri duotone */
  function light(it: Disc, on: boolean) {
    if (it.lit === on || !it.col) return;
    it.lit = on;
    gsap.to(it.col, { opacity: on ? 1 : 0, duration: G.colorFade * red, ease: 'none', overwrite: true });
  }

  /* ---------- fare eğimi ---------- */
  let hovered: Disc | null = null;
  function hover(e: PointerEvent | null) {
    let hit: Disc | null = null;
    if (e && e.pointerType === 'mouse' && !S.open && !S.pressed && !motion.reduced) {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.gd');
      if (el) hit = items.get(+el.dataset.n!) ?? null;
      if (hit) {
        const b = hit.box;
        let nx = (e.clientX - b.cx) / Math.max(1, b.w / 2);
        let ny = (e.clientY - b.cy) / Math.max(1, b.h / 2);
        const l = Math.hypot(nx, ny);
        if (l > 1) {
          nx /= l;
          ny /= l;
        }
        // imlecin olduğu kenar izleyiciye doğru: sağda rotateY −, üstte rotateX −
        hit.tilt.tx = ny * G.tilt.max;
        hit.tilt.ty = -nx * G.tilt.max;
      }
    }
    if (hovered && hovered !== hit) {
      hovered.tilt.tx = 0;
      hovered.tilt.ty = 0;
    }
    hovered = hit;
  }
  function spring(it: Disc, dt: number) {
    const t = it.tilt;
    if (!t.tx && !t.ty && Math.abs(t.x) < 1e-3 && Math.abs(t.y) < 1e-3 && Math.abs(t.vx) < 1e-2 && Math.abs(t.vy) < 1e-2) {
      t.x = t.y = t.vx = t.vy = 0;
      return;
    }
    const K = G.tilt.stiffness;
    const C = G.tilt.damping;
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      t.vx += (-K * (t.x - t.tx) - C * t.vx) * h;
      t.vy += (-K * (t.y - t.ty) - C * t.vy) * h;
      t.x += t.vx * h;
      t.y += t.vy * h;
    }
  }

  /* ---------- yazılar ---------- */
  dom.ui.innerHTML =
    '<div class="gi"></div><div class="gs"></div>' +
    `<div class="gc"><div class="gc-t"></div><button type="button" class="cb gtk" data-act="ticket">Bilet Al</button></div>`;
  const gInfo = dom.ui.querySelector<HTMLElement>('.gi')!;
  const gStage = dom.ui.querySelector<HTMLElement>('.gs')!;
  const gCap = dom.ui.querySelector<HTMLElement>('.gc-t')!;
  // Bilet Al şimdilik işlevsiz; tıklama galeriye geçmez
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk')!;
  ticket.addEventListener('pointerdown', (e) => e.stopPropagation());
  ticket.addEventListener('click', (e) => e.stopPropagation());

  let textFor: number | null = null;
  const swaps = new Map<HTMLElement, gsap.core.Timeline>();
  function swap(group: HTMLElement, html: string, animate: boolean) {
    swaps.get(group)?.kill();
    const olds = [...group.children] as HTMLElement[];
    // önceki geçişten kalanlar: yalnızca en son içerik çıkışa katılır
    olds.slice(0, -1).forEach((e) => e.remove());
    const old = olds.at(-1) ?? null;
    const nu = document.createElement('div');
    nu.className = 'gx';
    nu.innerHTML = html;
    group.append(nu);
    o.onCreate(nu);
    if (!animate || motion.reduced) {
      old?.remove();
      return;
    }
    const W = T.swap;
    const outs = old ? ([...old.querySelectorAll('.ln')] as HTMLElement[]) : [];
    const ins = [...nu.querySelectorAll('.ln')] as HTMLElement[];
    const n = Math.max(1, outs.length, ins.length);
    // her satırın çıkış + giriş süresi: toplam süreden satır gecikmeleri düşülür
    const d = Math.max(0.2, W.total - W.stagger * (n - 1));
    const tl = gsap.timeline({ onComplete: () => old?.remove() });
    if (outs.length) tl.to(outs, { y: -W.shift, autoAlpha: 0, duration: d / 2, ease: 'power2.in', stagger: W.stagger }, 0);
    if (ins.length) tl.fromTo(ins, { y: W.shift, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: d / 2, ease: 'power2.out', stagger: W.stagger }, d / 2);
    swaps.set(group, tl);
  }
  function texts(n: number, animate: boolean) {
    if (textFor === n && animate) return;
    textFor = n;
    const show = showAt(n);
    const ctx = o.tctx();
    swap(gInfo, id.templates.info(show, ctx), animate);
    swap(gStage, id.templates.stageName(show, ctx), animate);
    // mobilde etiket ve alıntı yok
    swap(gCap, S.mobile ? '' : id.templates.caption(show, ctx), animate);
  }

  /* ---------- tam ekran: doku, başlık, × ---------- */
  let closeOn = false;
  function closeIcon(on: boolean) {
    if (closeOn === on) return;
    closeOn = on;
    gsap.to(dom.close, { autoAlpha: on ? 1 : 0, duration: motion.dur('closeFade'), ease: motion.ease.fade, overwrite: true });
  }
  const texture = (on: boolean, done?: () => void) =>
    gsap.to(dom.texture, {
      autoAlpha: on ? 1 : 0, duration: motion.dur(on ? 'textureIn' : 'textureOut'), ease: motion.ease.fade, overwrite: true,
      onComplete: done,
    });

  let titleTl: gsap.core.Timeline | null = null;
  const titleParts = () => [...dom.title.children] as HTMLElement[];
  function titleClear() {
    titleTl?.kill();
    titleTl = null;
    gsap.killTweensOf(titleParts());
    dom.title.innerHTML = '';
    dom.title.style.visibility = 'hidden';
    gsap.killTweensOf([...dom.stageLabel.children]);
    dom.stageLabel.innerHTML = '';
    dom.stageLabel.style.visibility = 'hidden';
  }
  /** Tam ekran görseli yerine oturunca: başlık soldan kayıp ortada durur, sayaç ardından aşağıdan belirir */
  function titleShow(show: Show) {
    titleClear();
    const F = id.fullTitle;
    dom.title.innerHTML = id.templates.fullTitle(show, o.tctx());
    o.onCreate(dom.title);
    const [t, k, hr] = titleParts();
    let size = S.vw * F.size;
    t.style.fontSize = `${size}px`;
    const max = S.vw * F.maxWidth;
    const w0 = t.getBoundingClientRect().width;
    if (w0 > max) {
      size *= max / w0;
      t.style.fontSize = `${size}px`;
    }
    let cs = size * F.counter;
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
    const gap = size * F.gap;
    const lh = t.getBoundingClientRect().height;
    const kh = k.getBoundingClientRect().height;
    const hh = hr.getBoundingClientRect().height;
    const top0 = (S.vh - (lh + gap + kh + gap + hh)) / 2;
    t.style.position = 'relative';
    t.style.top = `${top0 + lh / 2 - S.vh / 2}px`;
    k.style.top = `${top0 + lh + gap}px`;
    hr.style.top = `${top0 + lh + gap + kh + gap}px`;
    dom.title.style.visibility = 'visible';
    dom.stageLabel.innerHTML = id.templates.stageLabel(show, F.stageBasis * S.vh, o.tctx());
    const sl = dom.stageLabel.firstElementChild as HTMLElement | null;
    dom.stageLabel.style.visibility = sl ? 'visible' : 'hidden';
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
    titleTl?.kill();
    const parts = titleParts();
    if (!parts.length || motion.reduced) {
      titleClear();
      return Promise.resolve();
    }
    const sl = dom.stageLabel.firstElementChild;
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

  /* ---------- iris ---------- */
  let ir: Iris | null = null;
  let exiting = false;
  let autoTimer: gsap.core.Tween | null = null;
  const clearAuto = () => {
    autoTimer?.kill();
    autoTimer = null;
  };
  /** İrisin başlangıç dairesi: dairenin ekrandaki izdüşümü (elipsin içine sığan daire) */
  function irisFrom(x: Iris, b: Box) {
    x.cx = b.cx;
    x.cy = b.cy;
    x.r0 = Math.min(b.w, b.h) / 2;
    x.k = Math.sqrt(b.w * b.h) / D;
  }
  function makeIris(it: Disc): Iris {
    const show = it.show;
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const el = document.createElement('div');
    el.className = 'iris';
    const cov = placePhoto(ar, S.vw, S.vh, show.focus);
    el.innerHTML = media.img(show, { width: S.vw, height: cov.h, aspect: ar });
    const img = el.querySelector<HTMLImageElement>('img');
    if (img) {
      img.sizes = `${Math.round(S.vw)}px`;
      // yerleşim sol üst köşeden ölçeklenir (media.img'in odak noktası kökenini ezer)
      img.style.transformOrigin = '0 0';
    }
    dom.top.append(el);
    const x: Iris = { show, ar, el, img, p: { v: 0 }, cx: 0, cy: 0, r0: 0, k: 1, tw: null };
    irisFrom(x, it.box);
    return x;
  }
  let irisKey = '';
  function applyIris(x: Iris) {
    const p = x.p.v;
    const r1 = Math.hypot(Math.max(x.cx, S.vw - x.cx), Math.max(x.cy, S.vh - x.cy)) + 1;
    const r = lerp(x.r0, r1, p);
    // görsel: dairedeki çerçeveden (odak merkezde, yakınlaştırılmış) tam ekran kaplamaya
    const fr = discFrame(x.show, x.ar);
    const from = { x: x.cx + (fr.x - D / 2) * x.k, y: x.cy + (fr.y - D / 2) * x.k, h: fr.h * x.k };
    const to = placePhoto(x.ar, S.vw, S.vh, x.show.focus);
    const q = { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p), h: lerp(from.h, to.h, p) };
    // görsel maskenin (ekrandaki kısmının) tamamını her an kaplar: gerekirse maske merkezinden büyütülür
    {
      const w = (q.h / to.h) * to.w;
      const need = [x.cx - Math.max(0, x.cx - r), x.cy - Math.max(0, x.cy - r), Math.min(S.vw, x.cx + r) - x.cx, Math.min(S.vh, x.cy + r) - x.cy];
      const have = [x.cx - q.x, x.cy - q.y, q.x + w - x.cx, q.y + q.h - x.cy];
      let m = 1;
      for (let i = 0; i < 4; i++) if (need[i] > 0) m = Math.max(m, have[i] > 1 ? need[i] / have[i] : 1);
      if (m > 1) {
        q.x = x.cx - (x.cx - q.x) * m;
        q.y = x.cy - (x.cy - q.y) * m;
        q.h *= m;
      }
    }
    const key = `${f(r)}|${f(q.x)}|${f(q.y)}|${f(q.h)}`;
    if (key === irisKey) return;
    irisKey = key;
    // tam açıkken maske yok; video katmanı da aynı maskeyle büyür
    const clip = p >= 0.999 ? 'none' : `circle(${f(r)}px at ${f(x.cx)}px ${f(x.cy)}px)`;
    x.el.style.clipPath = clip;
    dom.video.style.clipPath = clip;
    if (x.img) {
      x.img.style.width = `${f(to.w)}px`;
      x.img.style.height = `${f(to.h)}px`;
      x.img.style.transform = `translate3d(${f(q.x)}px,${f(q.y)}px,0) scale(${f(q.h / to.h, 5)})`;
    }
  }
  function dropIris() {
    if (!ir) return;
    ir.tw?.kill();
    ir.el.remove();
    ir = null;
    irisKey = '';
    dom.video.style.clipPath = '';
    dom.top.classList.remove('on');
  }

  /* ---------- çizim ---------- */
  let lastCenter: number | null = null;
  let visibleEls: Element[] = [];
  function render() {
    const dt = Math.min(0.1, gsap.ticker.deltaRatio() / 60);
    const H = S.vh;
    const c = Math.round(S.pos);
    // pencere: ortadan ±around adım
    for (let n = c - G.around; n <= c + G.around; n++) if (!items.has(n)) items.set(n, make(n, n === c));
    for (const [n, it] of items) {
      if (Math.abs(n - c) <= G.around) continue;
      drop(it);
      items.delete(n);
    }
    if (c !== lastCenter) {
      lastCenter = c;
      items.forEach((it) => light(it, it.n === c));
      texts(c, textFor !== null);
    }
    const R = G.rotate;
    const Sh = G.shadow;
    for (const it of items.values()) {
      const t = it.n - S.pos;
      const a = place(t);
      spring(it, dt);
      const fl = it.fl.f;
      const base = matrix(a.x, a.y, a.s, R.x, a.ry);
      const full = matrix(a.x, a.y - fl * G.float.y * H, a.s, R.x + fl * G.float.rx, a.ry, it.tilt.x, it.tilt.y);
      it.box = project(full);
      const tf = full.toString();
      if (tf !== it.tf) {
        it.tf = tf;
        it.el.style.transform = tf;
        it.el.style.zIndex = String(Math.round(1000 + t * 100));
      }
      // gölge: süzülmesiz izdüşümün altında; yukarı süzüldükçe küçülür, bulanıklaşır, açılır
      const pb = project(base);
      const lift = fl;
      const k = 1 - lift * Sh.lift.shrink;
      const blur = Sh.blur + lift * (Sh.lift.blur - Sh.blur);
      const op0 = lerp(Sh.centerOpacity, Sh.opacity, clamp(Math.abs(t), 0, 1));
      const op = Math.max(0, op0 * (1 + (lift * (Sh.lift.opacity - Sh.opacity)) / Sh.opacity));
      // fare eğimi gölgeyi aynı yöne kaydırır
      const sx = (-it.tilt.y / G.tilt.max) * Sh.tiltShift * H;
      const sy = (it.tilt.x / G.tilt.max) * Sh.tiltShift * H;
      const sw0 = D * Sh.width;
      const sh0 = sw0 * Sh.height;
      const q = ((pb.w * Sh.width) / sw0) * k;
      const x = pb.cx + Sh.right * H + sx;
      const y = pb.bottom + Sh.below * H + sy;
      const sk = `${f(x, 1)}|${f(y, 1)}|${f(q, 3)}|${f(op, 3)}|${f(blur, 1)}`;
      if (sk !== it.sk) {
        it.sk = sk;
        it.sh.style.transform = `translate3d(${f(x - sw0 / 2)}px,${f(y - sh0 / 2)}px,0) scale(${f(q, 4)})`;
        it.sh.style.opacity = f(op, 3);
        // bulanıklık ekranda px: ölçek öncesine çevrilir
        it.sh.style.filter = `blur(${f(blur / Math.max(0.05, q), 1)}px)`;
      }
    }
    if (ir) applyIris(ir);
    const cur = gInfo.lastElementChild;
    visibleEls = cur ? [cur, dom.title] : [dom.title];
  }

  const api: Gallery = {
    rebuild() {
      o.video.remove();
      clearAuto();
      titleClear();
      dropIris();
      exiting = false;
      S.open = false;
      S.full = false;
      closeOn = false;
      gsap.killTweensOf(dom.close);
      gsap.set(dom.close, { autoAlpha: 0 });
      gsap.killTweensOf(dom.texture);
      gsap.set(dom.texture, { autoAlpha: 0 });
      items.forEach(drop);
      items.clear();
      hovered = null;
      D = discD();
      lastCenter = null;
      textFor = null;
      swaps.forEach((t) => t.kill());
      swaps.clear();
      for (const g of [gInfo, gStage, gCap]) g.innerHTML = '';
    },
    render,
    hit(x, y) {
      const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.gd');
      return el ? +el.dataset.n! : null;
    },
    center: () => Math.round(S.pos),
    open() {
      if (S.open || S.full || S.paused) return;
      const it = items.get(Math.round(S.pos));
      if (!it) return;
      hover(null);
      S.open = true;
      S.full = true;
      const x = makeIris(it);
      ir = x;
      dom.top.classList.add('on');
      closeIcon(true);
      const show = it.show;
      // tıklamanın içinde, eşzamanlı: video sesle başlar (hazır değilse hazır olunca)
      o.video.prepare(show.fullVideo);
      clearAuto();
      o.video.start(show.fullVideo, () => {
        clearAuto();
        if (S.mobile) return;
        autoTimer = gsap.delayedCall(motion.dur('autoReturn'), () => {
          if (S.full && ir === x) api.close();
        });
      });
      x.tw = gsap.to(x.p, {
        v: 1, duration: G.iris.dur * red, ease: G.iris.ease,
        onComplete: () => {
          if (ir !== x || !S.full || exiting) return;
          texture(true);
          titleShow(show);
        },
      });
    },
    close() {
      const x = ir;
      if (!x || !S.full || exiting) return;
      // çıkış: başlık çıkar, videodan fotoğrafa geçilir, doku kaybolur; sonra görsel iris ile daireye küçülür
      exiting = true;
      clearAuto();
      closeIcon(false);
      x.tw?.kill();
      titleHide()
        .then(() => o.video.hide())
        .then(() => new Promise<void>((res) => void texture(false, res)))
        .then(() => {
          if (ir !== x) {
            exiting = false;
            return;
          }
          S.full = false;
          const it = items.get(Math.round(S.pos));
          if (it) irisFrom(x, it.box);
          irisKey = '';
          x.tw = gsap.to(x.p, {
            v: 0, duration: G.iris.dur * red, ease: G.iris.ease,
            onComplete: () => {
              dropIris();
              o.video.remove();
              S.open = false;
              exiting = false;
            },
          });
        });
    },
    videoActive: () => o.video.active(),
    suspend(on) {
      o.video.suspend(on);
    },
    hover,
    refresh() {
      if (textFor !== null) {
        const n = textFor;
        textFor = null;
        texts(n, false);
      }
    },
    visible: () => visibleEls,
  };
  return api;
}
