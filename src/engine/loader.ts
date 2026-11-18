/* İlk ekran (yükleme / ekran koruyucu). Katman (#ld) index.html'de satır içi, JS paketini beklemeden düz siyah
   görünür; motor onu yüzeyin içine, kâğıt dokusunun hemen üstüne taşır (galeri daireleri, gölgeleri ve yazıları
   ilk ekran sürerken gizli). Sitenin logosu ve Üye Ol / Giriş düğmeleri onun üstündedir. Bütün sayılar kimliğin
   `loader` token'ları.

   Yerleşim: logo ve düğmeler sitenin kendi öğeleri, transform ile başka yerde (logo beyaz):
   - logo (web uzun, mobil kısa) sol altta, sol kenarı x = 0, galerideki boyunda; alt boşluğu galerideki
     Üye Ol / Giriş'inki;
   - web: sağ altta logoyla tek blok: beyaz karede QR (kenarı logonun yüksekliği), sağında alt alta Üye Ol / Giriş
     (çap (logo yüksekliği − g) / 2; g düğmeler arası boşluk; kare ile düğmeler arası da g). Bloğun üstü logonun
     üstü, altı logonun altı; sağ kenarı sağ sütunun sağ boşluğunda;
   - mobil (QR yok): düğmeler yan yana sağ altta, üstleri kısa logonun üstüyle hizalı.

   Işık: siyah zeminde tek, yumuşak eliptik ışık havuzu (galerinin daire köşegeni açısında); merkezi galeri zemin
   grisi, kenara doğru uzun ve yumuşak bir düşüşle siyaha. Hafifçe nefes alır (opaklık). Önceden çizilmiş tek
   gradyan katmanı.

   Daireler: galeri daireleri gibi eğik (aynı perspektif, rotateX · rotateY · rotateZ), her biri farklı bir
   gösterinin görseli, tam renkli, aynı odak / kırpımla. Rastgele temel eğim; süzülürken açılar kendi sinüsleriyle
   yavaşça salınır. Çaplar rastgele (az büyük, çok küçük); küçükler uzakta: opaklık ve bulanıklık çapa göre,
   büyükler önde. Her biri kendi yönünde süzülür (büyükler biraz daha hızlı), dik yönde sinüs salınımıyla; ekrandan
   çıkan karşı kenardan girer. İlk görünüşte rastgele sırayla belirir.
   Işık katsayısı (0..1): dairenin merkezi elipsin içindeyse 1, dışında düşer; karanlıktaki daireler üstlerindeki
   siyah örtüyle (opaklık en fazla dim) kararır. Her dairenin zemine düşen bulanık eliptik gölgesi (galeri
   gölgeleri gibi) dairenin altında, eğimini izler; opaklığı galeri gölge opaklığı × gölgenin yerindeki ışık.

   Çıkış (düğmeler ve QR dışında tıklama / dokunma ya da tuş): ışık büyüyüp yataylaşarak ekranı kaplar ve her yer
   galeri grisine döner; daireler, gölgeleri ve QR hafifçe dışa kayarak kaybolur; logo ve düğmeler galerideki
   yerlerine gider (logo beyazdan siyaha); ardından galerinin daireleri, gölgeleri ve yazıları grinin üstünde
   yerlerinde belirir. Sonra katman kaldırılır.
   Her karede yalnızca transform ve opacity; requestAnimationFrame, sekme gizliyken durur. */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Media } from './media';
import type { Identity, Show } from './types';

export interface Loader {
  /** Galeri hazır: daireler başlar, çıkış açılır */
  start(o: { shows: Show[]; media: Media; mobile: () => boolean }): void;
  /** Katman tamamen kalktıktan sonra */
  onGone(f: () => void): void;
}

interface Circle {
  el: HTMLElement;
  dim: HTMLElement;
  sh: HTMLElement;
  /** Gölgenin temel ölçüsü (px) */
  sw: number;
  shH: number;
  /** Boyut sırası 0 (en küçük) … 1 (en büyük) */
  k: number;
  d: number;
  x: number;
  y: number;
  /** Hız (px/sn) ve yön */
  v: number;
  ux: number;
  uy: number;
  /** Konum salınımı: periyot (sn), faz */
  per: number;
  ph: number;
  /** Temel eğim (°), eğim salınımının periyodu ve fazı */
  rx: number;
  ry: number;
  rz: number;
  tper: number;
  tph: number;
  /** Derinlik opaklığı ve belirme (0..1) */
  op: number;
  vis: { v: number };
}

