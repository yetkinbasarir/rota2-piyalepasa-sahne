/* İlk ekran (yükleme / ekran koruyucu). Katman (#ld) index.html'de satır içi, JS paketini beklemeden düz siyah
   görünür; motor onu yüzeyin içine, galerinin ve yazıların üstüne, sitenin logosu ve Üye Ol / Giriş düğmelerinin
   altına taşır. Bütün sayılar kimliğin `loader` token'ları.

   Logo ve Üye Ol / Giriş: sitenin kendi öğeleri, ilk ekranda transform ile başka yerde (logo beyaz):
   - logo (web uzun, mobil kısa) sol altta, sol kenarı x = 0, galerideki boyunda; alt boşluğu galerideki
     Üye Ol / Giriş'inki;
   - web: sağ altta logoyla tek blok: beyaz karede QR (kenarı logonun yüksekliği), sağında alt alta Üye Ol / Giriş
     (çap (logo yüksekliği − g) / 2; g düğmeler arası boşluk; kare ile düğmeler arası da g). Bloğun üstü logonun
     üstü, altı logonun altı; sağ kenarı sağ sütunun sağ boşluğunda;
   - mobil (QR yok): düğmeler yan yana sağ altta, üstleri kısa logonun üstüyle hizalı.
   Çıkışta logo ve düğmeler kayma ile aynı sürede galerideki yerlerine (ve düğmeler galerideki boylarına) gider.

   Süzülen daireler: düz (eğimsiz), her biri farklı bir gösterinin görseli, tam renkli, galeri daireleriyle aynı
   odak / kırpımla. Çaplar rastgele [min, max]·W (az büyük, çok küçük); küçükler uzakta: opaklık ve bulanıklık
   çapa göre, büyükler önde. Her biri kendi yönünde yavaşça süzülür (büyükler biraz daha hızlı), dik yönde sinüs
   salınımıyla; ekrandan çıkan karşı kenardan girer. İlk görünüşte rastgele sırayla belirir. Yalnızca transform
   ve opacity; requestAnimationFrame, sekme gizliyken durur.

   Çıkış (butonlar ve QR dışında herhangi bir yere tıklama / dokunma ya da tuş): siyah zemin, daireler ve QR
   birlikte yukarı kayarak galeriyi açar; logo ve düğmeler yerinde kalır, logo kayma boyunca beyazdan siyaha döner.
   Kayma bitince katman kaldırılır ve galeri normal davranışına başlar. */
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
  /** Boyut sırası 0 (en küçük) … 1 (en büyük) */
  k: number;
  d: number;
  x: number;
  y: number;
  /** Hız (px/sn) ve yön */
  v: number;
  ux: number;
  uy: number;
  /** Salınım: periyot (sn), faz */
  per: number;
  ph: number;
  op: number;
}

