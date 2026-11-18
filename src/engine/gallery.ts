/* ROTA2 çapraz 3B daire galerisi (CSS 3B; WebGL yok). Bütün ölçüler kimliğin `gallery` / `screen` token'ları.

   Ana daire: p = 0 yuvasındaki daire (en büyük, renkli, en önde; fare üzerindeyken düzleşir, tıklanınca videoyu
   açar). Ekranın ortasına bağlı değildir: konumu serbest bir kompozisyon değeri (mainX, mainY).

   Daireler: her öğe düz, kenarsız bir daire (yalnızca dairesel görsel; odak noktası merkezde, normal
   kaplamanın photoZoom katı). Duruştaki yerleşim (layout) ekrandaki yazılardan hesaplanır:
   - ana dairenin sınır kutusu merkezi (mainX·W, mainY·H; masaüstünde sağ kenarı sağ sütunun columnGap·W solunda);
     temel çap, eğik hâlinin sınır kutusu fitTop (mobilde künyenin altı) ile Bilet Al'ın üstündeki alt sınır arasına
     (her iki yanda gap boşlukla) sığan en büyük değer (en fazla cap·W); ana daire bunun mainScale katı;
   - p = −3 sol kenarda kesilir (merkezi x = 0), köşegen üzerinde; logoya değecekse alt kenarı logonun
     logoClear·H üstünde. p = −1 ve −2 ana daire ile p = −3 arasındaki doğru üzerinde;
   - bütün komşular arası (ekrandaki biçimler, köşegen boyunca) tek boşluk g, iki yanda aynı; g, p = −3'ün merkezi
     x = 0'a gelecek şekilde seçilir ve negatif olabilir (eşit örtüşme). p = +1 … +3 köşegen üzerinde sağ yukarı;
     sığmayan kısım sağ kenarda kesilir;
   - uzaktakiler aynı adımla sürer. Ara konumlar Catmull-Rom eğrisiyle, ölçek s(p) anahtarlarından.
   Ana daire en önde. Eğim rotateX · rotateY · rotateZ; rotateY eğri üzerindeki konuma göre değişir.
   Bütün daireler tam renkli. Alan derinliği: ana daire tam keskin ve opak; diğerleri ana yuvadan uzaklıkları |p|
   ile (hareket sırasında sürekli ara değerle) saydamlaşır ve bulanıklaşır (focus.opacity / focus.blur; mobilde
   bulanıklık mobileBlur katı). Bulanıklık dairenin görsel katmanında filter: blur(), focus.step px adımlarla;
   gölge aynı opaklık katını alır.
   Süzülme: her daire kendi rastgele fazıyla dikeyde ve rotateX'te salınır (yoyo, sine.inOut).
   Fare eğimi (kenardaki daireler): imlece doğru eğilir, yay-sönümle döner (dokunmatikte yok).
   Düzleşme: ana daire masaüstünde fare üzerindeyken, mobilde galeri durunca düz ve tam daire olur,
   flat.scale'e büyür; fare çıkınca / sürükleme başlayınca eğimine döner.

   Gölge: her dairenin gölgesi zemin düzleminde ayrı bir öğe (dairelerin arkasında); dairenin ekrandaki
   izdüşümünden (süzülmesiz) hesaplanır. Yalnızca transform, opacity ve filter.

   Bütün grup (daireler ve gölgeleri) lift·H yukarıda; aralık ve ölçüler değişmez.

   Açık hâl (ana daireye tıklama): diğer daireler yerinde kalır. t = 0'da ana daire düzleşir (eğimsiz), en önde
   kalır ve yerinden, yarıçapı ekranın en uzak köşesine ulaşana kadar büyür (open.dur, open.ease); renkli kalır,
   gölgesi kaybolur. Aynı anda logo, başlık ve altındaki çizgi ile × open.colorDur sn'de beyaza döner; uzun logo
   sağdan kısa logonun genişliğine kırpılarak kaybolur, kısa logo aynı yerde belirir; sütunun geri kalanı
   (tanıtım, künye) kaybolup kapanır, Üye Ol / Giriş ve Bilet Al kaybolur. Büyüme bitince ekranı kaplayan daireyle birebir aynı
   kırpımdaki keskin görsel altına yerleşir. Video ve ağ (mesh.opacity) open.videoAt'te başlayıp open.videoDur'da
   belirir. Kapanma tam tersi: video görsele döner, sonra daire yerine ve eğimine küçülür; geri kalanı onunla
   birlikte döner.

   Mobil (dikey sayfa): üstte uzun logo ve üye düğmeleri; logonun hemen altında daire şeridi (ana daire ortada,
   mobile.mainD·W), hemen altında Bilet Al; onun altında başlık, tanıtım ve künye (her zaman açık). Yatay sürükleme daireleri, dikey sürükleme sayfayı kaydırır.

   Yazılar (başlık + tanıtım, künye) ana daireye göre değişir: eski satırlar yukarı
   kayarak kaybolur, yeniler aşağıdan gelir (satırlar arası gecikmeyle). */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Media } from './media';
import { clamp, mod, type State } from './state';
import { fitTitles, capOffset } from './screen';
import type { Identity, Show, TemplateContext } from './types';
import type { FullVideoPlayer } from './fullVideo';
import type { Dom } from './theme';

