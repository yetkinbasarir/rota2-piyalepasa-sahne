/* Bilet kartı duvarı: bandın üstünde iki sıra kart, yatayda sonsuz. Yalnızca görünen kartlar
   DOM'da; bütün hareket transform, opacity ve (maske dışında) clip-path ile.

   Halka: gösteriler (2·kolon + satır) sırasıyla dizilir; ekranda en fazla 14 kart görünür, 31
   gösteri tekrarsız olduğundan aynı öğenin iki kopyası aynı anda görünmez. Açılan öğenin küçük
   hâli hiçbir yerde görünmez: yuvası boş kalır, kapanınca yuvasına döner.

   Kart iki kalıcı parçadan oluşur: fotoğraf kutusu (.pw) ve renk kutusu (.kc). Her parça en büyük
   hâlindeki boyutta kurulmuş bir kırpma penceresidir; translate + scale ile taşınır, içerik ters
   ölçekle düzeltilir. Görselin kutu içindeki yerleşimi crop.ts; yavaş zoom görselin kendisinde.

   Açılma (web): öğe ortadaki 4 kolonu iki satır yüksekliğinde kaplar — solda renk paneli, sağda
   fotoğraf. Duvar tıklanan kolondan ikiye ayrılır; soldakiler sola, sağdakiler sağa itilir ve
   kenarlarda kesik kartlar olarak devam eder. Yakındakiler önce, uzaktakiler gecikmeyle itilir.
   Önce fotoğraf büyür, kısa gecikmeyle renk kutusu panele dönüşür, metin ve butonlar en son
   sırayla belirir. Mobilde açılmış öğe ekran genişliğinde dikey bir bloktur.
   Tam ekran: açılmış öğenin fotoğrafı bütün ekrana büyür; video varsa (fullVideo.ts) oynar. */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Media } from './media';
import { clamp, mod, rowTop, snapPx, viewCols, type State } from './state';
import type { Identity, Show, TemplateContext } from './types';
import { placePhoto } from './crop';
import type { FullVideoPlayer } from './fullVideo';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Card {
  key: string;
  i: number;
  j: number;
  show: Show;
  color: string;
  el: HTMLElement;
  pw: HTMLElement;
  pwi: HTMLElement;
  pwm: HTMLElement;
  img: HTMLImageElement | null;
  /** Renkli kopya: tek renkli görselin üstünde, yalnızca açılırken yüklenir */
  phc: HTMLImageElement | null;
  ar: number;
  ih0: number;
  kc: HTMLElement;
  kci: HTMLElement;
  pbg: HTMLElement;
  ccard: HTMLElement;
  /** Web paneli ve belirme sırasıyla öğeleri (yalnızca açılırken / açıkken) */
  pnl: HTMLElement | null;
  pls: HTMLElement[];
  /** Mobil metin kutusu */
  tp: HTMLElement | null;
  tps: HTMLElement | null;
  /** Mobil: panel bloğunun yüksekliği (px) ve künye kutusu */
  tpH: number;
  /** Mobil: tam ekrana geçerken renk panelinin çıkış ilerlemesi (0..1) */
  pd: { v: number };
  mkn: HTMLElement | null;
  /** Açılmış öğenin fotoğraf dokusu (ortak delikli doku; yalnızca kutu dururken görünür) */
  pov: HTMLElement | null;
  /** Web künyesi: fotoğraf alanında kırpan sarmalayıcı ve içerik; kv: künyenin açılma ilerlemesi */
  knw: HTMLElement | null;
  kni: HTMLElement | null;
  kv: { v: number };
  /** Künye yüksekliği (px): üst boşluk + içerik + alt boşluk */
  knh: number;
  /** Uzun künyenin dikey kaydırması (px) */
  ks: { v: number };
  /** Uzun künyenin kaydırma çubuğu: kanal (öğenin sağındaki boşluk) ve çubuk */
  ksb: HTMLElement | null;
  ksbt: HTMLElement | null;
  /** Parlama şeridi: renk kutusundaki (perforajla kesilir) ve fotoğraftaki parça; aynı hareket */
  shn: HTMLElement[];
  /** Parçaların ilerlemesi: fotoğraf, renk kutusu, metin / butonlar, tam ekran */
  a: { v: number };
  b: { v: number };
  c: { v: number };
  fs: { v: number };
  /** Mobil açık bloğun dikey kayması */
  oy: { v: number };
  zoom: gsap.core.Tween | null;
  top: boolean;
  /** Son çizilen kart konumu (itme başlangıcı için) */
  x: number;
  cache: string[];
}

