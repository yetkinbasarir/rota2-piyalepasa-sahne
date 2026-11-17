/* Kimlik token'larını sayfaya uygular: CSS değişkenleri, font kiti, kâğıt dokusu ve motorun DOM iskeleti. */
import type { Identity } from './types';

export interface Dom {
  surface: HTMLElement;
  shadows: HTMLElement;
  stage: HTMLElement;
  ui: HTMLElement;
  brand: HTMLElement;
  members: HTMLElement;
  top: HTMLElement;
  video: HTMLElement;
  texture: HTMLElement;
  close: HTMLElement;
  rotate: HTMLElement;
}

/** Kâğıt dokusu: gri tonlu feTurbulence (SVG data URI) */
function paper(id: Identity) {
  const P = id.paper;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${P.frequency}' numOctaves='${P.octaves}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function applyIdentity(id: Identity) {
  const root = document.documentElement;
  const set = (k: string, v: string | number) => root.style.setProperty(k, String(v));
  set('--c-bg', id.colors.background);
  set('--c-text', id.screen.text);
  set('--c-btn', id.screen.button.fill);
  set('--c-focus', id.colors.focus);
  set('--c-overlay', id.colors.overlay);
  set('--paper', paper(id));
  set('--paper-o', id.paper.opacity);
  set('--g-persp', `${id.gallery.perspective}px`);
  // yazı rolleri: başlık, değerler, etiketler / düğmeler, sayılar
  for (const [role, f] of Object.entries(id.screen.type)) {
    set(`--t-${role}-family`, f.family);
    set(`--t-${role}-weight`, f.weight);
    set(`--t-${role}-var`, f.variation ?? 'normal');
    set(`--t-${role}-style`, f.style ?? 'normal');
  }
  for (const href of id.fonts.stylesheets) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.append(l);
    }
  }
  // tarayıcı çubuğu zemin renginde
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) m.content = id.colors.background;
  document.title = id.name;
}

/** Yatay telefon koşulu: CSS media query ve JS matchMedia aynı ifadeyi kullanır */
export const landscapeQuery = (id: Identity) =>
  `(orientation: landscape) and (pointer: coarse) and (max-height: ${id.rotate.maxHeight - 0.02}px)`;

/** Yatay telefon katmanı: düz koyu, ortada dik telefon silueti (1px beyaz çizgi); simge −90°'den 0°'ye
    döner, bekler, başa döner (CSS animasyonu; azaltılmış harekette dik durur) */
function rotateLayer(id: Identity) {
  const R = id.rotate;
  const total = R.turn + R.hold;
  const at = ((R.turn / total) * 100).toFixed(2);
  const style = document.createElement('style');
  style.textContent =
    `@media ${landscapeQuery(id)} { .rot { display: flex; } }\n` +
    `.rot svg { height: ${R.icon * 100}vh; height: ${R.icon * 100}dvh; width: auto; animation: rot-turn ${total}s infinite; }\n` +
    `@keyframes rot-turn { 0% { transform: rotate(-90deg); animation-timing-function: cubic-bezier(.45,0,.55,1); } ${at}% { transform: rotate(0deg); } 100% { transform: rotate(0deg); } }\n` +
    `@media (prefers-reduced-motion: reduce) { .rot svg { animation: none; transform: none; } }`;
  document.head.append(style);
  return `<div class="rot" aria-hidden="true"><svg viewBox="0 0 60 100" fill="none" shape-rendering="geometricPrecision">` +
    `<rect x="1" y="1" width="58" height="98" rx="9" stroke="#fff" stroke-width="1" vector-effect="non-scaling-stroke"/></svg></div>`;
}

/** Duotone filtresi: gri tona çevir, sonra koyu ve açık ton arasına eşle */
function duotone(id: Identity) {
  const c = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => +(v / 255).toFixed(4));
  };
  const [d, l] = [c(id.duotone.dark), c(id.duotone.light)];
  const ch = (k: number, tag: string) => `<${tag} type="table" tableValues="${d[k]} ${l[k]}"/>`;
  return `<feColorMatrix type="saturate" values="0"/><feComponentTransfer>${ch(0, 'feFuncR')}${ch(1, 'feFuncG')}${ch(2, 'feFuncB')}</feComponentTransfer>`;
}

export function buildDom(id: Identity): Dom {
  const app = document.getElementById('app') ?? document.body;
  app.innerHTML = `
<div id="surface" role="application" aria-label="${id.strings.surfaceLabel}">
  <div class="paper" aria-hidden="true"></div>
  <div id="shadows" class="layer" aria-hidden="true"></div>
  <div id="stage" class="layer"></div>
  <div id="top" class="layer"></div>
  <div id="fv" class="layer"></div>
  <div class="tex holes" aria-hidden="true"></div>
  <div id="ui" class="layer"></div>
  <div class="brand" role="img" aria-label="${id.name}"><div class="lg-l"></div><div class="lg-s"></div></div>
  <div class="bnd"></div>
</div>
<svg class="duo" aria-hidden="true" width="0" height="0" style="position:absolute"><filter id="duotone" color-interpolation-filters="sRGB">${duotone(id)}</filter></svg>
<button type="button" class="xcl" aria-label="Kapat"></button>
${rotateLayer(id)}`;
  const $ = (s: string) => app.querySelector<HTMLElement>(s)!;
  return {
    surface: $('#surface'), shadows: $('#shadows'), stage: $('#stage'), ui: $('#ui'), brand: $('.brand'), members: $('.bnd'),
    top: $('#top'), video: $('#fv'), texture: $('.tex'), close: $('.xcl'), rotate: $('.rot'),
  };
}