export interface Gallery {
  /** Duruştaki yerleşimi ekrandaki yazılardan yeniden hesapla (ekran ölçüsü / fontlar değişince) */
  layout(): void;
  rebuild(): void;
  render(): void;
  /** Ekran noktasındaki dairenin sırası */
  hit(x: number, y: number): number | null;
  /** Ana dairenin sırası */
  main(): number;
  /** Bir adımın ekrandaki uzunluğu (px): ana daire ile sonraki dairenin duruş noktaları arası */
  step(): number;
  /** Açık hâl: ana daire ekranı kaplayana kadar büyür, tam ekran video akışı başlar */
  open(): void;
  /** Açık hâlden galeriye: tam tersi */
  close(): void;
  /** Tam ekranda yüklü bir video var mı (başlamazsa kaldırılır) */
  videoActive(): boolean;
  /** Yatay telefon katmanı: videoyu duraklat (on) / sessiz sürdür (off) */
  suspend(on: boolean): void;
  /** Slayt gösterisi: video ve kendiliğinden dönüş zamanlayıcısı bekler (on) / sürer (off; kullanıcı dokunuşunun içinde) */
  hold(on: boolean): void;
  /** Video ön yüklemesi açık / kapalı (ilk ekran sürerken kapalı) */
  preload(on: boolean): void;
  /** Fare hareketi (eğim, düzleşme); null: fare yüzeyden çıktı */
  hover(e: PointerEvent | null): void;
  /** Fontlar yüklenince yazıları yeniden kur */
  refresh(): void;
  visible(): Element[];
  /** Mobil dikey sayfa: kaydır (px) ve bırakma hızıyla (px/sn) ataletli kaydır */
  scrollBy(dy: number): void;
  flingScroll(v: number): void;
}

interface Disc {
  n: number;
  show: Show;
  el: HTMLElement;
  /** Görsel katmanı (bulanıklık) */
  im: HTMLElement | null;
  sh: HTMLElement;
  /** Süzülme (−1..1; +1 en yukarı) */
  fl: { f: number };
  flTw: gsap.core.Tween | null;
  /** Düzleşme (0..1) ve hedefi */
  fz: { v: number };
  flat: boolean;
  /** Eğim (°) ve hızı; hedef */
  tilt: { x: number; y: number; vx: number; vy: number; tx: number; ty: number };
  /** Ekrandaki izdüşüm (son kare) */
  box: Box;
  tf: string;
  sk: string;
  /** Son yazılan opaklık / bulanıklık */
  dk: string;
}

interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
  bottom: number;
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
  const gTicket = dom.ui.querySelector<HTMLElement>('.gc')!;

  /* ---------- geometri ---------- */
  /** Ölçek 1'deki daire çapı (px); duruştaki yerleşim noktaları p = −3 … +3 */
  let D = 100;
  let P = new Map<number, [number, number]>();

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
  /** Eğri üzerindeki konum t (ana yuvadan adım): Catmull-Rom */
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
  /** Dairenin kenarını perspektifle ekrana iz düşür: ekrandaki biçim (çokgen) */
  const ringOf = (n: number) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2)]);
  const RING = ringOf(24);
  const RING_FINE = ringOf(72);
  function shape(m: DOMMatrix, ring = RING): [number, number][] {
    const r = D / 2;
    const d = G.perspective;
    const ox = S.vw / 2;
    const oy = S.vh / 2;
    return ring.map(([c, s]) => {
      const lx = c * r, ly = s * r;
      const X = m.m11 * lx + m.m21 * ly + m.m41;
      const Y = m.m12 * lx + m.m22 * ly + m.m42;
      const Z = m.m13 * lx + m.m23 * ly + m.m43;
      const k = d / Math.max(1, d - Z);
      return [ox + (X - ox) * k, oy + (Y - oy) * k];
    });
  }
  /** Sınır kutusu */
  function project(m: DOMMatrix): Box {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [px, py] of shape(m)) {
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, bottom: y1 };
  }
  /** Duruştaki k. dairenin (x, y) noktasındaki matrisi ve sınır kutusu */
  const restMatrix = (k: number, x: number, y: number) => matrix(x, y, scaleAt(k), G.rotate.x, ryAt(k), G.rotate.z);
  const restBox = (k: number, x: number, y: number) => project(restMatrix(k, x, y));
  /** k. dairenin sınır kutusu merkezini (X, Y)'ye getiren duruş noktası */
  function anchorFor(k: number, X: number, Y: number): [number, number] {
    let a: [number, number] = [X, Y];
    for (let i = 0; i < 4; i++) {
      const b = restBox(k, a[0], a[1]);
      a = [a[0] + X - b.cx, a[1] + Y - b.cy];
    }
    return a;
  }
  /** Sınır kutusu merkezi (X, Y) olan k. dairenin ekrandaki biçiminin, merkezden u yönünde kenarına uzaklığı */
  function reach(k: number, X: number, Y: number, u: [number, number]) {
    const [ax, ay] = anchorFor(k, X, Y);
    const pts = shape(restMatrix(k, ax, ay), RING_FINE);
    let t = 0;
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      const [qx, qy] = pts[(i + 1) % pts.length];
      const ex = qx - px, ey = qy - py;
      const den = u[0] * ey - u[1] * ex;
      if (Math.abs(den) < 1e-9) continue;
      const dx = px - X, dy = py - Y;
      const tt = (dx * ey - dy * ex) / den;
      const ss = (dx * u[1] - dy * u[0]) / den;
      if (ss >= 0 && ss <= 1 && tt > t) t = tt;
    }
    return t;
  }

  /* ---------- yazılar: iskelet ---------- */
  dom.ui.innerHTML =
    '<div class="gi"></div>' +
    `<div class="gc">${id.templates.circleButtons([['Bilet Al', 'ticket']], o.tctx()).replace('class="cb"', 'class="cb gtk"')}</div>`;
  const gInfo = dom.ui.querySelector<HTMLElement>('.gi')!;
  // mobil açık hâlin alttaki başlık bloğu (yazıların üstünde, kaydırılmaz)
  const gVid = document.createElement('div');
  gVid.className = 'gvb';
  dom.ui.after(gVid);
  /** Mobil açık hâl: video oynamaya başladı (logo kısaldı, başlık bloğu kayboldu) */
  let playing = false;
  // Bilet Al şimdilik işlevsiz; tıklama galeriye geçmez
  const ticket = dom.ui.querySelector<HTMLElement>('.gtk')!;
  ticket.addEventListener('pointerdown', (e) => e.stopPropagation());
  ticket.addEventListener('click', (e) => e.stopPropagation());

  /** Başlık en fazla titleLines satır (sığmazsa küçülür) */
  const fitTitle = (el: ParentNode) => fitTitles(el, T.info.titleLines, T.info.titleLh);


  /* ---------- duruştaki yerleşim ---------- */
  function layout() {
    const W = S.vw;
    const H = S.vh;
    const root = document.documentElement;
    const css = (k: string) => parseFloat(getComputedStyle(root).getPropertyValue(k)) || 0;
    const gap = GL.gap * H;

    // ekrandaki başlık yeni ölçüde en fazla titleLines satır
    fitTitle(gInfo);
    // üst sınır (masaüstü)
    const mBottom = css('--fit-top');
    // alt sınır: Bilet Al'ın üstünden stage.gap ve bir etiket satırı yukarısı (eski sahne adı yeri)
    const tD = T.ticket.d * H;
    const gcBottom = css('--gc-bottom');
    const stageTop = H - gcBottom - tD - css('--gs-gap') - css('--fs-label-px');

    // sol uçtaki daire için alt sınır (masaüstü): logo sol üstte, sınır uzun logonun önceki sol alt yeri
    // (kompozisyon değişmesin); mobilde sayfa kaydığı için sınır yok
    const logoTop = S.mobile ? null : H - S.safeBottom - (T.logo.top + T.logo.h) * H;

    // ana daire: sınır kutusunun merkezi (mainX, mainY). Temel çap, eğik hâlinin sınır kutusu üye düğmelerinin
    // altı (mobilde künyenin altı) ile alt sınır arasına her iki yanda gap boşlukla sığan en büyük değer
    // (en fazla cap); ana daire bunun mainScale katı
    // mobil: ana daire ortada, çapı mobile.mainD·W; dikey yeri metne göre (flow), yerleşim ekranın ortasında kurulur
    const top = mBottom + gap;
    const bottom = stageTop - gap;
    const cap = GL.cap.web * W;
    let mx = (S.mobile ? GL.mainX.mobile : GL.mainX.web) * W;
    const my = S.mobile ? H / 2 : GL.mainY.web * H;
    if (S.mobile) D = (G.mobile.mainD * W) / GL.mainScale;
    else {
      D = cap;
      for (let i = 0; i < 4; i++) D = Math.min(cap, D * (Math.max(1, bottom - top) / restBox(0, mx, (top + bottom) / 2).h));
      D *= GL.mainScale;
    }
    // masaüstü: ana dairenin ekrandaki sağ kenarı sağ sütunun sol kenarından columnGap·W solda (grup sola kayar)
    if (!S.mobile) {
      const right = css('--gi-left') - GL.columnGap * W;
      for (let i = 0; i < 3; i++) mx = right - restBox(0, mx, my).w / 2;
    }
    P = new Map();
    P.set(0, anchorFor(0, mx, my));
    const M: [number, number] = [mx, my];
    const unit = (v: [number, number]): [number, number] => {
      const l = Math.hypot(v[0], v[1]) || 1;
      return [v[0] / l, v[1] / l];
    };
    const neg = (u: [number, number]): [number, number] => [-u[0], -u[1]];
    const at = (u: [number, number], t: number): [number, number] => [M[0] + u[0] * t, M[1] + u[1] * t];

    // sol: p = −3 sol kenarda kesilir (sınır kutusu merkezi x = 0), köşegen üzerinde; logoya değecekse alt kenarı
    // logonun üstünden logoClear·H yukarıda. p = −1 ve −2 ana daire ile p = −3 arasındaki doğru üzerinde, bütün
    // komşular arası (ekrandaki biçimler, köşegen boyunca) eşit boşlukla g; g negatif olabilir (eşit örtüşme).
    // Aynı g sağ tarafta da kullanılır
    const slope = (GL.slope[1] * H) / Math.abs(GL.slope[0] * W);
    const h3 = restBox(-3, 0, my).h;
    let y3 = S.mobile ? my + mx * slope : Math.min(my + mx * slope, H - h3 / 2);
    if (logoTop !== null) y3 = Math.min(y3, logoTop - GL.logoClear * H - h3 / 2);
    const E: [number, number] = [0, y3];
    const uL = unit([E[0] - mx, E[1] - my]);
    const L = Math.hypot(E[0] - mx, E[1] - my);
    /** İki komşu arası boşluk: köşegen (merkezleri birleştiren doğru) boyunca, ekrandaki biçimlerin kenarları arası */
    const gapOf = (ka: number, A: [number, number], kb: number, B: [number, number]) => {
      const u = unit([B[0] - A[0], B[1] - A[1]]);
      return Math.hypot(B[0] - A[0], B[1] - A[1]) - reach(ka, A[0], A[1], u) - reach(kb, B[0], B[1], neg(u));
    };
    const ts = [L / 3, (2 * L) / 3];
    const centers = (): [number, number][] => [M, ...ts.map((t) => at(uL, t)), E];
    // eşit boşluk: t1, t2 doğru üzerinde kaydırılır (sönümlü yineleme)
    for (let i = 0; i < 40; i++) {
      const c = centers();
      const g = [0, 1, 2].map((n) => gapOf(-n, c[n], -(n + 1), c[n + 1]));
      if (Math.abs(g[0] - g[1]) < 0.25 && Math.abs(g[1] - g[2]) < 0.25) break;
      ts[0] += (g[1] - g[0]) * 0.4;
      ts[1] += (g[2] - g[1]) * 0.4;
    }
    const cl = centers();
    cl.slice(1).forEach((c, i) => P.set(-(i + 1), anchorFor(-(i + 1), c[0], c[1])));
    const g = [0, 1, 2].map((n) => gapOf(-n, cl[n], -(n + 1), cl[n + 1])).reduce((a, b) => a + b) / 3;

    // sağ: p = +1 … +3 köşegen üzerinde (sağ yukarı); her komşu arası (ekrandaki biçimler, köşegen boyunca) aynı g.
    // Sığmayan kısım sağ kenarda kesilir
    const uR = unit([-GL.slope[0] * W, -GL.slope[1] * H]);
    let tPrev = 0;
    for (let k = 1; k <= 3; k++) {
      const prev = at(uR, tPrev);
      const e = tPrev + reach(k - 1, prev[0], prev[1], uR) + g;
      let t = e + (D * scaleAt(k)) / 2;
      for (let i = 0; i < 5; i++) {
        const c = at(uR, t);
        t = e + reach(k, c[0], c[1], neg(uR));
      }
      const c = at(uR, t);
      P.set(k, anchorFor(k, c[0], c[1]));
      tPrev = t;
    }

    // Bilet Al ana dairenin altında ortalı
    root.style.setProperty('--gc-x', `${mx.toFixed(2)}px`);
    // bütün grup lift·H yukarı: aralık ve ölçüler aynı
    const lift = (S.mobile ? GL.lift.mobile : GL.lift.web) * H;
    P.forEach((v) => (v[1] -= lift));
    // mobil: ana dairenin ekrandaki üst ve alt kenarı; duruşta düzleşmiş (flat.scale) ya da eğik hâli (süzülme
    // payıyla), hangisi daha dışarıdaysa. Komşular ana daireye göre yerinde kalır
    {
      const p0 = P.get(0)!;
      const b = restBox(0, p0[0], p0[1]);
      const fr = (D * scaleAt(0) * G.flat.scale) / 2;
      stripTop = Math.min(b.cy - b.h / 2 - G.float.y * H, p0[1] - fr);
      stripBottom = Math.max(b.bottom + G.float.y * H, p0[1] + fr);
    }
    // mobil: daire şeridi logonun / düğmelerin altında
    flowTo();
    // daireler yeni çapla yeniden kurulur
    items.forEach(drop);
    items.clear();
    hovered = null;
    lastMain = null;
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
  function make(n: number): Disc {
    const show = showAt(n);
    const el = document.createElement('div');
    el.className = 'gd';
    el.dataset.n = String(n);
    el.style.cssText = `width:${f(D)}px;height:${f(D)}px;left:${f(-D / 2)}px;top:${f(-D / 2)}px`;
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const fr = discFrame(show, ar);
    el.innerHTML = media.img(show, { width: fr.w, height: fr.h, aspect: ar });
    const im = el.querySelector<HTMLElement>('img');
    if (im) im.style.transform = `translate(${f(fr.x)}px,${f(fr.y)}px)`;
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
      n, show, el, im, sh, fl, flTw, fz: { v: 0 }, flat: false,
      tilt: { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 },
      box: { cx: 0, cy: 0, w: 0, h: 0, bottom: 0 },
      tf: '', sk: '', dk: '',
    };
  }
  function drop(it: Disc) {
    it.flTw?.kill();
    gsap.killTweensOf(it.fz);
    it.el.remove();
    it.sh.remove();
  }
  /** Alan derinliği: ana yuvadan uzaklık |p|'de opaklık ve bulanıklık (W oranı); anahtarlar arası doğrusal */
  function depth(t: number) {
    const F = G.focus;
    const at = (keys: number[]) => {
      const u = clamp(Math.abs(t), 0, keys.length - 1);
      const i = Math.min(keys.length - 2, Math.floor(u));
      return lerp(keys[i], keys[i + 1], u - i);
    };
    return { op: at(t > 0 ? F.opacityRight : F.opacity), blur: at(F.blur) * S.vw * (S.mobile ? F.mobileBlur : 1) };
  }
  /** Düzleşme: düz tam daire ve flat.scale (ya da eğimine dönüş) */
  function flatten(it: Disc, on: boolean) {
    if (it.flat === on) return;
    it.flat = on;
    gsap.to(it.fz, { v: on ? 1 : 0, duration: G.flat.dur * red, ease: G.flat.ease, overwrite: true });
  }

  /* ---------- fare: kenardaki dairelerde eğim, ana dairede düzleşme ---------- */
  let hovered: Disc | null = null;
  let hoverMain = false;
  function hover(e: PointerEvent | null) {
    let hit: Disc | null = null;
    hoverMain = false;
    if (e && e.pointerType === 'mouse' && !S.open && !S.pressed) {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.gd');
      if (el) hit = items.get(+el.dataset.n!) ?? null;
      if (hit && hit.n === Math.round(S.pos)) {
        hoverMain = true;
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
    fitTitle(nu);
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
    // mobil: sayfanın altı (künyenin altı) yeni yazıya göre
    const cur = gInfo.lastElementChild as HTMLElement | null;
    giH = cur?.offsetHeight ?? 0;
    // künye satırları arası: satırın üst + alt iç boşluğu ve aradaki çizgi
    const row = cur?.querySelector<HTMLElement>('.gr');
    const rl = cur?.querySelector<HTMLElement>('.gr + .lr');
    if (row) {
      const cs = getComputedStyle(row);
      rowGap = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + (rl?.offsetHeight ?? 0);
    }
    if (S.mobile) rootStyle.setProperty('--gc-top', `${gcTop().toFixed(1)}px`);
  }

  /* ---------- × ---------- */
  let closeOn = false;
  function closeIcon(on: boolean) {
    if (closeOn === on) return;
    closeOn = on;
    gsap.to(dom.close, { autoAlpha: on ? 1 : 0, duration: motion.dur('closeFade'), ease: motion.ease.fade, overwrite: true });
  }

  /* ---------- açık hâl ---------- */
  /** Ana dairenin büyümesi (0: yerinde, eğik; 1: düz, ekranı kaplar) ve büyüyen daire */
  const grow = { v: 0 };
  let openN: number | null = null;
  let openTl: gsap.core.Timeline | null = null;
  let openShow: Show | null = null;
  let exiting = false;
  let autoTimer: gsap.core.Tween | null = null;
  const clearAuto = () => {
    autoTimer?.kill();
    autoTimer = null;
  };
  /* ---------- mobil dikey sayfa ----------
     Sayfa: üstte logo ve üye düğmeleri; altında daire şeridi (ana daire ortada; ekrandaki üstü logonun altından
     mobile.logoGap·W aşağıda); ana dairenin altından mobile.titleGap·W aşağıda başlığın büyük harf üstü; başlık,
     tarih + sayaç, tanıtım ve künye (.gi; her zaman açık); sayfanın sonunda, künyenin son satırının hemen altında
     ortada Bilet Al. Dikey kaydırma sanal: yazılar, logo ve düğmeler
     --scroll kadar yukarı kayar, daireler aynı kadar yukarıda çizilir. */
  const flow = { v: 0 };
  const scroll = { v: 0 };
  /** Ana dairenin ekrandaki en üst ve en alt kenarı (flow'suz; eğik / düz, süzülme payıyla) */
  let stripTop = 0;
  let stripBottom = 0;
  /** Başlık kutusunun üstünden büyük harf üstüne uzaklık (px) */
  let titleCap = 0;
  /** Güncel başlık / tanıtım / künye yüksekliği (yazı değişince ölçülür) */
  let giH = 0;
  let lastScroll = -1;
  const rootStyle = document.documentElement.style;
  const rootCss = (k: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(k)) || 0;
  const shiftY = () => (S.mobile ? flow.v - scroll.v : 0);
  /** Başlığın sayfadaki üstü: daire şeridinin altı */
  const giTop = () => stripBottom + flow.v + G.mobile.titleGap * S.vw - titleCap;
  /** Künye satırları arası boşluk (Bilet Al ile künyenin son satırı arası da bu) */
  let rowGap = 0;
  /** Bilet Al'ın sayfadaki üstü: künyenin son satırının altında */
  const gcTop = () => giTop() + giH + rowGap;
  /** Sayfanın en çok kaydırılması: Bilet Al'ın altında olağan alt boşluk (iPhone ana çubuğu dahil) */
  function maxScroll() {
    return Math.max(0, gcTop() + T.ticket.d * S.vh + rootCss('--gc-bottom') - S.vh);
  }
  /** Daire şeridini logonun / düğmelerin altına yerleştir (mobil; yazıdan bağımsız, sabit) */
  function flowTo() {
    if (!S.mobile) {
      flow.v = 0;
      return;
    }
    flow.v = rootCss('--head-bottom') + G.mobile.logoGap * S.vw - stripTop;
    titleCap = capOffset(T.type.title, T.info.title.mobile * S.vw, T.info.titleLh);
    rootStyle.setProperty('--gi-top', `${giTop().toFixed(1)}px`);
    rootStyle.setProperty('--gc-top', `${gcTop().toFixed(1)}px`);
  }
  /** Her karede (mobil): sayfa kaydırması */
  function mobileFrame() {
    if (!gsap.isTweening(scroll)) scroll.v = clamp(scroll.v, 0, maxScroll());
    if (Math.abs(scroll.v - lastScroll) > 0.05) {
      lastScroll = scroll.v;
      rootStyle.setProperty('--scroll', `${scroll.v.toFixed(1)}px`);
    }
  }

  const layers = () => [dom.top, dom.video, dom.texture];
  /** Ana dairenin büyüdüğünde ekranı kaplayan ölçeği: yarıçapı merkezinden ekranın en uzak köşesine */
  function fullScale(n: number) {
    const p = place(n - S.pos);
    const a = { x: p.x, y: p.y + shiftY() };
    const r = Math.max(Math.hypot(a.x, a.y), Math.hypot(S.vw - a.x, a.y), Math.hypot(a.x, S.vh - a.y), Math.hypot(S.vw - a.x, S.vh - a.y));
    return { x: a.x, y: a.y, s: (2 * r) / D };
  }
  /** Büyüme bitince dairenin altına: ekranı kaplayan daireyle birebir aynı kırpımda, ekran çözünürlüğünde görsel */
  function photo(show: Show, n: number) {
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const fr = discFrame(show, ar);
    const g = fullScale(n);
    dom.top.innerHTML = media.img(show, { width: fr.w * g.s, height: fr.h * g.s, aspect: ar });
    const img = dom.top.querySelector<HTMLImageElement>('img');
    if (img) {
      img.sizes = `${Math.round(Math.max(S.vw, fr.w * g.s))}px`;
      img.style.transform = `translate(${f(g.x + (fr.x - D / 2) * g.s)}px,${f(g.y + (fr.y - D / 2) * g.s)}px)`;
    }
  }
  /** Bilet Al: açık hâlde gizli ve tıklanamaz (kök sınıfı is-video); açık hâl tamamen kapanınca geri gelir */
  function showTicket(on: boolean) {
    document.documentElement.classList.toggle('is-video', !on);
    gsap.killTweensOf(gTicket);
    if (on) gsap.to(gTicket, { autoAlpha: 1, duration: G.open.colorDur * red, ease: 'none', onStart: () => gsap.set(gTicket, { clearProps: 'pointerEvents' }) });
    else gsap.set(gTicket, { pointerEvents: 'none' });
  }
  /** Uzun logo sağdan kısa logonun genişliğine kırpılarak kaybolur, kısa logo aynı yerde belirir (on); tersi */
  function logoShort(tl: gsap.core.Timeline, on: boolean, t: number) {
    const O = G.open;
    const lg = { duration: O.colorDur * red, ease: O.logoEase, overwrite: 'auto' as const };
    const cut = `inset(0px ${+(lgLong.dataset.clip ?? 0)}px 0px 0px)`;
    tl.fromTo(lgLong, { clipPath: on ? 'inset(0px 0px 0px 0px)' : cut }, { clipPath: on ? cut : 'inset(0px 0px 0px 0px)', opacity: on ? 0 : 1, ...lg, immediateRender: false }, t);
    tl.to(lgShort, { opacity: on ? 1 : 0, ...lg }, t);
  }
  /** Mobil açık hâl, ikinci evre: video gerçekten oynuyor — logo kısa logoya kısalır, başlık bloğu kaybolur */
  function playStarted() {
    if (!S.mobile || !S.full || playing) return;
    playing = true;
    const tl = gsap.timeline();
    logoShort(tl, true, 0);
    tl.to(gVid, { autoAlpha: 0, duration: G.mobile.videoFade * red, ease: 'none', overwrite: 'auto' }, 0);
  }
  /** Açılma / kapanma. Açılış: t = 0'da daire büyümeye, yazılar ve logo geçişe başlar; videoAt'te video ve ağ
      belirir. Kapanış tam tersi: önce video ve ağ kaybolur, daire simetrik olarak küçülür */
  function moves(on: boolean) {
    const O = G.open;
    const dur = O.dur * red;
    const vAt = O.videoAt * red;
    const vDur = O.videoDur * red;
    const total = Math.max(dur, vAt + vDur);
    // açılışta büyüme 0'da, video vAt'te; kapanışta zaman ekseni ters
    const at = (t: number, d: number) => (on ? t : total - t - d);
    const tl = gsap.timeline();
    const all = { duration: dur, ease: O.ease, overwrite: true };
    const t0 = at(0, dur);
    tl.to(grow, { v: on ? 1 : 0, ...all }, t0);
    // logo yerinde ve aynı boyda kalır; logo, başlık ve altındaki çizgi ile × açılışın başında colorDur sn'de
    // beyaza döner (kapanışta tam tersi)
    const cd = O.colorDur * red;
    tl.to([dom.brand, gInfo, dom.close], { color: on ? O.color : T.text, duration: cd, ease: 'none', overwrite: 'auto' }, at(0, cd));
    // uzun logo sağdan kısa logonun genişliğine kırpılarak kaybolur, kısa logo aynı yerde belirir
    // (kapanışta kısa logo kaybolur, uzun logo kısa genişlikten tam genişliğe uzar)
    // mobil: açılışta uzun logo kalır (video oynayınca kısalır: playStarted); kapanışta kısaldıysa geri uzar
    if (!S.mobile || (!on && playing)) logoShort(tl, on, at(0, cd));
    if (S.mobile) {
      playing = false;
      // galerideki başlık grubu açık hâlde gizli; altta beyaz başlık bloğu (video başlamadan)
      tl.to(gInfo, { autoAlpha: on ? 0 : 1, duration: cd, ease: 'none', overwrite: 'auto' }, at(0, cd));
      if (on) {
        const show = openShow;
        gVid.innerHTML = show ? id.templates.videoTitle(show, o.tctx()) : '';
        fitTitle(gVid);
        o.onCreate(gVid);
        gsap.set(gVid, { color: O.color });
      }
      tl.to(gVid, { autoAlpha: on ? 1 : 0, duration: cd, ease: 'none', overwrite: 'auto' }, at(0, cd));
    }
    // sütunda başlık ve altındaki çizgi dışındaki her şey (tanıtım, künye) kaybolup kapanır; başlık yerinde kalır
    const rest = gInfo.lastElementChild?.querySelector<HTMLElement>('.gi-rest');
    if (rest) tl.to(rest, { height: on ? 0 : 'auto', autoAlpha: on ? 0 : 1, ...all }, t0);
    tl.to(dom.members, { autoAlpha: on ? 0 : 1, ...all }, t0);
    // Bilet Al açık hâlde hiç görünmez: açılışta t = 0'da kaybolur (tıklanamaz); kapanışta ancak açık hâl tamamen
    // kapandıktan sonra döner (showTicket())
    if (on) tl.to(gTicket, { autoAlpha: 0, ...all }, 0);
    // ekranı kaplayan keskin görsel: büyüme bitince altına girer; kapanışta küçülme başlarken kalkar
    tl.set(dom.top, { autoAlpha: on ? 1 : 0 }, on ? dur : t0);
    // video ve ağ
    const fade = { duration: vDur, ease: 'none', overwrite: true };
    const tv = at(vAt, vDur);
    tl.to(dom.video, { autoAlpha: on ? 1 : 0, ...fade }, tv);
    tl.to(dom.texture, { autoAlpha: on ? G.mesh.opacity : 0, ...fade }, tv);
    return tl;
  }

  /* ---------- video ön yüklemesi ---------- */
  let preloadOn = false;
  let restAt: number | null = null;
  let restFor: number | null = null;

  /* ---------- çizim ---------- */
  let lastMain: number | null = null;
  let visibleEls: Element[] = [];
  function render() {
    const dt = Math.min(0.1, gsap.ticker.deltaRatio() / 60);
    const H = S.vh;
    const c = Math.round(S.pos);
    // pencere: ana yuvadan ±around adım
    for (let n = c - G.around; n <= c + G.around; n++) if (!items.has(n)) items.set(n, make(n));
    for (const [n, it] of items) {
      if (Math.abs(n - c) <= G.around) continue;
      if (hovered === it) hovered = null;
      drop(it);
      items.delete(n);
    }
    if (c !== lastMain) {
      lastMain = c;
      texts(c, textFor !== null);
    }
    if (S.mobile) mobileFrame();
    // ana daire düzleşir: masaüstünde fare üzerindeyken, mobilde galeri durunca
    const rest = !S.pressed && !o.busy() && Math.abs(S.pos - c) < 1e-3;
    // video ön yüklemesi: ana daire preload.rest sn duruşta kalınca oynatıcısı görünmez, sessiz hazırlanır
    // (ilk ekran, slayt gösterisi ve açık hâl sürerken değil)
    if (rest && preloadOn && !S.open && !S.slides && !S.paused) {
      const now = performance.now();
      if (restAt === null || restFor !== c) {
        restAt = now;
        restFor = c;
      } else if (now - restAt >= G.preload.rest * 1000 && !o.video.prepared(showAt(c).fullVideo)) {
        o.video.prepare(showAt(c).fullVideo);
      }
    } else restAt = null;
    const flatOn = !S.open && (S.mobile ? rest : hoverMain);
    const R = G.rotate;
    const Sh = G.shadow;
    const gv = grow.v;
    const gFull = openN !== null && gv > 0 ? fullScale(openN) : null;
    for (const it of items.values()) {
      const t = it.n - S.pos;
      flatten(it, flatOn && it.n === c);
      const a = place(t);
      spring(it, dt);
      const fl = it.fl.f;
      // açık hâl: büyüyen daire düzleşir, yerinden ekranı kaplayana kadar büyür; diğerleri yerinde
      const g = gFull && it.n === openN ? gv : 0;
      const fz = Math.max(it.fz.v, g);
      const x = a.x;
      // mobil: sayfa konumu (metne göre kayma) − sayfa kaydırması
      const y = a.y + shiftY();
      const s = lerp(a.s * lerp(1, G.flat.scale, it.fz.v), gFull ? gFull.s : a.s, g);
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
        // ana daire en önde (büyüyen daire her şeyin önünde); uzaklaştıkça geride
        it.el.style.zIndex = String(g > 0 ? 2000 : Math.round(1000 - Math.abs(t) * 100));
      }
      // gölge: süzülmesiz izdüşümün altında; yukarı süzüldükçe küçülür, bulanıklaşır, açılır; düzleşince yuvarlaklaşır
      const pb = project(base);
      const lift = fl * (1 - fz);
      const k = 1 - lift * Sh.lift.shrink;
      const blur = Sh.blur + lift * (Sh.lift.blur - Sh.blur);
      // alan derinliği: daire ve gölgesi aynı opaklık katı; bulanıklık görsel katmanında (ekran px → yerel px,
      // focus.step adımlarla)
      const dp = depth(t);
      const sc = Math.max(0.05, pb.w / D);
      const bl = Math.round(dp.blur / sc / G.focus.step) * G.focus.step;
      const dk = `${f(dp.op, 3)}|${bl}`;
      if (dk !== it.dk) {
        it.dk = dk;
        it.el.style.opacity = f(dp.op, 3);
        if (it.im) it.im.style.filter = bl > 0 ? `blur(${bl}px)` : 'none';
      }
      const op0 = lerp(Sh.mainOpacity, Sh.opacity, clamp(Math.abs(t), 0, 1)) * (1 - g) * dp.op;
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
    // sayaç künyede: yalnızca güncel içerik
    // sayaç künyede (mobilde ayrı künye): yalnızca güncel içerik
    visibleEls = [gInfo.lastElementChild, S.full && S.mobile ? gVid : null].filter((e): e is Element => !!e);
  }

  const api: Gallery = {
    layout,
    rebuild() {
      o.video.clear();
      restAt = null;
      clearAuto();
      openTl?.kill();
      openTl = null;
      openShow = null;
      exiting = false;
      S.open = false;
      S.full = false;
      grow.v = 0;
      openN = null;
      closeOn = false;
      gsap.killTweensOf([dom.close, ...layers(), gInfo, dom.members, gTicket, dom.brand, lgLong, lgShort, flow, scroll]);
      gsap.killTweensOf(gVid);
      gsap.set(gVid, { autoAlpha: 0 });
      gVid.innerHTML = '';
      playing = false;
      gsap.set(gInfo, { autoAlpha: 1 });
      gsap.set(lgLong, { clipPath: 'inset(0px 0px 0px 0px)', opacity: 1 });
      gsap.set(lgShort, { opacity: 0 });
      scroll.v = 0;
      flow.v = 0;
      gsap.set([dom.brand, gInfo, dom.close], { clearProps: 'color' });
      gsap.set(dom.close, { autoAlpha: 0 });
      gsap.set(layers(), { autoAlpha: 0 });
      gsap.set([dom.members, gTicket], { autoAlpha: 1, clearProps: 'pointerEvents' });
      document.documentElement.classList.remove('is-video');
      dom.top.innerHTML = '';
      items.forEach(drop);
      items.clear();
      hovered = null;
      hoverMain = false;
      lastMain = null;
      textFor = null;
      swaps.forEach((t) => t.kill());
      swaps.clear();
      gInfo.innerHTML = '';
    },
    render,
    hit(x, y) {
      const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.gd');
      return el ? +el.dataset.n! : null;
    },
    main: () => Math.round(S.pos),
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
      showTicket(false);
      const show = it.show;
      openShow = show;
      openN = it.n;
      photo(show, it.n);
      closeIcon(true);
      // tıklamanın içinde, eşzamanlı: hazır oynatıcı başlangıca sarılıp sesle oynar; hazır değilse şimdi kurulur
      // (dairenin büyümesiyle paralel), hazır olunca oynar
      clearAuto();
      o.video.start(show.fullVideo, () => {
        clearAuto();
        // mobil: oynatıcının gerçek "oynuyor" olayından sonra ikinci evre
        if (S.mobile) return playStarted();
        autoTimer = gsap.delayedCall(motion.dur('autoReturn'), () => {
          if (S.full && openShow === show) api.close();
        });
      });
      openTl?.kill();
      openTl = moves(true);
    },
    close() {
      if (!S.full || exiting) return;
      // tam tersi: ses kısılır, video görsele döner, daire yerine ve eğimine küçülür; geri kalanı onunla döner
      exiting = true;
      S.full = false;
      clearAuto();
      closeIcon(false);
      o.video.hide();
      openTl?.kill();
      openTl = moves(false);
      openTl.call(() => {
        o.video.remove();
        dom.top.innerHTML = '';
        const rest = gInfo.lastElementChild?.querySelector<HTMLElement>('.gi-rest');
        if (rest) gsap.set(rest, { clearProps: 'height' });
        openShow = null;
        openN = null;
        S.open = false;
        exiting = false;
        // açık hâl tamamen kapandı: Bilet Al geri gelir
        showTicket(true);
      });
    },
    videoActive: () => o.video.active(),
    suspend(on) {
      o.video.suspend(on);
    },
    preload(on) {
      preloadOn = on;
      restAt = null;
    },
    hold(on) {
      if (on) {
        autoTimer?.pause();
        o.video.suspend(true);
      } else {
        autoTimer?.resume();
        o.video.suspend(false, true);
      }
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
    scrollBy(dy) {
      gsap.killTweensOf(scroll);
      scroll.v = clamp(scroll.v + dy, 0, maxScroll());
    },
    flingScroll(v) {
      const to = clamp(scroll.v + v * G.mobile.throw, 0, maxScroll());
      gsap.to(scroll, { v: to, duration: G.mobile.settle, ease: 'power3.out', overwrite: true });
    },
  };
  return api;
}
