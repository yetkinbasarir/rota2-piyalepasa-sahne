/* Kimlik slayt gösterisi: tam ekran, kendi başına bir modül. Bütün ölçüler kimliğin `slides` token'ları.

   Görseller: src/slides/web/*.png (16:9) ve src/slides/mobile/*.png (dikey); klasöre bırakılan her PNG dosya adı
   sırasıyla kendiliğinden eklenir. Ekran dikeyse ya da mobileMax px'ten darsa mobil set, değilse web seti.
   Her görsel ekranı kaplar (cover), siyah zemin; sonraki ve önceki görsel önceden yüklenir.

   Açma / kapama: sitenin logosuna tıklama (yükleme ekranı kalktıktan sonra) ilk görselden açar; logo yerinde,
   gösterinin üstünde kalır, tekrar tıklama kapatır (Esc de). fade sn'lik geçiş. Açıkken sitenin kendiliğinden
   ilerlemesi ve oynayan video bekler, kapanınca sürer.

   Oynatma: her interval sn'de bir sonraki, sonsuz döngü. Geçiş: yatay itme (yeni görsel eskisini iter),
   dur sn, ease; ileri sağdan sola, geri soldan sağa. Elle her adım zamanlayıcıyı baştan kurar.
   Denetimler: masaüstünde iki yanda dışa bakan ince üçgenler (ok tuşları da), sağ altta duraklat / oynat
   (boşluk tuşu da). Dokunmatikte yan üçgenler yok; yatay kaydırma parmağı izleyerek adım atar. */
import { gsap } from './motion';
import { mod } from './state';
import type { Identity } from './types';

const byName = (g: Record<string, string>) =>
  Object.keys(g)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((k) => g[k]);