export interface Wall {
  rebuild(): void;
  render(): void;
  /** Ekran noktasındaki hedef */
  hit(x: number, y: number): { i: number; j: number; part: 'card' | 'photo' | 'act' | 'open'; act?: string; el?: HTMLElement } | null;
  /** (i, j) kartını aç; açık öğe aynı anda kartına dönüp yerine iner */
  open(i: number, j: number): gsap.core.Timeline;
  close(): gsap.core.Timeline | null;
  /** Açık öğenin fotoğrafını tam ekrana büyüt; false: tam ekrandan doğrudan grid'e dön */
  fullscreen(on: boolean): void;
  /** Tam ekranda yüklü bir video var mı (başlamazsa kaldırılır) */
  videoActive(): boolean;
  /** Halkanın kolon cinsinden periyodu: (i + periyot, j) aynı öğedir */
  ringPeriod(): number;
  /** Yatay telefon katmanı: videoyu duraklat (on) / sessiz sürdür (off) */
  suspend(on: boolean): void;
  /** Web: açık öğenin künyesini aç / kapat (on verilmezse değiştir) */
  credits(on?: boolean): void;
  /** Künye açık mı */
  creditsOpen(): boolean;
  /** Mıknatıs hareketi: kartlar açık boşlukla başlayıp merkezden dışa birbirine çekilir */
  magnet(): void;
  tapOpen(x: number, y: number): void;
  /** Web: fare uzun künyenin üzerindeyse tekerlekle künyeyi kaydırır (true: tüketildi) */
  creditsWheel(x: number, y: number, dy: number): boolean;
  scrollOpen(dy: number): void;
  flingOpen(v: number): void;
  stepOpen(dir: 1 | -1): void;
  stopOpen(): void;
  refresh(): void;
  visible(): Element[];
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
  /** Alt bant düğmeleri (tam ekranda kaybolur) */
  band: HTMLElement;
  /** Kapatma ikonu (açılmış öğede ve tam ekranda) */
  close: HTMLElement;
  onCreate(el: Element): void;
}): Wall {
  const { S, id, motion, media, shows } = o;
  const Wl = id.wall;
  const N = shows.length;
  const cards = new Map<string, Card>();
  let visibleEls: Element[] = [];
  let scrollTween: gsap.core.Tween | null = null;
  const openEase = gsap.parseEase(motion.ease.open);

  /** Halka: (2·kolon + satır) — tekrarsız, ekranda aynı öğe iki kez görünmez */
  const showAt = (i: number, j: number) => shows[mod(2 * i + j, N)];
  // kimlik kart rengi verdiyse hepsi o renk (fotoğraftan çıkarılan renk kullanılmaz)
  const colorOf = (s: Show) => id.colors.card ?? s.color ?? id.palette[mod(s.k, id.palette.length)];
  const key = (i: number, j: number) => `${i},${j}`;

  /* ---------- ölçüler ---------- */
  const dims = () => {
    const { cw, ch, gap: G } = S;
    const ph0 = ch * Wl.photo;
    const kh0 = ch - ph0;
    // web: ortadaki n kolon, iki satır yüksekliği; solda panel (1 kolon + boşluk), sağda fotoğraf (n − 1 kolon)
    const n = Math.max(2, S.cols);
    const ox = S.margin;
    // açılmış öğenin üst kenarı üst satırla hizalı (web'de ekranın en üstü)
    const oy = S.topGap;
    const H = 2 * ch + G;
    const panelW = cw + G;
    const open = {
      panel: { x: ox, y: oy, w: panelW, h: H },
      photo: { x: ox + panelW, y: oy, w: (n - 1) * cw + (n - 2) * G, h: H },
    };
    return {
      ph0,
      kh0,
      open,
      // pencerelerin taban boyutu: en büyük hâl (fotoğraf: tam ekran)
      pBaseW: S.vw,
      pBaseH: S.vh,
      kBaseW: Math.max(panelW, S.vw),
      // mobilde renk paneli uzun olabilir (künye dahil)
      kBaseH: S.mobile ? Math.max(H, ch, 8 * S.vh) : Math.max(H, ch),
      textW: S.vw,
    };
  };
  let D = dims();

  /* ---------- itme: duvar tıklanan kolondan ikiye ayrılır ---------- */
  /** Hedef düzen: açık öğe (null: kapalı ızgara) */
  let split: { i: number; j: number } | null = null;
  /** Geçişin ilerlemesi ve her kartın başlangıç konumu / gecikmesi */
  const push = { m: { v: 1 }, total: 0, from: new Map<string, number>(), delay: new Map<string, number>() };
  let pushTween: gsap.core.Tween | null = null;
  /** Tam ekrandan grid'e dönüş sürüyor (ses kısılıyor / video kayboluyor) */
  let exiting = false;
  /** Video görünür olduktan sonra kendiliğinden grid'e dönüş sayacı */
  let autoTimer: gsap.core.Tween | null = null;
  const clearAuto = () => {
    autoTimer?.kill();
    autoTimer = null;
  };
  const texture = (on: boolean, delay = 0, done?: () => void) =>
    gsap.to(o.texture, {
      autoAlpha: on ? 1 : 0, duration: motion.dur(on ? 'textureIn' : 'textureOut'), delay, ease: motion.ease.fade, overwrite: true,
      onComplete: done,
    });

  /** Tam ekranda kaybolan bant öğeleri: düğmeler; mobilde üst bant şeridi de */
  const strip = document.querySelector<HTMLElement>('.band');
  const topStrip = document.querySelector<HTMLElement>('.topstrip');
  const bandEls = (all = false) => [o.band, ...((all || S.mobile) ? [strip, topStrip].filter((e): e is HTMLElement => !!e) : [])];

  /** Kapatma ikonu: açılma başlarken belirir, grid'e dönüş başlarken kaybolur. Mobilde göründüğü
      sürece üst banttaki üye düğmeleri gizlenir (ikon onların yerinde durur). */
  let closeOn = false;
  function closeIcon(on: boolean, restoreBand = true) {
    if (closeOn === on) return;
    closeOn = on;
    gsap.to(o.close, { autoAlpha: on ? 1 : 0, duration: motion.dur('scrollbarIn'), ease: motion.ease.fade, overwrite: true });
    if (S.mobile && (on || restoreBand)) gsap.to(o.band, { autoAlpha: on ? 0 : 1, duration: motion.dur('scrollbarIn'), ease: motion.ease.fade, overwrite: true });
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
  function titleShow(c: Card) {
    titleClear();
    const T = id.fullTitle;
    o.title.innerHTML = id.templates.fullTitle(c.show, o.tctx());
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
      // mobil: sayaç ve saat başlık boyuna göre ölçeklenir ama ekran genişliğinin %90'ını geçmez
      const cw0 = (k.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 0;
      if (cw0 > max) {
        cs *= max / cw0;
        k.style.fontSize = `${cs}px`;
        hr.style.fontSize = `${cs}px`;
      }
    }
    // başlık, sayaç/tarih ve saat bir bütün olarak dikeyde tam ortada (gerçek görünen yüksekliklerle);
    // konum top ile verilir, giriş / çıkış hareketlerinin transform'u aynı kalır
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
    // sahne etiketi
    o.stage.innerHTML = id.templates.stageLabel(c.show, D.open.panel.w, o.tctx());
    const sl = o.stage.firstElementChild as HTMLElement | null;
    o.stage.style.visibility = sl ? 'visible' : 'hidden';
    if (motion.reduced) return; // azaltılmış hareket: doğrudan ortada
    const tw = t.getBoundingClientRect().width;
    gsap.set(t, { x: -(S.vw / 2 + tw / 2) });
    gsap.set([k, hr], { autoAlpha: 0, y: cs * 0.6 });
    titleTl = gsap
      .timeline()
      .to(t, { x: 0, duration: motion.dur('titleIn'), ease: 'expo.out' })
      .to(k, { y: 0, autoAlpha: 1, duration: motion.dur('counterIn'), ease: 'power3.out' }, `>${motion.dur('counterDelay')}`)
      // saat sayaçtan kısa bir gecikmeyle aynı hareketle
      .to(hr, { y: 0, autoAlpha: 1, duration: motion.dur('counterIn'), ease: 'power3.out' }, `<${motion.dur('hourDelay')}`);
    // sahne etiketi başlık girişiyle aynı anda yukarıdan kısa bir kaymayla
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
    // sahne etiketi grupla birlikte opaklıkla kaybolur
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

  /* ---------- parlama: kartın tamamından geçen eğik ışık şeridi, soldan sağa dalga ---------- */
  const SH = id.shine;
  const shineOn = !motion.reduced && SH.enabled !== false;
  let shineTweens: gsap.core.Tween[] = [];
  let nextWave = 0;
  /** Şerit ölçüleri: eleman genişliği (şerit + eğimin yatay payı) ve gradyan durakları */
  function shineVars() {
    const { cw, ch } = S;
    const a = (SH.angle * Math.PI) / 180;
    const band = cw * SH.width;
    const E = band + ch * Math.tan(a);
    const L = E * Math.cos(a) + ch * Math.sin(a); // gradyan çizgisinin boyu
    const h = ((band * Math.cos(a)) / 2 / L) * 100;
    const root = document.documentElement.style;
    root.setProperty('--shn-w', `${E}px`);
    root.setProperty('--shn-h', `${ch}px`);
    root.setProperty(
      '--shn-bg',
      `linear-gradient(${90 + SH.angle}deg, transparent ${50 - h}%, rgba(255,255,255,${SH.opacity}) 50%, transparent ${50 + h}%)`,
    );
    return E;
  }
  let shineE = shineVars();
  const shineBlocked = () => !!S.open || S.full || exiting || push.m.v < 1 || magOn;
  function stopShine() {
    shineTweens.forEach((t) => t.kill());
    shineTweens = [];
    for (const c of cards.values()) if (c.shn.length) gsap.set(c.shn, { x: 0 });
  }
  /** Dalga: gecikme kartın o anki ekran x konumuyla orantılı; alt satır biraz sonra. Yalnızca görünen kartlar */
  function wave() {
    shineTweens = shineTweens.filter((t) => t.isActive());
    for (const c of cards.values()) {
      if (c.top || !c.shn.length || c.x + S.cw <= 0 || c.x >= S.vw) continue;
      const delay = clamp(c.x / S.vw, 0, 1) * motion.dur('shineSweep') + c.j * motion.dur('shineRow');
      shineTweens.push(
        gsap.fromTo(c.shn, { x: 0 }, { x: S.cw + shineE, duration: motion.dur('shine'), delay, ease: 'power2.inOut', overwrite: true }),
      );
    }
  }
  function shineTick() {
    if (!shineOn || S.paused) return;
    const now = gsap.ticker.time;
    if (shineBlocked()) {
      // açık öğe, tam ekran ya da grid'e dönüş hareketi sürerken dalga durur; bitince hemen devam eder
      if (shineTweens.length) stopShine();
      nextWave = 0;
    } else if (now >= nextWave) {
      wave();
      nextWave = now + motion.dur('shineEvery');
    }
  }

  const gridX = (c: { i: number }) => (c.i - S.cx) * S.stepX;
  /** Açık öğe varken kartın kenardaki yeri: soldakiler sola, sağdakiler sağa */
  function pushedX(c: Card, sp: { i: number; j: number }) {
    const right = c.i > sp.i || (c.i === sp.i && c.j !== sp.j);
    if (right) {
      const rank = c.i - sp.i + (c.j === sp.j ? 0 : 1); // 1 = en yakın
      // ortadaki n tam kolonun hemen sağından başlar
      return S.margin + S.cols * S.stepX + (rank - 1) * S.stepX;
    }
    const rank = sp.i - c.i;
    return S.margin - S.stepX - (rank - 1) * S.stepX;
  }
  const targetX = (c: Card) => (!split || S.mobile || (c.i === split.i && c.j === split.j) ? gridX(c) : pushedX(c, split));

  /** Yeni düzene geçiş: her kart o anki yerinden, açılan noktaya uzaklığına göre gecikmeyle */
  function startPush(next: { i: number; j: number } | null, around: number) {
    for (const c of cards.values()) push.from.set(c.key, c.x);
    split = next;
    const st = motion.dur('pushStagger');
    let maxDelay = 0;
    push.delay.clear();
    for (const c of cards.values()) {
      const d = Math.min(6, Math.abs(c.i - around)) * st;
      push.delay.set(c.key, d);
      maxDelay = Math.max(maxDelay, d);
    }
    push.total = motion.dur('open') + maxDelay;
    push.m.v = 0;
    pushTween?.kill();
    pushTween = gsap.to(push.m, { v: 1, duration: push.total, ease: 'none' });
    return pushTween;
  }

  /* ---------- mıknatıs hareketi ----------
     Kartlar önce aralarındaki boşluk açık (magnetGap × g) durur; sonra merkeze en yakın kartlardan
     başlayarak dışa doğru kısa gecikmelerle çekilir ve hafif bir esnemeyle normal boşluğa oturur.
     Yalnızca transform; sürerken akış ve parlama bekler. */
  const mag = { t: { v: 0 }, total: 0, center: 0, tween: null as gsap.core.Tween | null };
  const magEase = gsap.parseEase(Wl.magnetEase);
  let magOn = false;
  function magnet() {
    if (motion.reduced) return;
    mag.center = S.cx + S.vw / S.stepX / 2 - 0.5 + S.gap / 2 / S.stepX;
    const maxDelay = 6 * motion.dur('magnetStagger');
    mag.total = motion.dur('magnet') + maxDelay;
    mag.t.v = 0;
    magOn = true;
    mag.tween?.kill();
    mag.tween = gsap.to(mag.t, { v: mag.total, duration: mag.total, ease: 'none', onComplete: () => void (magOn = false) });
  }
  /** Kartın mıknatıs kayması (px): boşluk fazlası × merkeze uzaklık, yavaşça sıfıra oturur */
  function magOff(c: { i: number; j: number }) {
    if (!magOn) return { dx: 0, dy: 0 };
    const extra = (Wl.magnetGap - 1) * S.gap;
    const d = c.i - mag.center;
    const delay = Math.min(6, Math.abs(d)) * motion.dur('magnetStagger');
    const k = 1 - magEase(clamp((mag.t.v - delay) / motion.dur('magnet'), 0, 1));
    return { dx: extra * d * k, dy: extra * (c.j - (S.rows - 1) / 2) * k };
  }

  function cardX(c: Card) {
    const to = targetX(c);
    if (push.m.v >= 1 || !push.from.has(c.key)) return to;
    const D0 = motion.dur('open');
    const local = clamp((push.m.v * push.total - (push.delay.get(c.key) ?? 0)) / D0, 0, 1);
    return push.from.get(c.key)! + (to - push.from.get(c.key)!) * openEase(local);
  }

  /* ---------- kart ---------- */
  function makeZoom(el: HTMLElement, i: number, j: number) {
    // yavaş zoom, tek renkli görsel ile renkli kopyanın ortak sarmalayıcısında (aynı ölçek, kayma yok)
    const ph = el.querySelector<HTMLElement>('.phz');
    if (!ph || !ph.querySelector('img') || motion.reduced) return null;
    const Z = Wl.zoom;
    const h = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
    const tw = gsap.fromTo(ph, { scale: Z.from }, { scale: Z.to, duration: Z.min + (Z.max - Z.min) * h, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
    tw.progress(h);
    return tw;
  }

  function make(i: number, j: number): Card {
    const show = showAt(i, j);
    const color = colorOf(show);
    const { cw } = S;
    const ar = show.photo ? show.photo.w / show.photo.h : 1;
    const ih0 = S.vh;
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.i = String(i);
    el.dataset.j = String(j);
    el.style.color = id.templates.inkOn(color);
    el.innerHTML =
      // renk kutusu: kartın kendi rengi, kenarlarında perforaj (.kbg); açılırken panel zemini (.pbg) gelir
      `<div class="kc" style="width:${D.kBaseW}px;height:${D.kBaseH}px"><div class="kci" style="width:${D.kBaseW}px;height:${D.kBaseH}px">` +
      `<div class="kbg" style="width:${cw}px;height:${D.kh0}px;background:${color}">${shineOn ? `<div class="shn" style="top:${-D.ph0}px"></div>` : ''}</div>` +
      `<div class="pbg" style="background:${color}"></div>` +
      `<div class="ccard" style="width:${cw}px;height:${D.kh0}px">${id.templates.card(show, cw, D.kh0, o.tctx())}</div>` +
      `</div></div>` +
      // fotoğraf: zemini öğenin rengi; renk alanına 1px taşar
      `<div class="pw" style="width:${D.pBaseW}px;height:${D.pBaseH}px;background:${color}"><div class="pwi"><div class="pwm"><div class="phz" style="width:${(ih0 * ar).toFixed(1)}px;height:${ih0.toFixed(1)}px;transform-origin:${show.focus.x}% ${show.focus.y}%;background:${color}">${media.img(show, { width: D.open.photo.w, height: ih0, aspect: ar }).replace('class="ph phn"', 'class="ph phn phm"')}</div></div>${shineOn ? '<div class="shn"></div>' : ''}</div></div>`;
    o.layer.append(el);
    o.onCreate(el);
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    const c: Card = {
      key: key(i, j), i, j, show, color, el,
      pw: q('.pw'), pwi: q('.pwi'), pwm: q('.pwm'), img: el.querySelector('img'), phc: null, ar, ih0,
      kc: q('.kc'), kci: q('.kci'), pbg: q('.pbg'), ccard: q('.ccard'),
      pnl: null, pls: [], tp: null, tps: null, tpH: 0, pd: { v: 0 }, mkn: null, pov: null, knw: null, kni: null, kv: { v: 0 }, knh: 0, ks: { v: 0 }, ksb: null, ksbt: null, shn: [...el.querySelectorAll<HTMLElement>('.shn')],
      a: { v: 0 }, b: { v: 0 }, c: { v: 0 }, fs: { v: 0 }, oy: { v: 0 },
      zoom: makeZoom(el, i, j), top: false, x: 0, cache: [],
    };
    c.x = targetX(c);
    return c;
  }

  function ensure(i: number, j: number) {
    let c = cards.get(key(i, j));
    if (!c) {
      c = make(i, j);
      cards.set(c.key, c);
    }
    return c;
  }

  /** Renkli kopya: aynı dosya (tarayıcı önbelleğinden), tek renkli görselin üstünde; grid'de yüklenmez */
  function ensureColor(c: Card) {
    if (c.phc || !c.img) return;
    const img = c.img.cloneNode() as HTMLImageElement;
    img.classList.remove('phm');
    img.classList.add('phc');
    img.style.opacity = '0';
    c.img.after(img);
    c.phc = img;
  }
  /** Fotoğrafın hedef gösterim genişliği (iki görselde aynı) */
  const setSizes = (c: Card, w: number) => {
    for (const im of [c.img, c.phc]) if (im) im.sizes = `${Math.round(w)}px`;
  };

  /** Açılmış hâlin içeriği: web'de panel, mobilde metin kutusu */
  function ensureOpenContent(c: Card) {
    ensureColor(c);
    if (S.mobile) return ensureText(c);
    if (c.pnl) return;
    const p = document.createElement('div');
    p.className = 'pnlw';
    p.innerHTML = id.templates.panel(c.show, D.open.panel.w, D.open.panel.h, o.tctx());
    c.kci.append(p);
    o.onCreate(p);
    c.pnl = p;
    c.pls = [...p.querySelectorAll<HTMLElement>('.pl')];
    c.pls.forEach((e) => (e.style.opacity = '0'));
  }

  /* ---------- web künyesi ----------
     Künye fotoğrafın hemen altında (1px altına taşar); ikisi tek dikey şerit gibi aynı kaymayla taşınır.
     Tek sütun, fotoğraf alanının tam genişliği; yükseklik içerik kadar: üst boşluk + içerik + alt boşluk
     (boşluklar panelinkiyle aynı). Detay'a basınca şerit künye yüksekliği kadar yukarı kayar: künyenin
     alt kenarı açılmış öğenin alt kenarına oturur, fotoğrafın kalanı künyenin üstünde görünür. Künye
     alandan uzunsa fotoğraf tamamen çıkar, künye alanı kaplar ve fare / parmakla dikeyde kaydırılır.
     Konum ve boyutlar piksel ızgarasına yuvarlanır; renk paneli yerinde kalır. */
  let credOn = false;
  function ensureCredits(c: Card) {
    if (c.knw || S.mobile) return;
    const R = D.open.photo;
    const wrap = document.createElement('div');
    wrap.className = 'knw';
    // kırpma alanı: açılmış öğenin fotoğraf alanı (piksel ızgarasına yuvarlanmış; fotoğrafla aynı)
    const Q = snapR(R);
    wrap.style.cssText = `position:absolute;left:0;top:0;width:${Q.w}px;height:${Q.h}px;overflow:hidden;visibility:hidden;transform:translate3d(${Q.x}px,${Q.y}px,0)`;
    wrap.innerHTML = `<div class="kni" style="position:absolute;left:0;top:0">${id.templates.credits(c.show, R.w, R.h, D.open.panel.w, o.tctx())}</div>`;
    c.el.append(wrap);
    c.knw = wrap;
    c.kni = wrap.firstElementChild as HTMLElement;
    // yükseklik içerik kadar; ekranın piksel ızgarasına yukarı yuvarlanır
    const box = c.kni.firstElementChild as HTMLElement | null;
    if (box) box.style.height = 'auto';
    const dpr = devicePixelRatio || 1;
    const h = Math.ceil((box?.getBoundingClientRect().height ?? 0) * dpr - 0.01) / dpr;
    c.knh = h;
    if (box) box.style.height = `${h}px`;
    c.cache.length = 0;
  }
  /** Uzun künyenin en fazla kaydırması */
  const ksMax = (c: Card) => Math.max(0, c.knh - snapR(D.open.photo).h);
  /** Son basma noktası (dokunmatik sürükleme künyenin üzerinde mi başladı) */
  const ptrDown = { x: -1, y: -1 };
  addEventListener('pointerdown', (e) => Object.assign(ptrDown, { x: e.clientX, y: e.clientY }), { capture: true, passive: true });
  let wheelTarget = 0;
  /** (x, y) künyenin üzerindeyse ve künye tam açık ve alandan uzunsa açık kart */
  function creditsScrollable(x: number, y: number) {
    const c = openCard();
    if (!c || !credOn || S.mobile || !c.knw || c.kv.v < 1 || ksMax(c) <= 0) return null;
    const r = c.knw.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom ? c : null;
  }
  function setCreditsButton(c: Card, on: boolean) {
    c.pnl?.querySelector('[data-act="detail"]')?.setAttribute('aria-pressed', String(on));
    c.tp?.querySelector('[data-act="detail"]')?.setAttribute('aria-pressed', String(on));
    if (!on && c.mkn && !c.mkn.hidden) {
      c.mkn.hidden = true;
      c.tpH = c.tp?.offsetHeight ?? c.tpH;
    }
    // künye kapanırken kaydırma çubuğu önce kaybolur
    if (!on) hideBar(c);
  }

  /* ---------- uzun künyenin kaydırma çubuğu ----------
     Açılmış öğenin sağ kenarıyla sağdaki komşu kart arasındaki boşlukta (genişlik g); kanal öğenin üst
     kenarından alt kenarına uzanır ve görünmez. Çubuk bilet renginde, düz köşeli; yüksekliği görünen /
     toplam künye oranında (en az 2g), künyenin (ataletli) kaydırmasıyla birebir hareket eder.
     Sürüklenebilir; kanalın boş yerine tıklanınca künye oraya yumuşakça kayar. */
  const barGeom = (c: Card) => {
    const R = snapR(D.open.photo);
    const th = Math.max(2 * S.gap, (R.h * R.h) / Math.max(c.knh, 1));
    return { R, th: snapPx(Math.min(th, R.h)), track: R.h - snapPx(Math.min(th, R.h)) };
  };
  function ensureBar(c: Card) {
    if (c.ksb || S.mobile || ksMax(c) <= 0) return;
    const { R, th } = barGeom(c);
    const ch = document.createElement('div');
    ch.className = 'ksb';
    ch.style.cssText = `position:absolute;left:0;top:0;width:${S.gap}px;height:${R.h}px;transform:translate3d(${snapPx(R.x + R.w)}px,${R.y}px,0);opacity:0;visibility:hidden`;
    ch.innerHTML = `<div class="ksbt" style="position:absolute;left:0;top:0;width:100%;height:${th}px;background:${c.color}"></div>`;
    c.el.append(ch);
    c.ksb = ch;
    c.ksbt = ch.firstElementChild as HTMLElement;
    const toKs = (thumbTop: number) => {
      const { track } = barGeom(c);
      return clamp(track > 0 ? (thumbTop / track) * ksMax(c) : 0, 0, ksMax(c));
    };
    // duvarın kendi işaretçi / tıklama davranışına gitmesin
    ch.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      scrollTween?.kill();
      const { R: R0, th: th0, track } = barGeom(c);
      const top0 = track > 0 ? (c.ks.v / ksMax(c)) * track : 0;
      const local = e.clientY - R0.y;
      if (e.target === c.ksbt) {
        // çubuğu sürükle: künye orantılı kayar
        const y0 = e.clientY;
        ch.setPointerCapture(e.pointerId);
        ch.classList.add('drag');
        const move = (ev: PointerEvent) => {
          c.ks.v = toKs(top0 + ev.clientY - y0);
        };
        const up = () => {
          ch.classList.remove('drag');
          ch.removeEventListener('pointermove', move);
          ch.removeEventListener('pointerup', up);
          ch.removeEventListener('pointercancel', up);
        };
        ch.addEventListener('pointermove', move);
        ch.addEventListener('pointerup', up);
        ch.addEventListener('pointercancel', up);
      } else {
        // kanalın boş yerine tıklama: künye o noktaya yumuşakça kayar (çubuğun ortası tıklanan yere)
        scrollTween = gsap.to(c.ks, { v: toKs(local - th0 / 2), duration: 0.45, ease: 'power3.out' });
      }
    });
    c.cache.length = 0;
  }
  function showBar(c: Card) {
    ensureBar(c);
    if (!c.ksb) return;
    gsap.to(c.ksb, { autoAlpha: 1, duration: motion.dur('scrollbarIn'), ease: motion.ease.fade, overwrite: true });
  }
  function hideBar(c: Card) {
    if (!c.ksb) return;
    gsap.killTweensOf(c.ksb);
    gsap.set(c.ksb, { autoAlpha: 0 });
  }
  function creditsTo(c: Card, on: boolean) {
    if (S.mobile) return;
    ensureCredits(c);
    credOn = on;
    setCreditsButton(c, on);
    if (on) {
      // fotoğraf dokusu künye açıkken ve hareket sırasında görünmez
      if (c.pov) {
        gsap.killTweensOf(c.pov);
        gsap.set(c.pov, { autoAlpha: 0 });
      }
    }
    if (!on) gsap.to(c.ks, { v: 0, duration: motion.dur('credits'), ease: 'power3.inOut', overwrite: true });
    gsap.to(c.kv, {
      v: on ? 1 : 0, duration: motion.dur('credits'), ease: 'power3.inOut', overwrite: true,
      onComplete: () => {
        if (!on && openCard() === c && !S.full && !credOn) showPov(c);
        // künye açılma hareketi bittikten sonra kaydırma çubuğu belirir (yalnızca uzun künyede)
        if (on && openCard() === c && credOn) showBar(c);
      },
    });
  }
  /** Künye kapalı başlar: anında sıfırla */
  function creditsReset(c: Card | null) {
    if (!c) return;
    gsap.killTweensOf([c.kv, c.ks]);
    c.kv.v = 0;
    c.ks.v = 0;
    if (openCard() === c || !openCard()) credOn = false;
    setCreditsButton(c, false);
  }

  /* ---------- açılmış öğenin fotoğraf dokusu ---------- */
  /** Açılma hareketi tamamen bitince belirir */
  function showPov(c: Card) {
    // mobilde açılmış öğenin fotoğrafına doku konmaz
    if (credOn || c.kv.v > 0 || S.mobile) return;
    if (!c.pov) {
      const el = document.createElement('div');
      el.className = 'pov holes';
      c.pwi.append(el);
      c.pov = el;
      c.cache.length = 0;
      layout(c);
    }
    gsap.to(c.pov, { autoAlpha: 1, duration: motion.dur('photoTextureIn'), ease: motion.ease.fade, overwrite: true });
  }
  /** Kapanma, başka öğeye geçiş ya da tam ekrandan hemen önce kaybolur; hareketin bekleyeceği süreyi döndürür */
  function hidePov(c: Card | null) {
    const el = c?.pov;
    if (!el) return 0;
    gsap.killTweensOf(el);
    if (+gsap.getProperty(el, 'opacity') <= 0) {
      gsap.set(el, { autoAlpha: 0 });
      return 0;
    }
    const d = motion.dur('photoTextureOut');
    gsap.to(el, { autoAlpha: 0, duration: d, ease: motion.ease.fade });
    return d;
  }

  function dropOpenContent(c: Card) {
    c.phc?.remove();
    c.phc = null;
    c.knw?.remove();
    c.knw = c.kni = null;
    c.ksb?.remove();
    c.ksb = c.ksbt = null;
    c.kv.v = 0;
    c.ks.v = 0;
    c.pov?.remove();
    c.pov = null;
    c.pnl?.remove();
    c.pnl = null;
    c.pls = [];
    c.tp?.remove();
    c.tp = c.tps = c.mkn = null;
    c.tpH = 0;
    c.pd.v = 0;
    c.cache.length = 0;
  }

  /* ---------- mobil metin kutusu (açılır-kapanır satırlar) ---------- */
  /** Mobil açılmış öğe: fotoğrafın altına yapışık renk paneli (başlık, tanıtım, düğmeler, sayaç);
      Detay ile künye (beyaz, tek sütun) panelin altına eklenir. Blok dikeyde kaydırılır. */
  function ensureText(c: Card) {
    if (c.tp) return;
    const w = S.vw;
    const tp = document.createElement('div');
    tp.className = 'tpanel mpanel';
    tp.style.width = `${w}px`;
    tp.style.background = c.color;
    tp.innerHTML =
      `<div class="tps">${id.templates.panel(c.show, w, 0, o.tctx())}` +
      `<div class="mkn" hidden>${id.templates.credits(c.show, w, 0, w, o.tctx())}</div></div>`;
    c.el.append(tp);
    o.onCreate(tp);
    c.tp = tp;
    c.tps = tp.firstElementChild as HTMLElement;
    c.mkn = tp.querySelector<HTMLElement>('.mkn');
    c.pls = [...tp.querySelectorAll<HTMLElement>('.pl')];
    c.pls.forEach((e) => (e.style.opacity = '0'));
    // başlık ile tanıtım metni arasında boşluk yok: tanıtım başlığın hemen altındaki satırdan başlar
    const pt = tp.querySelector<HTMLElement>('.pt');
    const pin = tp.querySelector<HTMLElement>('.pin');
    if (pt && pin) {
      const now = pin.getBoundingClientRect().top - pt.getBoundingClientRect().bottom;
      pin.style.marginTop = `${-now}px`;
    }
    // tanıtım metni ile düğme sırası arası: panelin iç kenar boşluğu (× token); diğer aralar aynı
    const pnl = tp.querySelector<HTMLElement>('.pnl');
    const pbt = tp.querySelector<HTMLElement>('.pbt');
    if (pnl && pin && pbt) {
      const now = pbt.getBoundingClientRect().top - pin.getBoundingClientRect().bottom;
      const want = (parseFloat(getComputedStyle(pnl).paddingTop) || 0) * Wl.mobileIntroGap;
      pbt.style.marginTop = `${want - now}px`;
    }
    c.tpH = tp.offsetHeight;
  }
  /** Mobil künye: aç / kapat; açılınca blok künyenin başına yumuşakça kayar */
  function mobileCredits(c: Card, on: boolean) {
    if (!c.mkn || !c.tp) return;
    credOn = on;
    setCreditsButton(c, on);
    c.mkn.hidden = !on;
    c.tpH = c.tp.offsetHeight;
    c.cache.length = 0;
    stopOpen();
    const to = on ? Math.min(maxOy(c), mobilePhotoH() + c.mkn.offsetTop) : Math.min(c.oy.v, maxOy(c));
    scrollTween = gsap.to(c.oy, { v: to, duration: motion.dur('scroll') * 1.6, ease: motion.ease.page });
  }
  /** Mobil açılmış öğenin fotoğraf yüksekliği */
  const mobilePhotoH = () => snapPx(S.vh * Wl.mobilePhoto);

  function toggleAcc(btn: HTMLElement) {
    const body = btn.nextElementSibling as HTMLElement | null;
    const inner = body?.firstElementChild as HTMLElement | null;
    if (!body || !inner) return;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    const sign = btn.querySelector('.pm');
    if (sign) sign.textContent = open ? '−' : '+';
    gsap.killTweensOf([body, inner]);
    const d = motion.dur('scroll') * 1.4;
    if (open) {
      gsap.to(body, { height: inner.offsetHeight, duration: d, ease: motion.ease.page, onComplete: () => void (body.style.height = 'auto') });
      gsap.to(inner, { opacity: 1, duration: d * 0.8, delay: d * 0.3, ease: motion.ease.fade });
    } else {
      gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: d, ease: motion.ease.page });
      gsap.to(inner, { opacity: 0, duration: d * 0.5, ease: motion.ease.fade });
    }
  }

  // mobil blok: üst bandın altından ekranın altına (fotoğraf + panel); sığmazsa kaydırılır
  const openHeight = (c: Card) => mobilePhotoH() + c.tpH;
  const maxOy = (c: Card) => Math.max(0, openHeight(c) - (S.bottom - S.top));

  /* ---------- çizim ---------- */
  const set = (c: Card, n: number, el: HTMLElement, prop: 'transform' | 'opacity' | 'visibility', v: string) => {
    if (c.cache[n] !== v) {
      el.style[prop] = v;
      c.cache[n] = v;
    }
  };
  const f = (n: number, d = 2) => n.toFixed(d);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const lerpR = (p: Rect, q: Rect, t: number): Rect => ({ x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t), w: lerp(p.w, q.w, t), h: lerp(p.h, q.h, t) });
  const snapR = (r: Rect): Rect => ({ x: snapPx(r.x), y: snapPx(r.y), w: snapPx(r.w), h: snapPx(r.h) });

  function layout(c: Card) {
    const { cw } = S;
    const mo = magOff(c);
    const x = cardX(c) + mo.dx;
    c.x = x;
    const y = rowTop(S, c.j) + mo.dy;
    const { a, b } = { a: c.a.v, b: c.b.v };
    const t = Math.max(a, b, c.c.v, c.fs.v);
    // kart parçaları
    const pCard: Rect = { x, y, w: cw, h: D.ph0 + 1 };
    const kCard: Rect = { x, y: y + D.ph0, w: cw, h: D.kh0 };
    let P: Rect;
    let K: Rect;
    let T: Rect | null = null;
    if (S.mobile) {
      // ekran genişliğinde dikey blok: üstte fotoğraf, ona yapışık renk paneli (kaydırınca birlikte)
      const PH = mobilePhotoH();
      const top = S.top - c.oy.v;
      const TH = Math.min(c.tpH || D.kh0, D.kBaseH);
      P = lerpR(pCard, { x: 0, y: top, w: S.vw, h: PH + 1 }, a);
      K = lerpR(kCard, { x: 0, y: top + PH, w: S.vw, h: TH }, b);
      T = { x: 0, y: top + PH, w: S.vw, h: TH };
    } else {
      P = lerpR(pCard, D.open.photo, a);
      K = lerpR(kCard, D.open.panel, b);
    }
    // künye: fotoğraf ve künye tek dikey şerit gibi birlikte yukarı kayar (fotoğraf ekran dışına çıkar)
    const kv = c.kv.v;
    // şerit kayması: künye yüksekliği kadar (künyenin alt kenarı öğenin alt kenarına oturur);
    // künye öğeden yüksekse fotoğraf tamamen dışarı itilir. Fotoğraf ve künye aynı kaymayı alır.
    const R = D.open.photo;
    const RH = snapR(R).h;
    // künye alandan uzunsa fotoğraf tamamen çıkar (künye alanın üstüne oturur), ardından kaydırılır
    const shift = snapPx(kv * Math.max(0, Math.min(c.knh, RH) - 1));
    const ks = snapPx(c.ks.v);
    if (kv > 0 && !S.mobile) P = { ...P, y: P.y - shift };
    if (c.knw && c.kni) {
      set(c, 13, c.knw, 'visibility', kv > 0 ? 'visible' : 'hidden');
      // künye fotoğrafın alt kenarının 1px altına taşar (arada boşluk ya da çizgi kalmaz)
      if (kv > 0) set(c, 14, c.kni, 'transform', `translate3d(0,${f(snapPx(RH - 1) - shift - ks)}px,0)`);
      // kaydırma çubuğu künyeyle birebir
      if (c.ksbt) {
        const { track } = barGeom(c);
        const m = ksMax(c);
        set(c, 16, c.ksbt, 'transform', `translate3d(0,${f(snapPx(m > 0 ? (ks / m) * track : 0))}px,0)`);
      }
    }
    // tam ekran: fotoğraf bütün ekrana büyür
    if (c.fs.v > 0) P = lerpR(P, { x: 0, y: 0, w: S.vw, h: S.vh }, openEase(c.fs.v));
    P = snapR(P);
    // mobil tam ekran: renk paneli (zemini ve içeriğiyle) aşağı kayarak ekrandan çıkar
    const pd = S.mobile ? c.pd.v : 0;
    if (pd > 0) {
      K = { ...K, y: K.y + pd * S.vh };
      if (T) T = { ...T, y: T.y + pd * S.vh };
    }
    K = snapR(K);

    const sx = P.w / D.pBaseW;
    const sy = P.h / D.pBaseH;
    set(c, 0, c.pw, 'transform', `translate3d(${f(P.x)}px,${f(P.y)}px,0) scale(${f(sx, 5)},${f(sy, 5)})`);
    set(c, 1, c.pwi, 'transform', `scale(${f(1 / sx, 5)},${f(1 / sy, 5)})`);
    // künye açılırken yukarı itilen fotoğraf, açılmış öğenin üst kenarında (renk paneli hizası) kırpılır:
    // kırpma, fotoğrafın kendi kutusunda yukarı kayan kısım kadar (öğeyle birlikte hareket eder)
    const clip = kv > 0 && !S.mobile && shift > 0 ? `inset(${f(shift / sy, 3)}px 0px 0px 0px)` : 'none';
    if (c.cache[15] !== clip) {
      c.pw.style.clipPath = clip;
      c.cache[15] = clip;
    }
    const im = placePhoto(c.ar, P.w, P.h, c.show.focus);
    set(c, 2, c.pwm, 'transform', `translate3d(${f(im.x)}px,${f(im.y)}px,0) scale(${f(im.h / c.ih0, 5)})`);
    // renkli kopya fotoğrafın büyüme / küçülme hareketiyle birlikte belirir / kaybolur
    if (c.phc) set(c, 12, c.phc, 'opacity', f(clamp(Math.max(a, c.fs.v), 0, 1), 3));

    if (c.pov) {
      // kutunun karşı-ölçeklenmiş iç katmanında: gerçek piksel, ölçeklenmez
      const wh = `${f(P.w)}x${f(P.h)}`;
      if (c.cache[11] !== wh) {
        c.pov.style.width = `${f(P.w)}px`;
        c.pov.style.height = `${f(P.h)}px`;
        c.cache[11] = wh;
      }
    }

    const ksx = K.w / D.kBaseW;
    const ksy = K.h / D.kBaseH;
    set(c, 3, c.kc, 'transform', `translate3d(${f(K.x)}px,${f(K.y)}px,0) scale(${f(ksx, 5)},${f(ksy, 5)})`);
    set(c, 4, c.kci, 'transform', `scale(${f(1 / ksx, 5)},${f(1 / ksy, 5)})`);
    if (pd > 0) {
      set(c, 17, c.kc, 'opacity', f(1 - pd, 3));
      set(c, 18, c.kc, 'visibility', pd >= 1 ? 'hidden' : 'visible');
    } else if (c.cache[17] !== undefined) {
      // panel geri geldi: görünürlük kart renk kutusuna bırakılır (opaklığı dönüş hareketi yönetir)
      c.kc.style.visibility = '';
      c.cache[17] = c.cache[18] = undefined as unknown as string;
    }
    // panel zemini renk kutusu büyümeye başlayınca gelir (perforaj kapanır); kart içeriği gider
    set(c, 5, c.pbg, 'opacity', f(clamp(b * 4, 0, 1), 3));
    set(c, 6, c.ccard, 'opacity', f(1 - clamp(b * 3, 0, 1), 3));
    // metin ve butonlar en son, kısa aralıklarla
    if (c.pls.length) {
      const n = c.pls.length;
      c.pls.forEach((e, k) => set(c, 20 + k, e, 'opacity', f(clamp(c.c.v * (n + 2) - k - 1, 0, 1) * clamp(1 - c.fs.v * 4, 0, 1), 3)));
    }
    if (c.tp && c.tps && T) {
      const vis = c.c.v > 0.002 && pd < 1;
      set(c, 7, c.tp, 'visibility', vis ? 'visible' : 'hidden');
      set(c, 19, c.tp, 'opacity', f(1 - pd, 3));
      // panel içeriği renk kutusunun üstünde; öğeler (.pl) web'deki sırayla belirir
      if (vis) set(c, 8, c.tp, 'transform', `translate3d(${f(T.x)}px,${f(snapPx(T.y))}px,0)`);
    }
    // açılan / tam ekrandaki kart üst katmanda
    const wantTop = t > 0;
    if (wantTop !== c.top) {
      (wantTop ? o.top : o.layer).append(c.el);
      c.top = wantTop;
    }
    // açık öğenin içeriği hiçbir zaman silinmez (açılma, zamanlayıcı içinden başlatıldığında ilk karede t = 0 olabilir)
    const isOpen = !!S.open && S.open.i === c.i && S.open.j === c.j;
    if (!wantTop && !isOpen && (c.pnl || c.tp || c.pov || c.knw)) dropOpenContent(c);
    return x + cw > 0 && x < S.vw;
  }

  function render() {
    // grid'e dönüş / birleşme hareketi sürerken akış bekler
    S.merging = push.m.v < 1 || exiting || magOn;
    // güvence: tam ekran dokusu, başlık grubu ve sahne etiketi yalnızca gerçek tam ekranda görünür
    if (!S.full && !exiting) {
      if (o.texture.style.visibility !== 'hidden' && +gsap.getProperty(o.texture, 'opacity') > 0) {
        gsap.killTweensOf(o.texture);
        gsap.set(o.texture, { autoAlpha: 0 });
      }
      if (o.title.childElementCount || o.stage.childElementCount) titleClear();
    }
    const i0 = Math.floor(S.cx) - 2;
    const i1 = Math.floor(S.cx + viewCols(S)) + 2;
    const seen = new Set<string>();
    const vis: Element[] = [];
    for (let j = 0; j < S.rows; j++) {
      for (let i = i0; i <= i1; i++) {
        const c = ensure(i, j);
        seen.add(c.key);
        const onScreen = layout(c) || c.top;
        if (c.zoom && c.zoom.paused() === onScreen) c.zoom.paused(!onScreen);
        if (onScreen) vis.push(c.el);
      }
    }
    for (const [k, c] of cards) {
      if (seen.has(k)) continue;
      if (c.top || (push.m.v < 1 && push.from.has(k))) {
        layout(c);
        vis.push(c.el);
      } else {
        c.zoom?.kill();
        c.el.remove();
        cards.delete(k);
      }
    }
    visibleEls = vis;
    shineTick();
  }

  const openCard = () => (S.open ? cards.get(key(S.open.i, S.open.j)) ?? null : null);

  function stopOpen() {
    scrollTween?.kill();
    scrollTween = null;
  }

  /** Açılma / kapanma parçaları: kapanış açılmanın tersi (önce metin, sonra renk, sonra fotoğraf) */
  function partsTo(c: Card, on: boolean, tl: gsap.core.Timeline) {
    const D0 = motion.dur('open');
    const E = motion.ease.open;
    if (on) {
      tl.to(c.a, { v: 1, duration: D0, ease: E }, 0);
      tl.to(c.b, { v: 1, duration: D0, ease: E }, motion.dur('colorDelay'));
      tl.to(c.c, { v: 1, duration: D0 * 0.8, ease: 'none' }, motion.dur('textDelay'));
    } else {
      tl.to(c.fs, { v: 0, duration: D0 * 0.5, ease: E }, 0);
      tl.to(c.c, { v: 0, duration: D0 * 0.3, ease: 'none' }, 0);
      tl.to(c.b, { v: 0, duration: D0, ease: E }, 0);
      tl.to(c.a, { v: 0, duration: D0, ease: E }, motion.dur('colorDelay'));
      tl.to(c.oy, { v: 0, duration: D0, ease: E }, 0);
    }
  }

  return {
    rebuild() {
      o.video.remove();
      clearAuto();
      shineTweens = [];
      nextWave = 0;
      shineE = shineVars();
      titleClear();
      gsap.killTweensOf(bandEls(true));
      gsap.set(bandEls(true), { autoAlpha: 1 });
      closeOn = false;
      gsap.killTweensOf(o.close);
      gsap.set(o.close, { autoAlpha: 0 });
      gsap.killTweensOf(o.texture);
      gsap.set(o.texture, { autoAlpha: 0 });
      D = dims();
      cards.forEach((c) => {
        c.zoom?.kill();
        c.el.remove();
      });
      cards.clear();
      S.open = null;
      S.full = false;
      exiting = false;
      split = null;
      push.m.v = 1;
    },
    render,
    hit(x, y) {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const card = el?.closest<HTMLElement>('.card');
      if (!card) return null;
      const i = +card.dataset.i!;
      const j = +card.dataset.j!;
      const isOpen = !!S.open && S.open.i === i && S.open.j === j;
      if (!isOpen) return { i, j, part: 'card' };
      const act = el?.closest<HTMLElement>('[data-act]');
      if (act) return { i, j, part: 'act', act: act.dataset.act, el: act };
      // künye açıkken fotoğrafa tıklayıp tam ekrana geçilmez
      if (el?.closest('.pw')) return { i, j, part: credOn ? 'open' : 'photo' };
      return { i, j, part: 'open' };
    },
    open(i, j) {
      const old = openCard();
      // fotoğraf dokusu hareketten hemen önce kaybolur; açılma tamamen bitince yeni öğede belirir
      const c = ensure(i, j);
      const tl = gsap.timeline({
        delay: hidePov(old),
        onComplete: () => {
          if (openCard() === c && !S.full) showPov(c);
        },
      });
      if (old && (old.i !== i || old.j !== j)) {
        partsTo(old, false, tl);
        credOn = false;
        setCreditsButton(old, false);
        tl.to(old.kv, { v: 0, duration: motion.dur('open'), ease: motion.ease.open, overwrite: true }, 0);
        o.video.remove();
      }
      creditsReset(c);
      S.full = false;
      stopOpen();
      ensureOpenContent(c);
      c.oy.v = 0;
      // duvar tıklanan kolondan ikiye ayrılır (itme ve açılma iç içe)
      tl.add(startPush({ i, j }, i), 0);
      partsTo(c, true, tl);
      S.open = { i, j };
      closeIcon(true);
      // videosu varsa oynatıcı arka planda hemen kurulur (görünmez; tam ekranı açan tıklamada oynar)
      o.video.prepare(c.show.fullVideo);
      return tl;
    },
    close() {
      const c = openCard();
      if (!c) return null;
      const around = c.i;
      S.open = null;
      S.full = false;
      closeIcon(false);
      stopOpen();
      o.video.remove();
      const tl = gsap.timeline({ delay: hidePov(c) });
      credOn = false;
      setCreditsButton(c, false);
      tl.to(c.kv, { v: 0, duration: motion.dur('open'), ease: motion.ease.open, overwrite: true }, 0);
      partsTo(c, false, tl);
      tl.add(startPush(null, around), 0);
      // grid kartları mıknatısla bir araya gelir
      tl.call(magnet, [], 0);
      return tl;
    },
    fullscreen(on) {
      const c = openCard();
      if (!c || exiting) return;
      if (on) {
        S.full = true;
        setSizes(c, S.vw);
        // alt bant düğmeleri (mobilde üst bant da) tam ekrana geçerken kaybolur
        gsap.to(bandEls(), { autoAlpha: 0, duration: motion.dur('fullscreen'), ease: motion.ease.fade, overwrite: true });
        // künye kapalı başlar (fotoğraf yerine anında döner)
        creditsReset(c);
        // fotoğraf dokusu tam ekran hareketinden hemen önce kaybolur; tam ekranın kendi dokusu gelir
        const wait = hidePov(c);
        gsap.to(c.fs, { v: 1, duration: motion.dur('fullscreen'), delay: wait, ease: 'none', overwrite: true });
        // tam ekran dokusu fotoğraf ekranı kapladıktan sonra belirir (panel ve yazıların üstüne gelmez)
        let settle = wait + motion.dur('fullscreen');
        if (S.mobile) {
          gsap.to(c.pd, { v: 1, duration: motion.dur('panelOut'), ease: 'power2.in', overwrite: true });
          settle = Math.max(settle, motion.dur('panelOut'));
        }
        texture(true, settle);
        // başlık ve sayaç: tam ekran fotoğrafı yerine oturduğunda
        titleWait?.kill();
        titleWait = gsap.delayedCall(settle, () => {
          if (S.full && openCard() === c && !exiting) titleShow(c);
        });
        // video fotoğrafın arkasında yüklenmeye başlar; oynayınca opaklıkla geçilir. Geçiş bitince
        // sayaç başlar: süre dolunca kendiliğinden grid'e dönülür (videosuz fotoğraf kapanmaz)
        clearAuto();
        o.video.start(c.show.fullVideo, () => {
          clearAuto();
          // mobilde kendiliğinden dönüş yok: kullanıcı dokunana kadar video oynar
          if (S.mobile) return;
          // GSAP zamanlayıcısı: yatay telefon katmanı açıkken (zaman çizelgesi duraklayınca) bekler
          autoTimer = gsap.delayedCall(motion.dur('autoReturn'), () => {
            if (S.full && openCard() === c) this.fullscreen(false);
          });
        });
        return;
      }
      if (!S.full) return;
      // çıkış doğrudan grid'e: önce ses kısılır ve videodan fotoğrafa geçilir; sonra tam ekran fotoğraf
      // öğenin grid'deki kart yerine küçülür, renk kutusu aynı anda altında belirir, duvar birleşir.
      // Açılmış öğe aşamasına uğranmaz; ardından video tamamen kaldırılır.
      exiting = true;
      clearAuto();
      // grid'e dönüş başlarken kapatma ikonu kaybolur (mobilde üst bant düğmeleri bant ile birlikte döner)
      closeIcon(false, false);
      // tam ekran dokusu önce tamamen kaybolur; panel ve yazılar ondan sonra görünür olur
      // önce başlık ve sayaç sağa kayarak çıkar, sonra mevcut çıkış sırası
      titleHide()
        .then(() => o.video.hide())
        .then(() => new Promise<void>((res) => void texture(false, 0, res)))
        .then(() => {
        exiting = false;
        if (!S.full || openCard() !== c) return;
        S.full = false;
        S.open = null;
        stopOpen();
        // açılmış hâl tam ekran fotoğrafın arkasında: kart hâline anında döner (görünmez)
        gsap.killTweensOf([c.a, c.b, c.c, c.oy]);
        c.a.v = c.b.v = c.c.v = c.oy.v = 0;
        gsap.killTweensOf(c.pd);
        c.pd.v = 0;
        setSizes(c, D.open.photo.w);
        // grid'e dönünce alt bant düğmeleri yeniden belirir
        gsap.to(bandEls(), { autoAlpha: 1, duration: motion.dur('open'), ease: motion.ease.fade, overwrite: true });
        const tl = gsap.timeline({ onComplete: () => o.video.remove() });
        tl.to(c.fs, { v: 0, duration: motion.dur('open'), ease: 'none', overwrite: true }, 0);
        tl.fromTo(c.kc, { opacity: 0 }, { opacity: 1, duration: motion.dur('open') * 0.6, ease: motion.ease.fade, clearProps: 'opacity' }, motion.dur('open') * 0.2);
        tl.add(startPush(null, c.i), 0);
        // grid kartları mıknatısla bir araya gelir
        magnet();
      });
    },
    videoActive: () => o.video.active(),
    // showAt = shows[(2i + j) mod N] → 2·periyot ≡ 0 (mod N)
    ringPeriod: () => (N % 2 === 0 ? N / 2 : N),
    suspend(on) {
      o.video.suspend(on);
    },
    credits(on) {
      const c = openCard();
      if (!c || S.full) return;
      if (S.mobile) return mobileCredits(c, on ?? !credOn);
      creditsTo(c, on ?? !credOn);
    },
    creditsOpen: () => credOn,
    magnet,
    tapOpen(x, y) {
      const b = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-acc]');
      if (b) toggleAcc(b);
    },
    refresh() {
      cards.forEach((c) => o.onCreate(c.el));
    },
    creditsWheel(x, y, dy) {
      const c = creditsScrollable(x, y);
      if (!c) return false;
      // yumuşak: hedefe kısa bir tween'le yaklaşır; sona gelince durur
      wheelTarget = clamp((scrollTween?.isActive() ? wheelTarget : c.ks.v) + dy, 0, ksMax(c));
      scrollTween?.kill();
      scrollTween = gsap.to(c.ks, { v: wheelTarget, duration: 0.35, ease: 'power3.out' });
      return true;
    },
    scrollOpen(dy) {
      const kc = creditsScrollable(ptrDown.x, ptrDown.y);
      if (kc) {
        scrollTween?.kill();
        kc.ks.v = clamp(kc.ks.v + dy, 0, ksMax(kc));
        return;
      }
      const c = openCard();
      if (!c || !S.mobile) return;
      stopOpen();
      c.oy.v = clamp(c.oy.v + dy, 0, maxOy(c));
    },
    flingOpen(vel) {
      const kc = creditsScrollable(ptrDown.x, ptrDown.y);
      if (kc) {
        if (Math.abs(vel) < 30) return;
        scrollTween?.kill();
        scrollTween = gsap.to(kc.ks, { inertia: { v: { velocity: vel, min: 0, max: ksMax(kc) }, resistance: 1400 } });
        return;
      }
      const c = openCard();
      if (!c || !S.mobile || Math.abs(vel) < 30) return;
      // bloğun en üstündeyken fotoğrafın dışında aşağı doğru güçlü kaydırma: öğe kapanır
      if (vel < -1400 && c.oy.v <= 1 && !S.full) {
        const r = c.pw.getBoundingClientRect();
        const onPhoto = ptrDown.x >= r.left && ptrDown.x <= r.right && ptrDown.y >= r.top && ptrDown.y <= r.bottom;
        if (!onPhoto) return void this.close();
      }
      stopOpen();
      scrollTween = gsap.to(c.oy, { inertia: { v: { velocity: vel, min: 0, max: maxOy(c) }, resistance: 1400 } });
    },
    stepOpen(dir) {
      const c = openCard();
      if (!c || !S.mobile) return;
      stopOpen();
      scrollTween = gsap.to(c.oy, { v: clamp(c.oy.v + dir * S.ch * 0.6, 0, maxOy(c)), duration: motion.dur('scroll'), ease: motion.ease.page });
    },
    stopOpen,
    visible: () => visibleEls,
  };
}
