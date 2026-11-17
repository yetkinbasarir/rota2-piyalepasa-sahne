/* Yükleme ekranı ve açılış ekran koruyucusu. Katmanın HTML / CSS'i index.html'de satır içi (#ld):
   JS paketini beklemeden görünür. İlerleme gerçek işlerden hesaplanır (fontlar, içerik, ilk ekran
   görselleri, web'de ekran koruyucunun ilk 2 oynatıcısı); gösterge hedefe yumuşakça yaklaşır, geri
   gitmez; en az `minTime` sn görünür. İki logo animasyonu (token, ?logo=1|2 ile geçersiz kılınır):
   1 — içi dolan logo (koyu logo üstünde beyaz kopya soldan sağa), 2 — nokta matrisi: canvas'ta kare
   ızgara; merkezi logonun içine düşen noktalar bütün daire olarak, her biri kendi gecikmesi ve büyüme
   süresiyle (zamana bağlı) dağınık sırayla belirip büyür; hem noktalar tamamlanıp hem yükleme bitince
   net vektör logoya geçilir. Bitince logo düz beyaz kalır, arkasında ekran koruyucu belirir; sol üstte
   QR kodu, sağ üstte üye düğmeleri. İlk tıklama / dokunma / tuş: katmanın tamamı tek parça yukarı
   kayarak çıkar; altında ana sayfa hazırdır, kartlar mıknatısla gelir. Kayma bitince oynatıcılar ve
   katman kaldırılır. */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Identity } from './types';
import type { Screensaver } from './screensaver';
import { pickLogo, layoutLogo, logoWidth } from './logo';

export interface Loader {
  /** Ekran koruyucunun kökü (yoksa null: yükleme ekranı yok) */
  ssRoot: HTMLElement | null;
  /** İlerlemeye katılan işler; hepsi bitince yükleme biter */
  track(tasks: Promise<unknown>[]): void;
  /** Ekran koruyucuyu bağla (yükleme bitince başlar) */
  attach(ss: Screensaver | null): void;
  /** Çıkış başlarken (kartlar mıknatısla gelmeye başlar) */
  onExit(f: () => void): void;
  /** Katman tamamen kalktıktan sonra (kendi kendine sunum sayacı) */
  onGone(f: () => void): void;
}