export function createLoader(o: { id: Identity; motion: Motion; surface: HTMLElement; brand: HTMLElement; members: HTMLElement }): Loader {
  const root = document.getElementById('ld');
  if (!root) return { start() {}, onGone: (f) => f() };
  const { id, motion } = o;
  const LD = id.loader;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  // galerinin üstüne, logo ve üye düğmelerinin altına
  o.surface.insertBefore(root, o.brand);
  root.style.zIndex = '1';
  root.style.background = LD.background;
  gsap.set(o.brand, { color: LD.logoColor });
  // logo ve düğmeler ilk ekrandaki yerlerine konana kadar gizli
  gsap.set([o.brand, o.members], { autoAlpha: 0 });
  const field = root.querySelector<HTMLElement>('#ld-c')!;
  const ui = root.querySelector<HTMLElement>('#ld-ui')!;

  /* ---------- süzülen daireler ---------- */
  let circles: Circle[] = [];
  let picked: Show[] = [];
  let media: Media | null = null;
  let isMobile = () => false;
  let W = innerWidth;
  let H = innerHeight;

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
    const mob = isMobile();
    const n = Math.min(picked.length, mob ? LD.count.mobile : LD.count.web);
    const [dMin, dMax] = mob ? LD.size.mobile : LD.size.web;
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
      el.innerHTML = media!.img(show, { width: fr.w, height: fr.h, aspect: ar });
      const img = el.querySelector<HTMLImageElement>('img');
      if (img) img.style.transform = `translate(${fr.x.toFixed(1)}px,${fr.y.toFixed(1)}px)`;
      // derinlik: küçükler soluk ve bulanık
      const blur = lerp(LD.blur, 0, k) * W;
      if (blur > 0.25) el.style.filter = `blur(${blur.toFixed(1)}px)`;
      const op = lerp(LD.opacity[0], LD.opacity[1], k);
      const a = Math.random() * Math.PI * 2;
      const prev = old[i];
      const c: Circle = {
        el, k, d,
        // yeniden kurulumda yer korunur
        x: prev ? prev.x : Math.random() * W,
        y: prev ? prev.y : Math.random() * H,
        v: lerp(LD.speed[0], LD.speed[1], k) * W * (1 + (Math.random() * 2 - 1) * LD.speedJitter),
        ux: Math.cos(a),
        uy: Math.sin(a),
        per: lerp(LD.sway.period[0], LD.sway.period[1], Math.random()),
        ph: Math.random() * Math.PI * 2,
        op,
      };
      el.style.opacity = '0';
      field.append(el);
      if (!fadeIn || motion.reduced) {
        el.style.opacity = String(op);
      } else {
        // rastgele sırayla belirir: görsel hazır olunca ve kendi gecikmesi dolunca
        const delay = Math.random() * Math.max(0, LD.fadeIn.total - LD.fadeIn.each);
        const t0 = performance.now();
        const appear = () => {
          const wait = Math.max(0, delay - (performance.now() - t0) / 1000);
          gsap.to(el, { opacity: op, duration: LD.fadeIn.each, delay: wait, ease: 'none' });
        };
        (img?.decode?.() ?? Promise.resolve()).then(appear, appear);
      }
      return c;
    });
    old.forEach((c) => c.el.remove());
    place(0);
  }

  let t = 0;
  function place(dt: number) {
    t += dt;
    const A = LD.sway.amp * W;
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
      // dik yönde sinüs salınımı
      const s = motion.reduced ? 0 : A * Math.sin((2 * Math.PI * t) / c.per + c.ph);
      const px = c.x - c.uy * s - r;
      const py = c.y + c.ux * s - r;
      c.el.style.transform = `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0)`;
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
  const run = (on: boolean) => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (on) raf = requestAnimationFrame(loop);
  };
  const onVis = () => run(!document.hidden && !exited);
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
    const W = innerWidth;
    const H = innerHeight;
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

  /* ---------- çıkış ---------- */
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
    const dur = motion.reduced ? 0.25 : X.dur;
    const btns = buttons();
    const gone = () => {
      run(false);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('resize', onResize);
      root!.remove();
      gsap.set(o.brand, { clearProps: 'color,transform' });
      gsap.set(btns, { clearProps: 'transform' });
      goneCb();
    };
    // logo galerideki yerine (sol üst) gider, yolda beyazdan siyaha döner; düğmeler galerideki yerlerine ve
    // boylarına; ikisi de kayma ile aynı sürede ve eğride
    gsap.to(o.brand, { y: 0, color: id.screen.text, duration: dur, ease: X.ease });
    gsap.to(btns, { x: 0, y: 0, scale: 1, duration: dur, ease: X.ease });
    if (motion.reduced) gsap.to(root, { autoAlpha: 0, duration: dur, ease: 'none', onComplete: gone });
    // siyah zemin, daireler ve QR birlikte yukarı kayar
    else gsap.to(root, { yPercent: -100, duration: dur, ease: X.ease, onComplete: gone });
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
