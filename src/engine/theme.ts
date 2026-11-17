/* Kimlik token'larını sayfaya uygular: CSS değişkenleri, font kiti, satır içi logo sembolü
   ve motorun DOM iskeleti. */
import type { Identity } from './types';

export interface Dom {
  surface: HTMLElement;
  wall: HTMLElement;
  top: HTMLElement;
  video: HTMLElement;
  texture: HTMLElement;
  title: HTMLElement;
  stage: HTMLElement;
  band: HTMLElement;
  close: HTMLElement;
  rotate: HTMLElement;
}

/** SVG kaynağından viewBox ve iç içeriği çıkarır; id'leri temizler, dolguları currentColor yapar. */
function parseLogo(svg: string) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 100 100';
  const inner = (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1] ?? '')
    .replace(/\s(id|data-name)="[^"]*"/g, '')
    .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"');
  const [, , w, h] = viewBox.split(/[\s,]+/).map(Number);
  return { viewBox, inner, ratio: w / h };
}

export function applyIdentity(id: Identity) {
  const root = document.documentElement;
  const set = (k: string, v: string | number) => root.style.setProperty(k, String(v));
  set('--c-bg', id.colors.background);
  set('--c-paper', id.colors.paper);
  set('--c-ink', id.colors.ink);
  set('--c-focus', id.colors.focus);
  for (const [role, f] of Object.entries(id.fonts.roles)) {
    set(`--role-${role}-family`, f.family);
    set(`--role-${role}-weight`, f.weight);
    set(`--role-${role}-style`, f.style ?? 'normal');
    set(`--role-${role}-ls`, f.letterSpacing ?? 'normal');
    set(`--role-${role}-var`, f.variation ?? 'normal');
  }
  // Tek punto + taban ızgarası; mobil/web ayrımı .is-mobile sınıfıyla (engine.css)
  set('--type-web-size', id.type.web.size);
  set('--type-web-lh', id.type.web.lineHeight);
  set('--type-mobile-size', id.type.mobile.size);
  set('--type-mobile-lh', id.type.mobile.lineHeight);
  for (const href of id.fonts.stylesheets) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.append(l);
    }
  }
  document.title = id.name;

  // Logo bir kez satır içi <symbol> olarak gömülür; her kullanım <use> ile buna bağlanır.
  const logo = parseLogo(id.logo.svg);
  const symId = `${id.id}-logo`;
  const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  sprite.innerHTML = `<symbol id="${symId}" viewBox="${logo.viewBox}">${logo.inner}</symbol>`;
  document.body.prepend(sprite);

  // Bandın logosu görünen sınır kutusuna göre ölçülür ("Piyalepaşa" dahil, SVG'nin boş kenar payları hariç)
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  probe.setAttribute('viewBox', logo.viewBox);
  probe.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:200px;height:200px;visibility:hidden');
  probe.innerHTML = `<g>${logo.inner}</g>`;
  document.body.append(probe);
  const bb = (probe.firstElementChild as SVGGraphicsElement).getBBox();
  probe.remove();
  const tight = bb.width > 0 && bb.height > 0 ? `${bb.x} ${bb.y} ${bb.width} ${bb.height}` : logo.viewBox;
  const brandHtml = () =>
    `<svg class="lg" viewBox="${tight}" role="img" aria-label="${id.name}">${logo.inner}</svg>`;

  const logoHtml = (width: number, className = '') =>
    `<svg class="lg ${className}" width="${width.toFixed(1)}" height="${(width / logo.ratio).toFixed(1)}" viewBox="${logo.viewBox}" role="img" aria-label="${id.name}"><use href="#${symId}"/></svg>`;

  return { logoHtml, brandHtml };
}

/** Yatay telefon koşulu: CSS media query ve JS matchMedia aynı ifadeyi kullanır */
export const landscapeQuery = (id: Identity) =>
  `(orientation: landscape) and (pointer: coarse) and (max-height: ${id.rotate.maxHeight - 0.02}px)`;

/** Yatay telefon katmanı: düz siyah, ortada dik telefon silueti (1px beyaz çizgi); simge −90°'den 0°'ye
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

export function buildDom(id: Identity, brandHtml: () => string): Dom {
  const app = document.getElementById('app') ?? document.body;
  app.innerHTML = `
<div id="surface" role="application" aria-label="${id.strings.surfaceLabel}">
  <div id="wall" class="layer"></div>
  <div class="band" aria-hidden="true"></div>
  <div id="top" class="layer"></div>
  <div id="fv" class="layer"></div>
</div>
<div class="tex holes" aria-hidden="true"></div>
<div class="fst" aria-live="polite"></div>
<div class="topstrip" aria-hidden="true"></div>
<div class="fsl" aria-hidden="true"></div>
<div class="brand">${brandHtml()}</div>
<div class="bnd"></div>
<button type="button" class="xcl" aria-label="Kapat"></button>
${rotateLayer(id)}`;
  const $ = (s: string) => app.querySelector<HTMLElement>(s)!;
  return { surface: $('#surface'), wall: $('#wall'), top: $('#top'), video: $('#fv'), texture: $('.tex'), title: $('.fst'), stage: $('.fsl'), band: $('.bnd'), close: $('.xcl'), rotate: $('.rot') };
}