/** #rrggbb → ton (0..360) */
function hueOf(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return null; // gri: tonu yok
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
/** HSL → [r, g, b] (0..255) */
function hslRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function createLoader(o: { id: Identity; motion: Motion; brand: () => HTMLElement | null; reveal: HTMLElement[]; colors: string[] }): Loader {
  const root = document.getElementById('ld');
  const noop: Loader = { ssRoot: null, track() {}, attach() {}, onExit: (f) => f(), onGone: (f) => f() };
  if (!root) return noop;
  const { id, motion } = o;
  const LD = id.loader;
  const ssRoot = root.querySelector<HTMLElement>('#ld-ss');
  const tex = root.querySelector<HTMLElement>('#ld-tex');
  const logo = root.querySelector<HTMLElement>('#ld-logo')!;
  const fill = logo.querySelector<HTMLElement>('.ld-fill');
  const dots = logo.querySelector<HTMLElement>('.ld-dots');
  const base = logo.querySelector<HTMLElement>('.ld-base');
  const ui = root.querySelector<HTMLElement>('#ld-ui');

  // logo animasyonu: token; adresteki ?logo=1|2 geçersiz kılar
  const q = /[?&]logo=([12])/.exec(location.search);
  const anim = q ? +q[1] : LD.logoAnim;
  root.dataset.anim = String(anim);
  /* büyük logo: iki parçalı logo (uzun / kısa seçimi), oran korunur; genişlik en fazla ekranın logoW'si,
     yükseklik en fazla logoH'si; sola yaslı, çizgi uzantıları ekranın sol kenarına kadar. Daire maskesi
     o an seçili logodan (uzantılar dahil) üretilir */
  let maskSvg = '';
  const layoutLd = () => {
    const W = innerWidth, H = innerHeight;
    const mobileLd = document.documentElement.classList.contains('is-mobile');
    const css = getComputedStyle(document.documentElement);
    const pad = parseFloat(css.getPropertyValue(mobileLd ? '--mpad' : '--logo-pad')) || 20;
    const part = pickLogo(id, H * LD.logoH, W, mobileLd);
    const wMax = W * (mobileLd ? LD.logoW.mobile : LD.logoW.web);
    const h = Math.min(H * LD.logoH, (wMax / logoWidth(part, H * LD.logoH)) * H * LD.logoH);
    const L = layoutLogo(part, h, pad);
    logo.style.left = '0px';
    logo.style.right = 'auto';
    logo.style.width = `${L.width}px`;
    logo.style.height = `${h}px`;
    if (base) base.innerHTML = L.html;
    if (fill) fill.innerHTML = L.html;
    maskSvg = L.maskSvg;
  };
  layoutLd();
  if (base) base.style.color = LD.base;
  if (tex) tex.className = 'holes';
  /* ---------- 2: opak daireler (canvas) ----------
     Daireler logonun sınır kutusunda (biraz taşarak) mavi gürültü benzeri dağılır; boyutları dramatik
     (çok sayıda küçük, az sayıda çok büyük). Her biri tam opak, düz, tek renk, keskin kenarlı; büyükler önce,
     küçükler üstte çizilir. Son karede logonun içi boşluksuz dolar (kalan boşluklara küçük daireler).
     Görünmez logo maskesi (destination-in) her karede en son uygulanır. */
  type Dot = { x: number; y: number; r: number; d: number; g: number; c: number; dx: number; dy: number; ph: number };
  /* palet: bilet renklerinin tonları; doygunluk ve açıklık token'a çekilir (tam doygun saf renkler);
     birbirine çok yakın tonlar tek renge indirgenir */
  const hues: number[] = [];
  for (const c of o.colors) {
    const h = hueOf(c);
    if (h === null) continue;
    const near = hues.some((x) => Math.min(Math.abs(x - h), 360 - Math.abs(x - h)) < LD.dotHueMerge);
    if (!near) hues.push(h);
  }
  if (!hues.length) hues.push(0);
  const rgbOf = (hex: string): [number, number, number] => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  // kimlik paleti verdiyse doğrudan o renkler; yoksa bilet renklerinin tam doygun tonları
  const pal = LD.dotPalette?.length ? LD.dotPalette.map(rgbOf) : hues.map((h) => hslRgb(h, LD.dotSat, LD.dotLight));
  let dotsList: Dot[] = [];
  let canvas: HTMLCanvasElement | null = null;
  let ctx2: CanvasRenderingContext2D | null = null;
  let mask: HTMLImageElement | null = null;
  let maskW = 0;
  let maskH = 0;
  const palCss = pal.map(([r, g, b]) => `rgb(${r},${g},${b})`);
  const buildDots = () => {
    if (!dots || !mask || !mask.complete) return;
    const rect = logo.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W < 1 || H < 1) return;
    const dpr = devicePixelRatio || 1;
    if (!canvas) {
      canvas = document.createElement('canvas');
      dots.append(canvas);
      ctx2 = canvas.getContext('2d');
    }
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    maskW = W;
    maskH = H;
    // logo alanı ve yakınlık testi için gizli örnekleme canvas'ı
    const sc = document.createElement('canvas');
    sc.width = Math.max(1, Math.round(W));
    sc.height = Math.max(1, Math.round(H));
    const sx = sc.getContext('2d', { willReadFrequently: true });
    if (!sx) return;
    sx.drawImage(mask, 0, 0, sc.width, sc.height);
    const data = sx.getImageData(0, 0, sc.width, sc.height).data;
    const inside = (x: number, y: number) => {
      const px = Math.round(x), py = Math.round(y);
      if (px < 0 || py < 0 || px >= sc.width || py >= sc.height) return false;
      return data[(py * sc.width + px) * 4 + 3] > 127;
    };
    let filled = 0;
    for (let n = 3; n < data.length; n += 4) if (data[n] > 127) filled++;
    // yarıçaplar: temel × [min, max], kuvvet dağılımı (çok sayıda küçük, az sayıda çok büyük)
    const base = H * LD.blobBase;
    const radius = () => base * (LD.blobMin + (LD.blobMax - LD.blobMin) * Math.pow(Math.random(), LD.blobSkew));
    let mean = 0;
    for (let k = 0; k < 400; k++) mean += Math.PI * radius() ** 2;
    mean /= 400;
    // daire sayısı: logo alanı sonunda boşluk kalmayacak kadar (alan / ortalama daire alanı × çarpan)
    const count = Math.min(2500, Math.ceil((filled / mean) * LD.blobFill));
    // mavi gürültü benzeri: en iyi aday (Mitchell); aday logoya yakın olmalı (merkez ya da kenarı logoda)
    const m = base * LD.blobMax * 0.5;
    const cell = Math.max(4, base);
    const grid = new Map<string, Dot[]>();
    const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const nearest = (x: number, y: number) => {
      let best = Infinity;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      for (let a = -3; a <= 3; a++)
        for (let b = -3; b <= 3; b++)
          for (const q of grid.get(`${cx + a},${cy + b}`) ?? []) best = Math.min(best, (q.x - x) ** 2 + (q.y - y) ** 2);
      return best;
    };
    const near = (x: number, y: number, r: number) =>
      inside(x, y) || inside(x + r * 0.6, y) || inside(x - r * 0.6, y) || inside(x, y + r * 0.6) || inside(x, y - r * 0.6);
    const list: Dot[] = [];
    // büyükler önce yerleşir (alanın çoğunu kaplar)
    const radii = Array.from({ length: count }, radius).sort((p, q) => q - p);
    const mk = (x: number, y: number, r: number): Dot => {
      const a = Math.random() * Math.PI * 2;
      return {
        x, y, r,
        // kendi rastgele başlama gecikmesi ve büyüme süresi (zamana bağlı)
        d: Math.random() * LD.dotDelay,
        g: LD.dotGrowMin + Math.random() * (LD.dotGrowMax - LD.dotGrowMin),
        c: Math.floor(Math.random() * pal.length),
        // süzülme yönü ve evresi
        dx: Math.cos(a), dy: Math.sin(a), ph: Math.random() * Math.PI * 2,
      };
    };
    // kapsama haritası (süzülme payı düşülmüş): sonraki daireler yalnızca henüz kaplanmamış boşluklara konur,
    // böylece büyükler alanın çoğunu kaplar, küçükler aradaki boşlukları doldurur
    const Wp = sc.width, Hp = sc.height;
    const cover = new Uint8Array(Wp * Hp);
    const covered = (x: number, y: number) => {
      const px = Math.round(x), py = Math.round(y);
      return px >= 0 && py >= 0 && px < Wp && py < Hp && cover[py * Wp + px] === 1;
    };
    const mark = (x: number, y: number, r: number) => {
      const rr = r * (1 - LD.blobDrift);
      const x0 = Math.max(0, Math.floor(x - rr)), x1 = Math.min(Wp - 1, Math.ceil(x + rr));
      const y0 = Math.max(0, Math.floor(y - rr)), y1 = Math.min(Hp - 1, Math.ceil(y + rr));
      for (let py = y0; py <= y1; py++)
        for (let px = x0; px <= x1; px++) if ((px - x) ** 2 + (py - y) ** 2 <= rr * rr) cover[py * Wp + px] = 1;
    };
    for (let n = 0; n < radii.length; n++) {
      const r = radii[n];
      let bx = 0, by = 0, bd = -1;
      for (let k = 0, tries = 0; k < 8 && tries < 80; tries++) {
        const x = -m + Math.random() * (W + 2 * m);
        const y = -m + Math.random() * (H + 2 * m);
        if (!near(x, y, r) || covered(x, y)) continue;
        k++;
        const d = nearest(x, y);
        if (d > bd) {
          bd = d;
          bx = x;
          by = y;
        }
      }
      if (bd < 0) continue;
      const dot = mk(bx, by, r);
      list.push(dot);
      mark(bx, by, r);
      const kk = key(bx, by);
      (grid.get(kk) ?? grid.set(kk, []).get(kk)!).push(dot);
    }
    // boşluksuz dolu: logo içinde hiçbir dairenin (süzülme payı düşülmüş) kapsamadığı pikseller küçük
    // dairelerle doldurulur
    let fillers = 0;
    for (let py = 0; py < Hp && fillers < 5000; py++)
      for (let px = 0; px < Wp && fillers < 5000; px++) {
        const n = py * Wp + px;
        if (cover[n] || data[n * 4 + 3] <= 127) continue;
        const r = base * (LD.blobMin + Math.random() * 0.45);
        // biraz sağa-aşağı kaydırılmış merkez: taranan pikselin çevresini kapsar
        const x = px + r * 0.5, y = py + r * 0.5;
        list.push(mk(x, y, r));
        mark(x, y, r);
        fillers++;
      }
    // büyükler önce, küçükler sonra çizilir (küçükler üstte görünür)
    list.sort((p, q) => q.r - p.r);
    // toplam süre en fazla dotTotal: gecikmeler ve büyüme süreleri birlikte ölçeklenir
    const raw = list.reduce((mx, d) => Math.max(mx, d.d + d.g), 0);
    if (raw > LD.dotTotal) {
      const f = LD.dotTotal / raw;
      for (const d of list) {
        d.d *= f;
        d.g *= f;
      }
    }
    dotsList = list;
    dotsEnd = list.reduce((mx, d) => Math.max(mx, d.d + d.g), 0);
  };
  /** Tek zaman çizelgesi: her karede baştan çizilir — hızlanan (power2.in) büyüme (opaklık geçişi yok),
      hafif süzülme, normal karışım; logo maskesi en son. Son daire tamamlandığı karede flaş */
  let dotsEnd = 0;
  let dotsT0 = 0;
  let dotsDone = anim !== 2 || motion.reduced;
  let raf = 0;
  const drawDots = () => {
    if (!ctx2 || !canvas || !mask) return;
    const t = (performance.now() - dotsT0) / 1000;
    const dpr = devicePixelRatio || 1;
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2.globalCompositeOperation = 'source-over';
    ctx2.globalAlpha = 1;
    ctx2.clearRect(0, 0, maskW, maskH);
    for (let n = 0; n < dotsList.length; n++) {
      const d = dotsList[n];
      const u = Math.min(1, Math.max(0, (t - d.d) / d.g));
      if (u <= 0) continue;
      const r = d.r * u * u;
      const s = Math.sin(t * 0.6 + d.ph) * d.r * LD.blobDrift;
      ctx2.fillStyle = palCss[d.c];
      ctx2.beginPath();
      ctx2.arc(d.x + d.dx * s, d.y + d.dy * s, r, 0, Math.PI * 2);
      ctx2.fill();
    }
    // görünmez logo maskesi: en son
    ctx2.globalCompositeOperation = 'destination-in';
    ctx2.drawImage(mask, 0, 0, maskW, maskH);
    ctx2.globalCompositeOperation = 'source-over';
    if (t >= dotsEnd) dotsDone = true;
  };
  let dotsDrive = false;
  const frame = () => {
    if ((performance.now() - dotsT0) / 1000 >= dotsEnd) {
      // son nokta en büyük boyutuna ulaştı: aynı karede flaş (temel yükleme beklenmez)
      dotsDone = true;
      if (!finished) finish();
      return;
    }
    drawDots();
    raf = requestAnimationFrame(frame);
  };
  if (anim === 2 && dots && base && !motion.reduced) {
    const svg = maskSvg;
    mask = new Image();
    mask.onload = () => {
      buildDots();
      dotsT0 = performance.now();
      dotsDrive = true;
      raf = requestAnimationFrame(frame);
    };
    mask.onerror = () => {
      dotsDone = true;
    };
    mask.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    let rt = 0;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        if (finished) return;
        // logo yeniden seçilir ve yerleşir; maske yeni logodan
        layoutLd();
        const m = new Image();
        m.onload = () => {
          mask = m;
          buildDots();
        };
        m.src = `data:image/svg+xml,${encodeURIComponent(maskSvg)}`;
      }, 120);
    });
  }
  // nokta matrisi kurulamadıysa beklemeye gerek yok
  if (anim === 2 && !mask) dotsDone = true;
  // site öğeleri çıkışa kadar gizli (bant, düğmeler, logo)
  gsap.set(o.reveal, { autoAlpha: 0 });

  /* ---------- ilerleme ---------- */
  let total = 0;
  let doneN = 0;
  let shown = 0;
  let finished = false;
  let ss: Screensaver | null = null;
  const t0 = performance.now();
  /** Net (vektör) beyaz logo */
  const solid = () => {
    if (fill) {
      fill.style.clipPath = 'none';
      fill.style.visibility = 'visible';
    }
  };
  const paint = (p: number) => {
    if (motion.reduced) return solid();
    if (anim === 1 && fill) fill.style.clipPath = p >= 1 ? 'none' : `inset(0 ${(100 - p * 100).toFixed(2)}% 0 0)`;
  };
  paint(0);
  const tick = () => {
    const target = total ? doneN / total : 0;
    // hedefe yumuşakça yaklaşır, geri gitmez
    shown = Math.max(shown, shown + (target - shown) * 0.12);
    if (target >= 1 && 1 - shown < 0.004) shown = 1;
    paint(shown);
    const minOk = (performance.now() - t0) / 1000 >= LD.minTime;
    // temel yükleme bitti: akış katmanın altında görünmeden başlar (beyaz çekildiğinde ilk kesme ekranda olsun)
    if (shown >= 1 && minOk && !ssStarted) {
      ssStarted = true;
      ss?.start();
    }
    // geçiş: hem yükleme bitmiş hem bütün noktalar en büyük boyutuna ulaşmış olunca
    // nokta matrisi kendi karesinde geçişi başlatır; diğer durumlarda (animasyon 1, azaltılmış hareket) yükleme sonu
    if (!dotsDrive && shown >= 1 && minOk && dotsDone && !finished) finish();
  };
  gsap.ticker.add(tick);

  /** Yükleme bitti: ekran koruyucuya geçiş */
  let ssStarted = false;
  function finish() {
    finished = true;
    gsap.ticker.remove(tick);
    paint(1);
    if (!ssStarted) {
      ssStarted = true;
      ss?.start();
    }
    buildUi();
    if (anim === 2 && !motion.reduced && dots) {
      // sert flaş: ekran bu karede düz beyaz olur; altında nokta canvas'ı kaldırılır, net logo, akış, doku,
      // QR ve üye düğmeleri hazır bekler. Beyaz ~3 kare kalıp geçişsiz kesilir; aynı karede akış ve logo
      // büyükten küçülerek oturur (yalnızca transform), QR ve düğmeler harekete katılmadan görünür
      cancelAnimationFrame(raf);
      const flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:#fff;z-index:10;pointer-events:none';
      root!.append(flash);
      dots.remove();
      canvas = null;
      solid();
      gsap.set([ssRoot, tex, ui].filter(Boolean), { opacity: 1 });
      gsap.set(ssRoot, { scale: LD.enterFlow, transformOrigin: '50% 50%' });
      gsap.set(logo, { scale: LD.enterLogo, transformOrigin: '50% 100%' });
      const f0 = performance.now();
      const hold = () => {
        if (performance.now() - f0 < LD.flashHold * 1000) {
          requestAnimationFrame(hold);
          return;
        }
        flash.remove();
        gsap.to(ssRoot, { scale: 1, duration: LD.enterDur, ease: 'expo.out' });
        gsap.to(logo, { scale: 1, duration: LD.enterDur, ease: 'expo.out' });
      };
      requestAnimationFrame(hold);
    } else {
      solid();
      gsap.to([ssRoot, tex, ui].filter(Boolean), { opacity: 1, duration: motion.dur('ssIn'), ease: motion.ease.fade });
    }
    armExit();
  }

  /* ---------- ekran koruyucu arayüzü: sol üstte QR, sağ üstte üye düğmeleri ---------- */
  const isLocal = (h: string) =>
    h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local') ||
    /^(10|127)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  /** QR kodu yalnızca web'de; ekran web ile mobil arasında değişirse gösterilir ya da kaldırılır */
  let qrBox: HTMLElement | null = null;
  let uiBuilt = false;
  function syncQr() {
    if (!ui) return;
    const mobile = document.documentElement.classList.contains('is-mobile');
    const url = id.site.publicUrl || (isLocal(location.hostname) ? '' : location.origin);
    if (mobile || !url) {
      qrBox?.remove();
      qrBox = null;
      return;
    }
    if (qrBox) return;
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--logo-pad')) || 12;
    const side = id.screensaver.qr.web;
    const box = document.createElement('div');
    box.className = 'ld-ui-item ld-qr';
    box.style.cssText = `position:absolute;left:${pad}px;top:${pad}px;width:${side}px;height:${side}px;background:#fff;pointer-events:auto;line-height:0;display:flex;align-items:center;justify-content:center`;
    ui.prepend(box);
    qrBox = box;
    import('qrcode')
      .then(async (QR) => {
        if (qrBox !== box) return;
        // sessiz alan (modül) token'dan; QR beyaz karenin kalan alanını doldurur, modüller tam piksele yuvarlanır
        const margin = id.screensaver.qr.margin;
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
  // ekran ölçüsü değişince (motorun yeniden ölçmesinden sonra) QR'ı web / mobil durumuna göre eşitle
  let qrTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(qrTimer);
    qrTimer = window.setTimeout(() => {
      if (uiBuilt && !exited) syncQr();
    }, 300);
  });
  function buildUi() {
    uiBuilt = true;
    if (!ui) return;
    const mobile = document.documentElement.classList.contains('is-mobile');
    const css = getComputedStyle(document.documentElement);
    const pad = parseFloat(css.getPropertyValue(mobile ? '--mpad' : '--logo-pad')) || 12;
    // QR kodu: yalnızca web'de (mobilde kare oluşturulmaz, kütüphane çağrılmaz)
    syncQr();
    // üye düğmeleri: sitedekiyle aynı görünüm ve boyut; mobilde üst banttaki düğmelerle birebir aynı yer
    const site = document.querySelector<HTMLElement>('.bnd');
    if (site) {
      const band = document.createElement('div');
      band.className = 'ld-ui-item ld-bnd';
      band.innerHTML = site.innerHTML;
      ui.append(band);
      const sr = site.getBoundingClientRect();
      band.style.cssText = mobile
        ? `position:absolute;left:${sr.left}px;top:${sr.top}px;height:${sr.height}px;display:flex;align-items:center;pointer-events:auto`
        : `position:absolute;right:${pad}px;top:${pad}px;display:flex;align-items:center;pointer-events:auto`;
    }
  }

  /* ---------- çıkış ---------- */
  let exitCb: () => void = () => {};
  let goneCb: () => void = () => {};
  let exited = false;
  // ekran koruyucu sürerken ilk tıklama / dokunma / tuş hiçbir yere geçmez
  const swallow = (e: Event) => {
    if (exited) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.type === 'keydown' || e.type === 'wheel') e.preventDefault();
    // QR ve üye düğmeleri: tıklama ekran koruyucuyu kapatmaz
    const onUi = !!(e.target as HTMLElement | null)?.closest?.('.ld-ui-item');
    if (finished && !onUi && (e.type === 'pointerdown' || e.type === 'keydown' || e.type === 'touchstart')) exit();
  };
  const types = ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'keydown', 'wheel'];
  types.forEach((t) => addEventListener(t, swallow, { capture: true, passive: false }));
  const release = () => types.forEach((t) => removeEventListener(t, swallow, { capture: true }));
  function armExit() {
    /* olay dinleyicileri en başta kuruldu; burada yalnızca finished bayrağı çıkışı açar */
  }

  function exit() {
    if (exited) return;
    exited = true;
    // tıklamanın bıraktığı olaylar (pointerup / click) da karta geçmesin
    window.setTimeout(release, 400);
    // altında ana sayfa hazır: bant, logo, üye düğmeleri ve grid yerinde; kartlar kayma başlarken mıknatısla gelir
    gsap.set(o.reveal, { autoAlpha: 1 });
    exitCb();
    const gone = () => {
      ss?.destroy();
      cancelAnimationFrame(raf);
      root!.remove();
      goneCb();
    };
    if (motion.reduced) {
      gsap.to(root, { autoAlpha: 0, duration: 0.25, ease: motion.ease.fade, onComplete: gone });
      return;
    }
    // katmanın tamamı (akış, doku, logo, QR, üye düğmeleri) tek parça yukarı kayarak çıkar
    gsap.to(root, { yPercent: -100, duration: motion.dur('ldExit'), ease: 'power3.inOut', onComplete: gone });
  }

  return {
    ssRoot,
    track(tasks) {
      total += tasks.length;
      tasks.forEach((p) =>
        p.catch(() => {}).then(() => {
          doneN++;
        }),
      );
    },
    attach(s) {
      ss = s;
    },
    onExit(f) {
      exitCb = f;
    },
    onGone(f) {
      goneCb = f;
    },
  };
}
