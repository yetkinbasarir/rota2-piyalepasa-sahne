/* ROTA1 şablonları: galeri yazıları (künye bloğu, sahne adı, etiket + alıntı), tam ekran başlığı,
   daire düğmeler ve kapatma ikonu. Ölçüleri motor CSS değişkenleriyle verir. */
import type { Show, Templates, TemplateContext } from '../../engine/types';
import { SURFACE } from './surface';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Sayaç: her karakter konumu ayrı span (motor saniye saniye günceller) */
function counterChars(s: Show, ctx: TemplateContext) {
  const text = ctx.countdown(s).map(pad2).join(ctx.sep ?? '.');
  return [...text].map((c) => `<span>${c}</span>`).join('');
}

/** Sayacın geri saydığı temsil: henüz geçmemiş ilk temsil, hepsi geçmişse sonuncusu */
const nextAt = (s: Show) => s.sample.at.find((t) => t > Date.now()) ?? s.sample.at.at(-1);

/** Logodaki elmasın sağ ucu (çizgi + elmas); viewBox logonun kendi biriminde, 1px çizgiyle birleşir */
const DIAMOND =
  '<svg class="dm" viewBox="900 154.87 41.732 28.626" aria-hidden="true" focusable="false"><path d="M920.961,177.038l6.458,6.458,14.313-14.313-14.313-14.313-6.458,6.458c-3.769,3.769-8.88,5.886-14.21,5.886H900V171.153H906.751c5.33,0,10.441,2.117,14.21,5.886Z"/></svg>';
const rule = () => `<div class="rl ln" aria-hidden="true"><i></i>${DIAMOND}</div>`;

/** İçerikte gerçek değer yoksa (boş, "—", "Belirtilmedi") gösterilmez */
const present = (v: string) => !!v && v !== '—' && v !== '-' && v.toLocaleLowerCase('tr') !== 'belirtilmedi';

/* ---------- künye bloğu ---------- */
function info(s: Show, ctx: TemplateContext) {
  const rows: string[] = [];
  const director = s.credits.find((r) => r.field.toLocaleLowerCase('tr') === 'yöneten');
  if (director) rows.push(`<div class="gr ln"><b class="lb">Yöneten</b><span class="gv">${ctx.esc(director.people.join(', '))}</span></div>`);
  const at = nextAt(s);
  if (at) {
    const d = new Date(at);
    const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    rows.push(
      `<div class="gr ln"><b class="lb">Tarih</b><span class="gv"><span>${date}</span>` +
        `<span class="gcd"><span class="cd" data-cd="${s.k}">${counterChars(s, ctx)}</span></span></span></div>`,
    );
  }
  if (!ctx.mobile && s.cast.length) {
    const names = s.cast.slice(0, SURFACE.castMax).map((c) => `<span>${ctx.esc(c.name)}</span>`).join('');
    rows.push(`<div class="gr ln"><b class="lb">Oyuncular</b><span class="gv gv-col">${names}</span></div>`);
  }
  return `<h2 class="gt ln">${ctx.esc(s.title)}</h2>` + rule() + rows.join(rule());
}

/* ---------- sahne adı ---------- */
const STAGE: Record<string, string> = {
  'Ana Sahne': 'Büyük Sahne',
  'Küçük Sahne': 'Küçük Sahne',
};
function stageName(s: Show, ctx: TemplateContext) {
  const name = STAGE[s.stage];
  return name ? `<div class="gs-t ln">${ctx.esc(name)}</div>` : '';
}

/* ---------- etiket + alıntı ---------- */
/** "alinti" varsa o; yoksa tanıtımın ilk cümlesi (en fazla `chars` karakter, kelime sınırında "…") */
function quoteOf(s: Show) {
  if (s.quote) return s.quote;
  const intro = s.intro.trim();
  if (!intro) return '';
  const first = (/^.+?[.!?…](?=\s|$)/.exec(intro)?.[0] ?? intro).trim();
  const max = SURFACE.quoteChars;
  if (first.length <= max) return first;
  const cut = first.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 0 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}
function caption(s: Show, ctx: TemplateContext) {
  const label = present(s.genre) ? `<div class="gl ln">${ctx.esc(s.genre)}</div>` : '';
  const q = quoteOf(s);
  return label + (q ? `<p class="gq ln">“${ctx.esc(q)}”</p>` : '');
}

/* ---------- tam ekran ---------- */
/** Tam ekran: çok büyük tek satır başlık (Light) ve altında etiketsiz sayaç; boyları motor verir */
function fullTitle(s: Show, ctx: TemplateContext) {
  // saat: sayacın geri saydığı gösterimin saati ("SS:DD")
  const at = nextAt(s);
  const d = at ? new Date(at) : null;
  const hour = d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
  return `<div class="fst-t">${ctx.esc(s.title)}</div>` +
    `<div class="fst-c"><div class="cd" data-cd="${s.k}">${counterChars(s, ctx)}</div></div>` +
    `<div class="fst-c fst-h"><div class="cd">${hour}</div></div>`;
}

/** İçerikteki sahne adı → tam ekran etiketi; eşleşmeyen (boş, "—") değerlerde etiket yok */
function stageLabel(s: Show, w: number, ctx: TemplateContext) {
  const name = STAGE[s.stage];
  if (!name) return '';
  const fs = Math.max(SURFACE.button.minPx, w * SURFACE.button.scale) * SURFACE.stageLabel;
  return `<span class="fsl-b" style="font-size:${fs.toFixed(2)}px">${ctx.esc(name)}</span>`;
}

/* ---------- düğmeler ---------- */
/** Daire düğmeler: içi boş, ince kontur, yazı ortada */
function circleButtons(items: [string, string][], ctx: TemplateContext) {
  return items.map(([label, act]) => `<button type="button" class="cb" data-act="${act}">${ctx.esc(label)}</button>`).join('');
}

/** Kapatma ikonu: yalnızca × — ince çizgi (ölçeklenmez), keskin, düz uçlu, merkezden ±45°.
    Çizgilerin uçları (artık çizilmeyen) dairenin geçtiği noktalarda biter; tıklama alanı dairenin çapı */
const CLOSE_R = 49;
function closeIcon(_ctx: TemplateContext) {
  const h = CLOSE_R / Math.SQRT2;
  const a = (50 - h).toFixed(3);
  const b = (50 + h).toFixed(3);
  const sw = SURFACE.line;
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">` +
    `<line class="xl" x1="${a}" y1="${a}" x2="${b}" y2="${b}" stroke="#fff" stroke-width="${sw}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/>` +
    `<line class="xl" x1="${a}" y1="${b}" x2="${b}" y2="${a}" stroke="#fff" stroke-width="${sw}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/></svg>`;
}

export const templates: Templates = {
  info,
  stageName,
  caption,
  fullTitle,
  stageLabel,
  circleButtons,
  closeIcon,
};