const WEB = byName(import.meta.glob('/src/slides/web/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>);
const MOBILE = byName(import.meta.glob('/src/slides/mobile/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>);

export interface Slides {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
}

export function createSlides(o: {
  id: Identity;
  /** Gösterinin kökü bu öğeden önce eklenir (logo üstte kalsın) */
  before: HTMLElement;
  reduced: boolean;
  /** Açılınca true, kapanınca false: sitenin kendiliğinden ilerlemesi ve videosu bekler / sürer */
  hold(on: boolean): void;
}): Slides {
  const T = o.id.slides;
  const red = o.reduced ? 0.2 : 1;
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set('--sl-bg', T.background);
  set('--sl-c', T.color);
  set('--sl-o', String(T.opacity.idle));
  set('--sl-oh', String(T.opacity.hover));
  set('--sl-m', `${T.margin * 100}vw`);
  set('--sl-ah', `${T.arrow.h}px`);
  set('--sl-aw', `${T.arrow.h * T.arrow.ratio}px`);
  set('--sl-p', `${T.pause}px`);

  const sw = T.stroke;
  const svg = (w: number, h: number, body: string) =>
    `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="${sw}" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision">${body}</svg>`;
  const tri = (w: number, h: number, dir: 1 | -1) => {
    const e = sw / 2;
    const pts = dir > 0 ? `${e},${e} ${w - e},${h / 2} ${e},${h - e}` : `${w - e},${e} ${e},${h / 2} ${w - e},${h - e}`;
    return svg(w, h, `<polygon points="${pts}" stroke-linejoin="miter" vector-effect="non-scaling-stroke"/>`);
  };
  const aw = T.arrow.h * T.arrow.ratio;
  const P = T.pause;
  const ICON_PAUSE = svg(P, P, `<rect x="${sw / 2}" y="${sw / 2}" width="${P - sw}" height="${P - sw}" vector-effect="non-scaling-stroke"/>`);
  const ICON_PLAY = tri(P * T.arrow.ratio * 1.6, P, 1);

  const el = document.createElement('div');
  el.className = 'sl';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Slayt gösterisi');
  el.innerHTML =
    '<div class="sl-track"></div>' +
    `<button type="button" class="sl-b sl-prev" aria-label="Önceki">${tri(aw, T.arrow.h, -1)}</button>` +
    `<button type="button" class="sl-b sl-next" aria-label="Sonraki">${tri(aw, T.arrow.h, 1)}</button>` +
    `<button type="button" class="sl-b sl-pp" aria-label="Duraklat">${ICON_PAUSE}</button>`;
  o.before.before(el);
  const track = el.querySelector<HTMLElement>('.sl-track')!;
  const pp = el.querySelector<HTMLButtonElement>('.sl-pp')!;
  gsap.set(el, { autoAlpha: 0 });

  let isOpen = false;
  let playing = true;
  let list: string[] = [];
  let i = 0;
  let cur: HTMLImageElement | null = null;
  let anim: gsap.core.Timeline | null = null;
  let timer: gsap.core.Tween | null = null;
  let fade: gsap.core.Tween | null = null;

  const pick = () => {
    const mobile = innerHeight > innerWidth || innerWidth < T.mobileMax;
    const l = mobile && MOBILE.length ? MOBILE : WEB.length ? WEB : MOBILE;
    el.classList.toggle('sl--touch', mobile);
    return l;
  };
  const W = () => el.clientWidth || innerWidth;
  function img(k: number) {
    const e = document.createElement('img');
    e.className = 'sl-i';
    e.alt = '';
    e.draggable = false;
    e.decoding = 'async';
    e.src = list[mod(k, list.length)];
    track.append(e);
    return e;
  }
  function preload() {
    if (list.length < 2) return;
    for (const d of [-1, 1]) new Image().src = list[mod(i + d, list.length)];
  }
  function arm() {
    timer?.kill();
    timer = null;
    if (isOpen && playing && list.length > 1) timer = gsap.delayedCall(T.interval, () => step(1));
  }
  function show(k: number) {
    anim?.kill();
    anim = null;
    track.innerHTML = '';
    i = mod(k, Math.max(1, list.length));
    cur = list.length ? img(i) : null;
    preload();
  }
  /** Bir adım: yeni görsel d yönünden gelip eskisini iter. from: parmağın bıraktığı kayma (px), incoming: zaten
      görünen komşu */
  function step(d: 1 | -1, from = 0, incoming?: HTMLImageElement) {
    if (list.length < 2 || !cur) return;
    anim?.progress(1);
    const w = W();
    const old = cur;
    const nu = incoming ?? img(i + d);
    i = mod(i + d, list.length);
    cur = nu;
    gsap.set(old, { x: from });
    gsap.set(nu, { x: d * w + from });
    const dur = T.dur * red * Math.max(0.05, 1 - Math.abs(from) / w);
    anim = gsap
      .timeline({ onComplete: () => { if (old !== cur) old.remove(); anim = null; } })
      .to(old, { x: -d * w, duration: dur, ease: T.ease }, 0)
      .to(nu, { x: 0, duration: dur, ease: T.ease }, 0);
    preload();
    arm();
  }
  function setPlaying(on: boolean) {
    playing = on;
    pp.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    pp.setAttribute('aria-label', on ? 'Duraklat' : 'Oynat');
    arm();
  }

  const api: Slides = {
    get isOpen() {
      return isOpen;
    },
    open() {
      if (isOpen) return;
      list = pick();
      if (!list.length) return;
      isOpen = true;
      root.classList.add('sl-open');
      o.hold(true);
      show(0);
      setPlaying(true);
      fade?.kill();
      fade = gsap.to(el, { autoAlpha: 1, duration: T.fade * red, ease: 'none' });
    },
    close() {
      if (!isOpen) return;
      isOpen = false;
      timer?.kill();
      timer = null;
      drag = null;
      fade?.kill();
      fade = gsap.to(el, {
        autoAlpha: 0, duration: T.fade * red, ease: 'none',
        onComplete: () => {
          anim?.kill();
          anim = null;
          track.innerHTML = '';
          cur = null;
          root.classList.remove('sl-open');
        },
      });
      o.hold(false);
    },
    toggle: () => (isOpen ? api.close() : api.open()),
  };

  /* ---------- denetimler ---------- */
  // gösterinin içindeki hiçbir giriş alttaki galeriye geçmez
  for (const t of ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel', 'click']) el.addEventListener(t, (e) => e.stopPropagation());
  el.querySelector('.sl-prev')!.addEventListener('click', () => step(-1));
  el.querySelector('.sl-next')!.addEventListener('click', () => step(1));
  pp.addEventListener('click', () => setPlaying(!playing));

  addEventListener(
    'keydown',
    (e) => {
      if (!isOpen) return;
      const k = e.key;
      if (k === 'ArrowRight') step(1);
      else if (k === 'ArrowLeft') step(-1);
      else if (k === ' ' || k === 'Spacebar') setPlaying(!playing);
      else if (k === 'Escape') api.close();
      // açıkken tuşlar galeriye geçmez
      e.stopImmediatePropagation();
      if (k !== 'Tab' && k !== 'Enter') e.preventDefault();
    },
    true,
  );

  /* dokunmatik kaydırma: görsel ve komşusu parmağı izler; yeterince (swipe·W) ya da hızlı kaydırılırsa adım
     tamamlanır, değilse yerine döner */
  let drag: { x: number; t: number; dx: number; d: 0 | 1 | -1; peek: HTMLImageElement | null; id: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    if (!isOpen || e.pointerType === 'mouse' || (e.target as Element).closest('.sl-b') || list.length < 2) return;
    anim?.progress(1);
    drag = { x: e.clientX, t: performance.now(), dx: 0, d: 0, peek: null, id: e.pointerId };
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || !cur) return;
    const w = W();
    const dx = Math.max(-w, Math.min(w, e.clientX - drag.x));
    const d: 0 | 1 | -1 = dx < 0 ? 1 : dx > 0 ? -1 : 0;
    if (d && d !== drag.d) {
      drag.peek?.remove();
      drag.peek = img(i + d);
      drag.d = d;
    }
    drag.dx = dx;
    gsap.set(cur, { x: dx });
    if (drag.peek) gsap.set(drag.peek, { x: drag.d * w + dx });
  });
  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id || !cur) return;
    const g = drag;
    drag = null;
    const w = W();
    const v = Math.abs(g.dx) / Math.max(1, performance.now() - g.t);
    if (g.d && g.peek && (Math.abs(g.dx) > T.swipe * w || v > T.swipeSpeed)) return step(g.d as 1 | -1, g.dx, g.peek);
    // yerine dön
    const dur = T.dur * red * Math.max(0.05, Math.abs(g.dx) / w);
    const peek = g.peek;
    anim = gsap
      .timeline({ onComplete: () => { peek?.remove(); anim = null; } })
      .to(cur, { x: 0, duration: dur, ease: T.ease }, 0);
    if (peek) anim.to(peek, { x: g.d * w, duration: dur, ease: T.ease }, 0);
    arm();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  // ekran yönü / ölçü değişince set değişebilir: aynı sıradan sürer
  addEventListener('resize', () => {
    if (!isOpen) return;
    const l = pick();
    if (l === list) {
      if (cur) gsap.set(cur, { x: 0 });
      return;
    }
    list = l;
    show(i);
    arm();
  });

  return api;
}