export function createLoader(o: {
  id: Identity;
  motion: Motion;
  surface: HTMLElement;
  brand: HTMLElement;
  members: HTMLElement;
  /** Galerinin katmanları: ilk ekran sürerken gizli, çıkışta belirir */
  gallery: HTMLElement[];
}): Loader {
  const root = document.getElementById('ld');
  if (!root) return { start() {}, onGone: (f) => f() };
  const { id, motion } = o;
  const LD = id.loader;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rnd = (r: [number, number]) => lerp(r[0], r[1], Math.random());
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  // kâğıt dokusunun üstüne; galeri katmanları DOM sırasıyla üstte kalır ama ilk ekran sürerken gizli
  const paper = o.surface.querySelector('.paper');
  o.surface.insertBefore(root, paper ? paper.nextSibling : o.surface.firstChild);
  root.style.zIndex = '0';
  root.style.background = LD.background;
  gsap.set(o.gallery, { autoAlpha: 0 });
  gsap.set(o.brand, { color: LD.logoColor });
  // logo ve düğmeler ilk ekrandaki yerlerine konana kadar gizli
  gsap.set([o.brand, o.members], { autoAlpha: 0 });
  const field = root.querySelector<HTMLElement>('#ld-c')!;
  const ui = root.querySelector<HTMLElement>('#ld-ui')!;
  // daireler galeriyle aynı perspektifte (ekranın ortası)
  field.style.perspective = `${id.gallery.perspective}px`;
  field.style.perspectiveOrigin = '50% 50%';
  // ışık havuzu (önceden çizilmiş gradyan), çıkışta her yeri kaplayan düz gri; gölgeler dairelerin arkasında
  const light = document.createElement('div');
  light.className = 'ld-light';
  const flat = document.createElement('div');
  flat.className = 'ld-flat';
  flat.style.background = id.colors.background;
  const shadows = document.createElement('div');
  shadows.className = 'ld-sh';
  root.insertBefore(light, field);
  root.insertBefore(flat, field);
  root.insertBefore(shadows, field);
  gsap.set(flat, { opacity: 0 });

  let W = innerWidth;
  let H = innerHeight;
  let isMobile = () => document.documentElement.classList.contains('is-mobile');

  /* ---------- ışık ---------- */
  const L = LD.light;
  const lt = { cx: 0, cy: 0, rx: 1, ry: 1, a: 0 };
  /** Çıkış: ışığın büyümesi (1 → exit.lightScale) ve yataylaşması (0..1) */
  const grow = { s: 1, level: 0 };
  function layoutLight() {
    const mob = isMobile();
    lt.cx = L.x * W;
    lt.cy = L.y * H;
    lt.rx = (mob ? L.rx.mobile : L.rx.web) * W;
    lt.ry = (mob ? L.ry.mobile : L.ry.web) * H;
    // galerinin daire köşegeni: sola bir adımda (slope[0]·W, slope[1]·H); büyük eksen bu doğrultuda
    const sl = id.gallery.layout.slope;
    lt.a = (Math.atan2(-sl[1] * H, -sl[0] * W) * 180) / Math.PI;
    // merkezde zemin grisi, kenara doğru uzun ve yumuşak düşüş (saydamlık; altta siyah zemin)
    const n = parseInt(id.colors.background.replace('#', ''), 16);
    const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    const stops: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      stops.push(`rgba(${rgb},${Math.pow(1 - t * t, L.curve).toFixed(4)}) ${i * 10}%`);
    }
    light.style.cssText =
      `width:${(2 * lt.rx).toFixed(1)}px;height:${(2 * lt.ry).toFixed(1)}px;` +
      `left:${(lt.cx - lt.rx).toFixed(1)}px;top:${(lt.cy - lt.ry).toFixed(1)}px;` +
      `background:radial-gradient(ellipse closest-side,${stops.join(',')})`;
    lightTransform();
  }
  function lightTransform() {
    gsap.set(light, { rotation: lt.a * (1 - grow.level), scale: grow.s, transformOrigin: '50% 50%' });
  }
  // nefes: yoğunluk breathe[0]..breathe[1], cycle sn'lik döngü
  layoutLight();
  const breathe = motion.reduced
    ? null
    : gsap.fromTo(light, { opacity: L.breathe[1] }, { opacity: L.breathe[0], duration: L.cycle / 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  /** Işık katsayısı: elipsin içinde 1, dışında falloff kat uzaklıkta 0'a (yumuşak) */
  function lightAt(x: number, y: number) {
    const r = ((lt.a * (1 - grow.level)) * Math.PI) / 180;
    const dx = x - lt.cx;
    const dy = y - lt.cy;
    const u = dx * Math.cos(r) + dy * Math.sin(r);
    const v = -dx * Math.sin(r) + dy * Math.cos(r);
    const q = Math.hypot(u / (lt.rx * grow.s), v / (lt.ry * grow.s));
    if (q <= 1) return 1;
    const f = clamp01(1 - (q - 1) / (L.falloff - 1));
    return f * f * (3 - 2 * f);
  }

  /* ---------- süzülen eğik daireler ---------- */
  let circles: Circle[] = [];
  let picked: Show[] = [];
  let media: Media | null = null;

  /** Galeri daireleriyle aynı kırpım: odak noktası merkezde, kaplamanın photoZoom katı */
  function frame(show: Show, d: number, ar: number) {
    const ih = Math.max(d, d / ar) * id.gallery.photoZoom;
    const iw = ih * ar;
    const c = (v: number, lo: number) => Math.min(0, Math.max(lo, v));
    return { x: c(d / 2 - (show.focus.x / 100) * iw, d - iw), y: c(d / 2 - (show.focus.y / 100) * ih, d - ih), w: iw, h: ih };
  }

  function build(fadeIn: boolean) {
    if (!media) return;
    W = innerWidth;
    H = innerHeight;
    layoutLight();
    const mob = isMobile();
    const n = Math.min(picked.length, mob ? LD.count.mobile : LD.count.web);
    const [dMin, dMax] = mob ? LD.size.mobile : LD.size.web;
    const Sh = id.gallery.shadow;
    const T = LD.tilt;
    // boyut sırası: çok sayıda küçük, az sayıda büyük (kuvvet dağılımı)
    const ks = Array.from({ length: n }, () => Math.pow(Math.random(), LD.sizeSkew)).sort((a, b) => a - b);
    const old = circles;
    circles = ks.map((k, i) => {
      const show = picked[i];
      const d = lerp(dMin, dMax, k) * W;
      const el = document.createElement('div');
      el.className = 'ldc';
      el.style.width = el.style.height = `${d.toFixed(1)}px`;
      const ar = show.photo ? show.photo.w / show.photo.h : 1;
      const fr = frame(show, d, ar);
      el.innerHTML = media!.img(show, { width: fr.w, height: fr.h, aspect: ar }) + '<i class="ldc-dim"></i>';
      const img = el.querySelector<HTMLImageElement>('img');
      if (img) img.style.transform = `translate(${fr.x.toFixed(1)}px,${fr.y.toFixed(1)}px)`;
      const dim = el.querySelector<HTMLElement>('.ldc-dim')!;
      dim.style.background = LD.background;
      // derinlik: küçükler soluk ve bulanık
      const blur = lerp(LD.blur, 0, k) * W;
      if (blur > 0.25) el.style.filter = `blur(${blur.toFixed(1)}px)`;
      // gölge: galeri gölgesi gibi düz, bulanık elips; küçüklerde daha küçük ve daha yumuşak
      const sh = document.createElement('div');
      sh.className = 'ldc-sh';
      const sw = d * Sh.width;
      const shH = sw * Sh.height;
      sh.style.cssText = `width:${sw.toFixed(1)}px;height:${shH.toFixed(1)}px;background:${Sh.color};filter:blur(${(Sh.blur * lerp(LD.shadow.softSmall, 1, k) * (d / (dMax * W))).toFixed(1)}px)`;
      const a = Math.random() * Math.PI * 2;
      const prev = old[i];
      const c: Circle = {
        el, dim, sh, sw, shH, k, d,
        // yeniden kurulumda yer korunur
        x: prev ? prev.x : Math.random() * W,
        y: prev ? prev.y : Math.random() * H,
        v: lerp(LD.speed[0], LD.speed[1], k) * W * (1 + (Math.random() * 2 - 1) * LD.speedJitter),
        ux: Math.cos(a),
        uy: Math.sin(a),
        per: rnd(LD.sway.period),
        ph: Math.random() * Math.PI * 2,
        rx: rnd(T.x),
        ry: rnd(T.y),
        rz: rnd(T.z),
        tper: rnd(T.period),
        tph: Math.random() * Math.PI * 2,
        op: lerp(LD.opacity[0], LD.opacity[1], k),
        vis: { v: prev ? prev.vis.v : 0 },
      };
      shadows.append(sh);
      field.append(el);
      if (!fadeIn || motion.reduced) {
        c.vis.v = 1;
      } else {
        // rastgele sırayla belirir: görsel hazır olunca ve kendi gecikmesi dolunca
        const delay = Math.random() * Math.max(0, LD.fadeIn.total - LD.fadeIn.each);
        const t0 = performance.now();
        const appear = () => {
          const wait = Math.max(0, delay - (performance.now() - t0) / 1000);
          gsap.to(c.vis, { v: 1, duration: LD.fadeIn.each, delay: wait, ease: 'none' });
        };
        (img?.decode?.() ?? Promise.resolve()).then(appear, appear);
      }
      return c;
    });
    old.forEach((c) => {
      gsap.killTweensOf(c.vis);
      c.el.remove();
      c.sh.remove();
    });
    place(0);
  }

  /** Çıkış: dairelerin kayboluşu ve dışa kayması (0..1) */
  const out = { v: 0 };
  let t = 0;
  function place(dt: number) {
    t += dt;
    lightTransform();
    const A = LD.sway.amp * W;
    const T = LD.tilt;
    const Sh = id.gallery.shadow;
    const drift = LD.exit.drift * W * out.v;
    for (const c of circles) {
      const r = c.d / 2;
      if (!motion.reduced) {
        c.x += c.ux * c.v * dt;
        c.y += c.uy * c.v * dt;
      }
      // ekrandan çıkan karşı kenardan girer
      const sw = W + c.d;
      const sh = H + c.d;
      if (c.x < -r) c.x += sw;
      else if (c.x > W + r) c.x -= sw;
      if (c.y < -r) c.y += sh;
      else if (c.y > H + r) c.y -= sh;
      // dik yönde sinüs salınımı; çıkışta ekranın ortasından dışa
      const s = motion.reduced ? 0 : A * Math.sin((2 * Math.PI * t) / c.per + c.ph);
      const ox = c.x - W / 2;
      const oy = c.y - H / 2;
      const ol = Math.hypot(ox, oy) || 1;
      const cx = c.x - c.uy * s + (ox / ol) * drift;
      const cy = c.y + c.ux * s + (oy / ol) * drift;
      // eğim: temel + her açıda kendi fazıyla ±sway° sinüs
      const w = motion.reduced ? 0 : (2 * Math.PI * t) / c.tper + c.tph;
      const rx = c.rx + T.sway * Math.sin(w);
      const ry = c.ry + T.sway * Math.sin(w + 2.1);
      const rz = c.rz + T.sway * Math.sin(w + 4.2);
      c.el.style.transform =
        `translate3d(${(cx - r).toFixed(2)}px,${(cy - r).toFixed(2)}px,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      const vis = c.vis.v * (1 - out.v);
      c.el.style.opacity = (c.op * vis).toFixed(3);
      // ışık: karanlıktaki daire siyah örtüyle kararır
      c.dim.style.opacity = ((1 - lightAt(cx, cy)) * LD.light.dim).toFixed(3);
      // gölge: dairenin altında (çapın below katı), eğimini izler; opaklık ışığa göre
      const gy = cy + LD.shadow.below * c.d;
      const qx = 0.6 + 0.4 * Math.abs(Math.cos((ry * Math.PI) / 180));
      c.sh.style.transform =
        `translate3d(${(cx - c.sw / 2).toFixed(2)}px,${(gy - c.shH / 2).toFixed(2)}px,0) rotate(${rz.toFixed(2)}deg) scale(${qx.toFixed(3)},1)`;
      c.sh.style.opacity = (Sh.opacity * lightAt(cx, gy) * vis).toFixed(3);
    }
  }

  let raf = 0;
  let last = 0;
  const loop = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    place(dt);
    raf = requestAnimationFrame(loop);
  };
  let gone = false;
  const run = (on: boolean) => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (on && !gone) raf = requestAnimationFrame(loop);
  };
  const onVis = () => {
    run(!document.hidden);
    if (document.hidden) breathe?.pause();
    else breathe?.resume();
  };
  document.addEventListener('visibilitychange', onVis);
  let rt = 0;
  const onResize = () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      if (exited) return;
      build(false);
      arrange();
    }, 200);
  };
  addEventListener('resize', onResize);

  /* ---------- QR (yalnızca web): sağ altta beyaz kare ---------- */
  const isLocal = (h: string) =>
    h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local') ||
    /^(10|127)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  let qrBox: HTMLElement | null = null;
  let qrSide = 0;
  function syncQr(q: { left: number; top: number; side: number } | null) {
    const url = id.site.publicUrl || (isLocal(location.hostname) ? '' : location.origin);
    if (!q || !url) {
      qrBox?.remove();
      qrBox = null;
      return;
    }
    const side = q.side;
    if (qrBox && Math.abs(side - qrSide) > 0.5) {
      // ölçü değişti: QR yeni kareye göre yeniden üretilir
      qrBox.remove();
      qrBox = null;
    }
    qrSide = side;
    if (!qrBox) {
      const box = document.createElement('div');
      box.className = 'ld-qr';
      ui.append(box);
      qrBox = box;
      import('qrcode')
        .then(async (QR) => {
          if (qrBox !== box) return;
          // sessiz alan (modül) token'dan; QR beyaz karenin kalan alanını doldurur, modüller tam piksele yuvarlanır
          const margin = LD.qr.margin;
          const n = QR.create(url, { errorCorrectionLevel: 'M' }).modules.size + 2 * margin;
          const dpr = devicePixelRatio || 1;
          const mod = Math.max(1, Math.floor((side * dpr) / n)) / dpr;
          const svg = await QR.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin, color: { dark: '#000000', light: '#ffffff' } });
          const px = (mod * n).toFixed(3);
          box.innerHTML = svg.replace('<svg ', `<svg shape-rendering="crispEdges" width="${px}" height="${px}" `);
        })
        .catch(() => {
          box.remove();
          if (qrBox === box) qrBox = null;
        });
    }
    qrBox.style.cssText = `left:${q.left.toFixed(2)}px;top:${q.top.toFixed(2)}px;width:${side.toFixed(2)}px;height:${side.toFixed(2)}px`;
  }

  /* ---------- ilk ekran yerleşimi: logo ve düğmeler galerideki yerlerinden transform ile ---------- */
  const buttons = () => [...o.members.querySelectorAll<HTMLElement>('.cb')];
  function arrange() {
    const mob = isMobile();
    const css = getComputedStyle(document.documentElement);
    const btns = buttons();
    // galerideki yerler: transform'lar kaldırılıp ölçülür
    gsap.set([o.brand, ...btns], { x: 0, y: 0, scale: 1 });
    const lg = o.brand.querySelector<HTMLElement>(mob ? '.lg-s' : '.lg-l')?.getBoundingClientRect();
    if (!lg) return;
    // logo: sol altta, alt boşluğu galerideki Üye Ol / Giriş'inki
    const bottom = H - (parseFloat(css.getPropertyValue('--gc-bottom')) || 0);
    const top = bottom - lg.height;
    gsap.set(o.brand, { y: top - lg.top });
    const g = parseFloat(css.getPropertyValue('--cb-gap')) || 0;
    const rects = btns.map((b) => b.getBoundingClientRect());
    if (!rects.length) return syncQr(null);
    if (mob) {
      // yan yana sağ altta (galerideki sağ boşluğuyla), üstleri kısa logonun üstüyle hizalı
      const m = o.members.getBoundingClientRect();
      btns.forEach((b) => gsap.set(b, { x: 0, y: top - m.top }));
      return syncQr(null);
    }
    // web: QR + alt alta düğmeler, logoyla aynı üst ve alt; sağ kenarı sağ sütunun sağ boşluğunda
    const right = W - id.screen.logo.letter * W;
    const h = lg.height;
    const dd = (h - g) / 2;
    const cx = right - dd / 2;
    btns.forEach((b, i) => {
      const r = rects[i];
      const cy = top + dd / 2 + i * (dd + g);
      gsap.set(b, { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2), scale: dd / Math.max(1, r.width) });
    });
    syncQr({ left: right - dd - g - h, top, side: h });
  }

  /* ---------- çıkış: ışıkla galeriye ---------- */
  let ready = false;
  let exited = false;
  let goneCb: () => void = () => {};
  // ilk ekran sürerken hiçbir giriş galeriye geçmez; düğmeler ve QR dışındaki ilk tıklama / dokunma / tuş çıkar
  const swallow = (e: Event) => {
    if (exited) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.type === 'keydown' || e.type === 'wheel') e.preventDefault();
    const onUi = !!(e.target as HTMLElement | null)?.closest?.('.ld-qr, .bnd');
    if (ready && !onUi && (e.type === 'pointerdown' || e.type === 'keydown' || e.type === 'touchstart')) exit();
  };
  const types = ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'keydown', 'wheel'];
  types.forEach((t) => addEventListener(t, swallow, { capture: true, passive: false }));
  const release = () => types.forEach((t) => removeEventListener(t, swallow, { capture: true }));

  function exit() {
    if (exited) return;
    exited = true;
    // tıklamanın bıraktığı olaylar (pointerup / click) da galeriye geçmesin
    window.setTimeout(release, 400);
    const X = LD.exit;
    const k = motion.reduced ? 0.25 : 1;
    const btns = buttons();
    breathe?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        gone = true;
        run(false);
        document.removeEventListener('visibilitychange', onVis);
        removeEventListener('resize', onResize);
        root!.remove();
        gsap.set(o.brand, { clearProps: 'color,transform' });
        gsap.set(btns, { clearProps: 'transform' });
        gsap.set(o.gallery, { clearProps: 'opacity,visibility' });
        goneCb();
      },
    });
    const main = { duration: X.dur * k, ease: X.ease };
    // ışık büyüyüp yataylaşarak ekranı kaplar; her yer galeri grisine döner
    tl.to(grow, { s: X.lightScale, level: 1, ...main }, 0);
    tl.to(light, { opacity: 1, ...main }, 0);
    tl.to(flat, { opacity: 1, ...main }, 0);
    // daireler, gölgeleri ve QR hafifçe dışa kayarak kaybolur
    tl.to(out, { v: 1, duration: X.fade * k, ease: 'power1.in' }, 0);
    if (qrBox) tl.to(qrBox, { opacity: 0, duration: X.fade * k, ease: 'none' }, 0);
    // logo galerideki yerine (sol üst), yolda beyazdan siyaha; düğmeler galerideki yerlerine ve boylarına
    tl.to(o.brand, { y: 0, color: id.screen.text, ...main }, 0);
    tl.to(btns, { x: 0, y: 0, scale: 1, ...main }, 0);
    // galerinin daireleri, gölgeleri ve yazıları grinin üstünde yerlerinde belirir
    tl.to(o.gallery, { autoAlpha: 1, duration: X.galleryDur * k, ease: 'none' }, X.galleryAt * k);
  }

  return {
    start(s) {
      media = s.media;
      isMobile = s.mobile;
      // her daire farklı bir gösteri (görseli olanlar), rastgele
      picked = s.shows.filter((x) => x.photo).sort(() => Math.random() - 0.5);
      build(true);
      arrange();
      gsap.set([o.brand, o.members], { autoAlpha: 1 });
      run(!document.hidden);
      ready = true;
    },
    onGone(f) {
      goneCb = f;
    },
  };
}
