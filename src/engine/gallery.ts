/* ROTA2 çapraz 3B daire galerisi (CSS 3B; WebGL yok). Bütün ölçüler kimliğin `gallery` / `screen` token'ları.

   Daireler: her öğe düz, kenarsız bir daire (yalnızca dairesel görsel; odak noktası merkezde, normal
   kaplamanın photoZoom katı). Duruştaki yerleşim (layout) ekrandaki yazılardan hesaplanır:
   - ortadaki daire x = centerX·W'de; çapı, eğik hâlinin ekrandaki sınır kutusu alıntının altı ile sahne
     adının üstü arasına (her iki yanda gap boşlukla) sığacak en büyük değer (en fazla cap·W);
   - p = +1 daire genişliğinin rightOut oranı sağ kenarın dışında kalacak şekilde, köşegen üzerinde;
   - p = −1 ve −2 daireler künye / tanıtım kolonunun altında ve logonun üstündeki boş alanda, tamamı
     görünür ve hiçbir yazı, düğme ya da logoya değmeden; köşegen (aşağı ve sola = küçük) sığmazsa
     yatıklaştırılır. Sağındaki dairenin arkasına en fazla kendi genişliğinin tuck oranı kadar girer;
   - uzaktakiler aynı adımla sürer. Ara konumlar Catmull-Rom eğrisiyle, ölçek s(p) anahtarlarından.
   Ortadaki daire en önde. Eğim rotateX · rotateY · rotateZ; rotateY eğri üzerindeki konuma göre değişir.
   Ortadaki daire renkli, diğerleri duotone; ortaya gelen colorFade sn'de renklenir.
   Süzülme: her daire kendi rastgele fazıyla dikeyde ve rotateX'te salınır (yoyo, sine.inOut).
   Fare eğimi (kenardaki daireler): imlece doğru eğilir, yay-sönümle döner (dokunmatikte yok).
   Düzleşme: ortadaki daire masaüstünde fare üzerindeyken, mobilde galeri durunca düz ve tam daire olur,
   flat.scale'e büyür; fare çıkınca / sürükleme başlayınca eğimine döner.

   Gölge: her dairenin gölgesi zemin düzleminde ayrı bir öğe (dairelerin arkasında); dairenin ekrandaki
   izdüşümünden (süzülmesiz) hesaplanır. Yalnızca transform, opacity ve filter.

   Açık hâl (ortadaki daireye tıklama): her şey aynı anda başlar (open.dur, open.easeIn): daireler gölgeleriyle
   köşegen boyunca ekrandan çıkar (sağdakiler sağ üstten, ortadaki ve soldakiler sol alttan); uzun logo kısa
   logoya çapraz geçer; künyede başlık dışındaki her şey kaybolup kapanır; alıntı kaybolur; sahne adı ve
   Bilet Al kalır. Video (videoya kadar görsel) ve ağ open.videoAt'te başlayıp open.videoDur'da belirir.
   Tekrar tıklama (ya da kendiliğinden dönüş): tam tersi, aynı anda, open.easeOut ile.

   Yazılar (künye bloğu, tür + alıntı, sahne adı) ortadaki daireye göre değişir: eski satırlar yukarı
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
  /** Duruştaki yerleşimi ekrandaki yazılardan yeniden hesapla (ekran ölçüsü / fontlar değişince) */
  layout(): void;
  rebuild(): void;
  render(): void;
  /** Ekran noktasındaki dairenin sırası */
  hit(x: number, y: number): number | null;
  /** Ortadaki dairenin sırası */
  center(): number;
  /** Bir adımın ekrandaki uzunluğu (px): ortadaki ile sonraki dairenin duruş noktaları arası */
  step(): number;
  /** Açık hâl: daireler çıkar, tam ekran video akışı başlar */
  open(): void;
  /** Açık hâlden galeriye: tam tersi */
  close(): void;
  /** Tam ekranda yüklü bir video var mı (başlamazsa kaldırılır) */
  videoActive(): boolean;
  /** Yatay telefon katmanı: videoyu duraklat (on) / sessiz sürdür (off) */
  suspend(on: boolean): void;
  /** Fare hareketi (eğim, düzleşme); null: fare yüzeyden çıktı */
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
  /** Düzleşme (0..1) ve hedefi */
  fz: { v: number };
  flat: boolean;
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
interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
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
  /** Galeri kendiliğinden hareket ediyor mu (oturma / adım) */
  busy: () => boolean;
  onCreate(el: Element): void;
}): Gallery {
  const { S, id, motion, media, shows, dom } = o;
  const G = id.gallery;
  const GL = G.layout;
  const T = id.screen;
  const N = shows.length;
  const red = motion.reduced ? 0.2 : 1;
  const items = new Map<number, Disc>();
  const showAt = (n: number) => shows[mod(n, N)];
  const f = (n: number, d = 2) => n.toFixed(d);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const lgLong = dom.brand.querySelector<HTMLElement>('.lg-l')!;
  const lgShort = dom.brand.querySelector<HTMLElement>('.lg-s')!;

  /* ---------- geometri ---------- */
  /** Ölçek 1'deki daire çapı (px); duruştaki yerleşim noktaları p = −3 … +3 */
  let D = 100;
  let P = new Map<number, [number, number]>();
  /** Açık hâlde çıkış yönleri (birim) */
  let outR: [number, number] = [1, -0.5];
  let outL: [number, number] = [-1, 0.5];

  const scaleAt = (k: number) => GL.keys[clamp(Math.round(k) + 3, 0, GL.keys.length - 1)];
  const ryAt = (t: number) => {
    const R = G.rotate;
    return t < 0 ? lerp(R.y, R.yLeft, clamp(t / R.leftAt, 0, 1)) : lerp(R.y, R.yRight, clamp(t / R.rightAt, 0, 1));
  };
  function anchor(k: number): [number, number] {
    const at = P.get(k);
    if (at) return at;
    const [a, b] = k > 0 ? [P.get(3)!, P.get(2)!] : [P.get(-3)!, P.get(-2)!];
    const n = Math.abs(k) - 3;
    return [a[0] + n * (a[0] - b[0]), a[1] + n * (a[1] - b[1])];
  }
  const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
    0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  /** Eğri üzerindeki konum t (ortadan adım): Catmull-Rom */
  function place(t: number) {
    const i = Math.floor(t);
    const u = t - i;
    const [a, b, c, d] = [anchor(i - 1), anchor(i), anchor(i + 1), anchor(i + 2)];
    return {
      x: cr(a[0], b[0], c[0], d[0], u),
      y: cr(a[1], b[1], c[1], d[1], u),
      s: Math.max(0.01, cr(scaleAt(i - 1), scaleAt(i), scaleAt(i + 1), scaleAt(i + 2), u)),
      ry: ryAt(t),
    };
  }
  /** Daire matrisi: konum · ölçek · (ekran eksenlerinde fare eğimi) · rotateX · rotateY · rotateZ */
  function matrix(x: number, y: number, s: number, rx: number, ry: number, rz: number, tx = 0, ty = 0) {
    const m = new DOMMatrix().translateSelf(x, y, 0).scaleSelf(s, s, s);
    if (tx || ty) m.rotateAxisAngleSelf(1, 0, 0, tx).rotateAxisAngleSelf(0, 1, 0, ty);
    return m.rotateAxisAngleSelf(1, 0, 0, rx).rotateAxisAngleSelf(0, 1, 0, ry).rotateAxisAngleSelf(0, 0, 1, rz);
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
  /** Duruştaki k. dairenin (x, y) noktasındaki sınır kutusu */
  const restBox = (k: number, x: number, y: number) => project(matrix(x, y, scaleAt(k), G.rotate.x, ryAt(k), G.rotate.z));
  const rectOf = (b: Box): Rect => ({ l: b.cx - b.w / 2, t: b.cy - b.h / 2, r: b.cx + b.w / 2, b: b.cy + b.h / 2 });

  /* ---------- yazılar: iskelet ---------- */
  dom.ui.innerHTML =
    '<div class="gi"></div><div class="gq-top"></div>' +
    `<div class="gc"><div class="gs"></div>${id.templates.circleButtons([['Bilet Al', 'ticket']], o.tctx()).replace('class="cb"', 'class="cb gtk"')}</div>`;
  const gInfo = dom.ui.querySelector<HTMLElement>('.gi')!;
  const gCap = dom.ui.querySelector<HTMLElement>('.gq-top')!;
  const gStage = dom.ui.querySelector<HTMLElement>('.gs')!;
  // Bilet Al şimdilik işlevsiz; tıklama galeriye geçmez
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk')!;
  ticket.addEventListener('pointerdown', (e) => e.stopPropagation());
  ticket.addEventListener('click', (e) => e.stopPropagation());

  /** Bir yazı grubunun bütün gösteriler için en büyük yüksekliği / satır genişliği (gizli ölçüm) */
  function measureMax(group: HTMLElement, html: (s: Show) => string) {
    const probe = document.createElement('div');
    probe.className = 'gx';
    probe.style.cssText = 'visibility:hidden;position:absolute;left:0;top:0';
    group.append(probe);
    let h = 0;
    let w = 0;
    for (const s of shows) {
      probe.innerHTML = html(s);
      h = Math.max(h, probe.offsetHeight);
      for (const c of probe.children) {
        const r = document.createRange();
        r.selectNodeContents(c);
        w = Math.max(w, r.getBoundingClientRect().width);
      }
    }
    probe.remove();
    return { h, w };
  }

  /* ---------- duruştaki yerleşim ---------- */
  function layout() {
    const W = S.vw;
    const H = S.vh;
    const root = document.documentElement;
    const css = (k: string) => parseFloat(getComputedStyle(root).getPropertyValue(k)) || 0;
    const ctx = o.tctx();
    const clear = GL.clear * H;
    const gap = GL.gap * H;
    const mpad = T.info.mobilePad * H;

    // üst orta: tür + alıntı (en uzun gösteri)
    const qTop = css('--gq-top');
    const qMaxW = css('--gq-maxw');
    const q = measureMax(gCap, (s) => id.templates.caption(s, ctx));
    const qBottom = qTop + q.h;
    // künye: mobilde alıntının altında
    if (S.mobile) root.style.setProperty('--gi-top', `${(qBottom + mpad).toFixed(2)}px`);
    const kTop = css('--gi-top');
    const kLeft = css('--gi-left');
    const kW = css('--gi-w');
    const k = measureMax(gInfo, (s) => id.templates.info(s, ctx));
    // alt orta: sahne adı + Bilet Al
    const tD = T.ticket.d * H;
    const gcBottom = css('--gc-bottom');
    const stageTop = H - gcBottom - tD - css('--gs-gap') - css('--gs-fs');
    const st = measureMax(gStage, (s) => id.templates.stageName(s, ctx));
    const stageW = Math.max(st.w, tD);

    // engeller: yazılar, düğmeler, logo (clear kadar genişletilmiş)
    const grow = (r: Rect): Rect => ({ l: r.l - clear, t: r.t - clear, r: r.r + clear, b: r.b + clear });
    const domRect = (el: Element | null): Rect | null => {
      const b = el?.getBoundingClientRect();
      return b && b.width > 0 ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null;
    };
    const logo = domRect((S.mobile ? lgShort : lgLong).querySelector('svg'));
    const obstacles: Rect[] = [
      { l: W / 2 - qMaxW / 2, t: qTop, r: W / 2 + qMaxW / 2, b: qBottom },
      { l: kLeft, t: kTop, r: kLeft + kW, b: kTop + k.h },
      { l: W / 2 - stageW / 2, t: stageTop, r: W / 2 + stageW / 2, b: H - gcBottom },
      logo ? { l: 0, t: logo.t, r: logo.r, b: logo.b } : null,
      domRect(dom.members),
    ].filter((r): r is Rect => !!r).map(grow);

    // ortadaki daire: yazılar arasına sığan en büyük çap
    const top = (S.mobile ? kTop + k.h : qBottom) + gap;
    const bottom = stageTop - gap;
    const cap = (S.mobile ? GL.cap.mobile : GL.cap.web) * W;
    const cx0 = GL.centerX * W;
    const cy0 = (top + bottom) / 2;
    D = cap;
    for (let i = 0; i < 4; i++) {
      const b = restBox(0, cx0, cy0);
      D = Math.min(cap, D * (Math.max(1, bottom - top) / b.h));
    }
    P = new Map();
    const c0 = restBox(0, cx0, cy0);
    const p0: [number, number] = [cx0 + (cx0 - c0.cx), cy0 + (cy0 - c0.cy)];
    P.set(0, p0);
    const centerBox = rectOf(restBox(0, p0[0], p0[1]));

    /** Kutunun (genişlik w, yükseklik h; sağ kenarı xr) engellerin dışında kalabileceği üst kenar aralıkları */
    const freeTops = (xr: number, w: number, h: number) => {
      const l = xr - w;
      let free: [number, number][] = [[clear, H - clear - h]];
      for (const r of obstacles) {
        if (l >= r.r || xr <= r.l) continue;
        const a = r.t - h;
        const b = r.b;
        free = free.flatMap(([u, v]): [number, number][] => (b <= u || a >= v ? [[u, v]] : [[u, Math.min(v, a)], [Math.max(u, b), v]])).filter(([x, y]) => y >= x);
      }
      return free;
    };
    const nearest = (free: [number, number][], target: number) => {
      let best: number | null = null;
      for (const [u, v] of free) {
        const y = clamp(target, u, v);
        if (best === null || Math.abs(y - target) < Math.abs(best - target)) best = y;
      }
      return best;
    };
    /** Engellerle ve ekran dışıyla örtüşen alan (sığmayan dairenin en az kötü yeri için) */
    const overlap = (r: Rect) => {
      let a = 0;
      for (const o of obstacles) a += Math.max(0, Math.min(r.r, o.r) - Math.max(r.l, o.l)) * Math.max(0, Math.min(r.b, o.b) - Math.max(r.t, o.t));
      const inside = Math.max(0, Math.min(r.r, W) - Math.max(r.l, 0)) * Math.max(0, Math.min(r.b, H) - Math.max(r.t, 0));
      return a + (r.r - r.l) * (r.b - r.t) - inside;
    };

    // sol: p = −1, −2, −3 tamamı görünür ve birbirine değmeden; yalnızca ortadaki dairenin arkasına en fazla
    // tuck kadar girer. Köşegen hedefi sığmazsa yatıklaşır
    const slope = (GL.slope[1] * H) / Math.abs(GL.slope[0] * W);
    let right = { box: restBox(0, p0[0], p0[1]), rect: centerBox };
    for (let n = 1; n <= 3; n++) {
      const kk = -n;
      const trialX = right.box.cx - right.box.w / 2;
      const trial = restBox(kk, trialX, right.box.cy);
      const offX = trial.cx - trialX;
      const offY = trial.cy - right.box.cy;
      const w = trial.w;
      const h = trial.h;
      const xrMax = n === 1 ? centerBox.l + GL.tuck * w : Math.min(right.rect.l, centerBox.l + GL.tuck * w);
      const targetAt = (bcx: number) => right.box.cy + (right.box.cx - bcx) * slope;
      let found: [number, number] | null = null;
      for (let xr = xrMax; xr - w >= clear; xr -= 2) {
        const bcx = xr - w / 2;
        const top = nearest(freeTops(xr, w, h), targetAt(bcx) - h / 2);
        if (top !== null) {
          found = [bcx, top + h / 2];
          break;
        }
      }
      if (!found && n < 3) {
        // hiçbir yerde tamamı görünür sığmıyor (dar ekran): engellerle ve ekran dışıyla en az örtüşen yer
        let cost = Infinity;
        for (let xr = xrMax; xr >= w * 0.3; xr -= 4) {
          const bcx = xr - w / 2;
          for (let t = clear; t <= H - clear - h; t += 4) {
            const c = overlap({ l: xr - w, t, r: xr, b: t + h }) + Math.abs(t + h / 2 - targetAt(bcx)) * 0.01;
            if (c < cost) {
              cost = c;
              found = [bcx, t + h / 2];
            }
          }
        }
      }
      // daha uzaktakiler sığmıyorsa ekranın solunda
      if (!found) found = [-w / 2 - clear, clamp(targetAt(-w / 2), h / 2, H - h / 2)];
      const pt: [number, number] = [found[0] - offX, found[1] - offY];
      P.set(kk, pt);
      const b = restBox(kk, pt[0], pt[1]);
      right = { box: b, rect: rectOf(b) };
    }

    // sağ: p = +1 genişliğinin rightOut oranı ekranın dışında; köşegen üzerinde, yazı ve düğmelere değmeyen en
    // yakın yükseklikte; uzaktakiler aynı adımla
    const pm1 = P.get(-1)!;
    const dSlope = (pm1[1] - p0[1]) / Math.min(-1, pm1[0] - p0[0]);
    const trial = restBox(1, W, p0[1]);
    const bcx = W + GL.rightOut * trial.w - trial.w / 2;
    const want = p0[1] + (bcx - p0[0]) * dSlope;
    const topR = nearest(freeTops(bcx + trial.w / 2, trial.w, trial.h), want - trial.h / 2);
    const bcy = topR !== null ? topR + trial.h / 2 : clamp(want, trial.h / 2 + clear, H - trial.h / 2 - clear);
    const p1: [number, number] = [bcx - (trial.cx - W), bcy - (trial.cy - p0[1])];
    P.set(1, p1);
    const step: [number, number] = [p1[0] - p0[0], p1[1] - p0[1]];
    P.set(2, [p1[0] + step[0], p1[1] + step[1]]);
    P.set(3, [p1[0] + 2 * step[0], p1[1] + 2 * step[1]]);

    const unit = (v: [number, number]): [number, number] => {
      const l = Math.hypot(v[0], v[1]) || 1;
      return [v[0] / l, v[1] / l];
    };
    outR = unit(step);
    outL = unit([pm1[0] - p0[0], pm1[1] - p0[1]]);
    // daireler yeni çapla yeniden kurulur
    items.forEach(drop);
    items.clear();
    hovered = null;
    lastCenter = null;
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
      n, show, el, col, sh, fl, flTw, lit, fz: { v: 0 }, flat: false,
      tilt: { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 },
      box: { cx: 0, cy: 0, w: 0, h: 0, bottom: 0 },
      tf: '', sk: '',
    };
  }
  function drop(it: Disc) {
    it.flTw?.kill();
    gsap.killTweensOf(it.fz);
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
  /** Düzleşme: düz tam daire ve flat.scale (ya da eğimine dönüş) */
  function flatten(it: Disc, on: boolean) {
    if (it.flat === on) return;
    it.flat = on;
    gsap.to(it.fz, { v: on ? 1 : 0, duration: G.flat.dur * red, ease: G.flat.ease, overwrite: true });
  }

  /* ---------- fare: kenardaki dairelerde eğim, ortadakinde düzleşme ---------- */
  let hovered: Disc | null = null;
  let hoverCenter = false;
  function hover(e: PointerEvent | null) {
    let hit: Disc | null = null;
    hoverCenter = false;
    if (e && e.pointerType === 'mouse' && !S.open && !S.pressed) {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.gd');
      if (el) hit = items.get(+el.dataset.n!) ?? null;
      if (hit && hit.n === Math.round(S.pos)) {
        hoverCenter = true;
        hit = null;
      } else if (hit && !motion.reduced) {
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
      } else hit = null;
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

  /* ---------- yazı geçişleri ---------- */
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
    swap(gCap, id.templates.caption(show, ctx), animate);
    swap(gStage, id.templates.stageName(show, ctx), animate);
  }

  /* ---------- tam ekran başlığı ve × ---------- */
  let closeOn = false;
  function closeIcon(on: boolean) {
    if (closeOn === on) return;
    closeOn = on;
    gsap.to(dom.close, { autoAlpha: on ? 1 : 0, duration: motion.dur('closeFade'), ease: motion.ease.fade, overwrite: true });
  }
  let titleTl: gsap.core.Timeline | null = null;
  const titleParts = () => [...dom.title.children] as HTMLElement[];
  function titleClear() {
    titleTl?.kill();
    titleTl = null;
    gsap.killTweensOf(titleParts());
    dom.title.innerHTML = '';
    dom.title.style.visibility = 'hidden';
  }
  /** Açık hâl yerine oturunca: başlık soldan kayıp ortada durur, sayaç ve saat ardından aşağıdan belirir */
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
    if (motion.reduced) return;
    const tw = t.getBoundingClientRect().width;
    gsap.set(t, { x: -(S.vw / 2 + tw / 2) });
    gsap.set([k, hr], { autoAlpha: 0, y: cs * 0.6 });
    titleTl = gsap
      .timeline()
      .to(t, { x: 0, duration: motion.dur('titleIn'), ease: 'expo.out' })
      .to(k, { y: 0, autoAlpha: 1, duration: motion.dur('counterIn'), ease: 'power3.out' }, `>${motion.dur('counterDelay')}`)
      .to(hr, { y: 0, autoAlpha: 1, duration: motion.dur('counterIn'), ease: 'power3.out' }, `<${motion.dur('hourDelay')}`);
  }
  /** Çıkış başlarken başlık, sayaç ve saat birlikte sağa kayarak ekrandan çıkar */
  function titleHide() {
    titleTl?.kill();
    const parts = titleParts();
    if (!parts.length || motion.reduced) return titleClear();
    gsap.to(parts, {
      x: (_k: number, el: HTMLElement) => S.vw / 2 + el.getBoundingClientRect().width / 2 + 2,
      duration: motion.dur('titleOut'), ease: 'power2.in', overwrite: true, onComplete: titleClear,
    });
  }

  /* ---------- açık hâl ---------- */
  /** Dairelerin çıkışı (0: yerinde, 1: ekran dışında) */
  const ex = { v: 0 };
  let openTl: gsap.core.Timeline | null = null;
  let openShow: Show | null = null;
  let exiting = false;
  let autoTimer: gsap.core.Tween | null = null;
  const clearAuto = () => {
    autoTimer?.kill();
    autoTimer = null;
  };
  const layers = () => [dom.top, dom.video, dom.texture];
  /** Video gelene kadar (ya da videosuzsa) ekranı kaplayan görsel */
  function photo(show: Show) {
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const to = placePhoto(ar, S.vw, S.vh, show.focus);
    dom.top.innerHTML = media.img(show, { width: S.vw, height: to.h, aspect: ar });
    const img = dom.top.querySelector<HTMLImageElement>('img');
    if (img) {
      img.sizes = `${Math.round(S.vw)}px`;
      img.style.transform = `translate(${f(to.x)}px,${f(to.y)}px)`;
    }
  }
  /** Açılmanın / kapanmanın hareket eden bütün parçaları: hepsi aynı anda */
  function moves(on: boolean) {
    const O = G.open;
    const dur = O.dur * red;
    const ease = on ? O.easeIn : O.easeOut;
    const tl = gsap.timeline();
    const all = { duration: dur, ease, overwrite: true };
    tl.to(ex, { v: on ? 1 : 0, ...all }, 0);
    if (!S.mobile) {
      tl.to(lgLong, { opacity: on ? 0 : 1, ...all }, 0);
      tl.to(lgShort, { opacity: on ? 1 : 0, ...all }, 0);
    }
    // künyede başlık dışındaki her şey kaybolup kapanır
    const rest = gInfo.lastElementChild?.querySelector<HTMLElement>('.gi-rest');
    if (rest) tl.to(rest, { height: on ? 0 : 'auto', autoAlpha: on ? 0 : 1, ...all }, 0);
    tl.to([gCap, dom.members], { autoAlpha: on ? 0 : 1, ...all }, 0);
    // video (ve video gelene kadar görsel) ile ağ: açılışta videoAt'te başlayıp videoDur'da belirir;
    // kapanışta hemen kaybolmaya başlar
    tl.to(layers(), { autoAlpha: on ? 1 : 0, duration: O.videoDur * red, ease: 'none', overwrite: true }, on ? O.videoAt * red : 0);
    return tl;
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
      if (hovered === it) hovered = null;
      drop(it);
      items.delete(n);
    }
    if (c !== lastCenter) {
      lastCenter = c;
      items.forEach((it) => light(it, it.n === c));
      texts(c, textFor !== null);
    }
    // ortadaki daire düzleşir: masaüstünde fare üzerindeyken, mobilde galeri durunca
    const rest = !S.pressed && !o.busy() && Math.abs(S.pos - c) < 1e-3;
    const flatOn = !S.open && (S.mobile ? rest : hoverCenter);
    const R = G.rotate;
    const Sh = G.shadow;
    const dist = (Math.hypot(S.vw, S.vh) + D) * ex.v;
    for (const it of items.values()) {
      const t = it.n - S.pos;
      flatten(it, flatOn && it.n === c);
      const a = place(t);
      spring(it, dt);
      const fl = it.fl.f;
      const fz = it.fz.v;
      // açık hâl: köşegen boyunca ekrandan çıkış
      const out = t > 0 ? outR : outL;
      const x = a.x + out[0] * dist;
      const y = a.y + out[1] * dist;
      const s = a.s * lerp(1, G.flat.scale, fz);
      const rx = lerp(R.x + fl * G.float.rx, 0, fz);
      const ry = lerp(a.ry, 0, fz);
      const rz = lerp(R.z, 0, fz);
      const base = matrix(x, y, s, lerp(R.x, 0, fz), ry, rz);
      const full = matrix(x, y - fl * G.float.y * H * (1 - fz), s, rx, ry, rz, it.tilt.x, it.tilt.y);
      it.box = project(full);
      const tf = full.toString();
      if (tf !== it.tf) {
        it.tf = tf;
        it.el.style.transform = tf;
        // ortadaki en önde; uzaklaştıkça geride
        it.el.style.zIndex = String(Math.round(1000 - Math.abs(t) * 100));
      }
      // gölge: süzülmesiz izdüşümün altında; yukarı süzüldükçe küçülür, bulanıklaşır, açılır; düzleşince yuvarlaklaşır
      const pb = project(base);
      const lift = fl * (1 - fz);
      const k = 1 - lift * Sh.lift.shrink;
      const blur = Sh.blur + lift * (Sh.lift.blur - Sh.blur);
      const op0 = lerp(Sh.centerOpacity, Sh.opacity, clamp(Math.abs(t), 0, 1));
      const op = Math.max(0, op0 * (1 + (lift * (Sh.lift.opacity - Sh.opacity)) / Sh.opacity));
      const sx = (-it.tilt.y / G.tilt.max) * Sh.tiltShift * H;
      const sy = (it.tilt.x / G.tilt.max) * Sh.tiltShift * H;
      const sw0 = D * Sh.width;
      const sh0 = sw0 * Sh.height;
      const q = ((pb.w * Sh.width) / sw0) * k;
      const qy = q * (lerp(Sh.height, G.flat.shadowHeight, fz) / Sh.height);
      const gx = pb.cx + Sh.right * H + sx;
      const gy = pb.bottom + Sh.below * H + sy;
      const sk = `${f(gx, 1)}|${f(gy, 1)}|${f(q, 3)}|${f(qy, 3)}|${f(op, 3)}|${f(blur, 1)}`;
      if (sk !== it.sk) {
        it.sk = sk;
        it.sh.style.transform = `translate3d(${f(gx - sw0 / 2)}px,${f(gy - sh0 / 2)}px,0) scale(${f(q, 4)},${f(qy, 4)})`;
        it.sh.style.opacity = f(op, 3);
        // bulanıklık ekranda px: ölçek öncesine çevrilir
        it.sh.style.filter = `blur(${f(blur / Math.max(0.05, q), 1)}px)`;
      }
    }
    const cur = gInfo.lastElementChild;
    visibleEls = cur ? [cur, dom.title] : [dom.title];
  }

  const api: Gallery = {
    layout,
    rebuild() {
      o.video.remove();
      clearAuto();
      titleClear();
      openTl?.kill();
      openTl = null;
      openShow = null;
      exiting = false;
      S.open = false;
      S.full = false;
      ex.v = 0;
      closeOn = false;
      gsap.killTweensOf([dom.close, ...layers(), gCap, dom.members, lgLong, lgShort]);
      gsap.set(dom.close, { autoAlpha: 0 });
      gsap.set(layers(), { autoAlpha: 0 });
      gsap.set([gCap, dom.members], { autoAlpha: 1 });
      dom.top.innerHTML = '';
      items.forEach(drop);
      items.clear();
      hovered = null;
      hoverCenter = false;
      lastCenter = null;
      textFor = null;
      swaps.forEach((t) => t.kill());
      swaps.clear();
      for (const g of [gInfo, gCap, gStage]) g.innerHTML = '';
    },
    render,
    hit(x, y) {
      const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.gd');
      return el ? +el.dataset.n! : null;
    },
    center: () => Math.round(S.pos),
    step() {
      const a = P.get(0);
      const b = P.get(1);
      return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : S.vh / 2;
    },
    open() {
      if (S.open || S.full || S.paused) return;
      const it = items.get(Math.round(S.pos));
      if (!it) return;
      hover(null);
      S.open = true;
      S.full = true;
      const show = it.show;
      openShow = show;
      photo(show);
      closeIcon(true);
      // tıklamanın içinde, eşzamanlı: video sesle başlar (hazır değilse hazır olunca)
      o.video.prepare(show.fullVideo);
      clearAuto();
      o.video.start(show.fullVideo, () => {
        clearAuto();
        if (S.mobile) return;
        autoTimer = gsap.delayedCall(motion.dur('autoReturn'), () => {
          if (S.full && openShow === show) api.close();
        });
      });
      openTl?.kill();
      openTl = moves(true);
      openTl.call(() => {
        if (S.full && openShow === show && !exiting) titleShow(show);
      });
    },
    close() {
      if (!S.full || exiting) return;
      // tam tersi: her şey aynı anda; başlık çıkar, ses kısılır, video kaybolurken daireler geri gelir
      exiting = true;
      S.full = false;
      clearAuto();
      closeIcon(false);
      titleHide();
      o.video.hide();
      openTl?.kill();
      openTl = moves(false);
      openTl.call(() => {
        o.video.remove();
        dom.top.innerHTML = '';
        const rest = gInfo.lastElementChild?.querySelector<HTMLElement>('.gi-rest');
        if (rest) gsap.set(rest, { clearProps: 'height' });
        openShow = null;
        S.open = false;
        exiting = false;
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
