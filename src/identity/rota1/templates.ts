/* ROTA1 şablonları: galeri yazıları (künye bloğu, tür + alıntı, sahne adı), tam ekran başlığı,
   daire düğmeler ve kapatma ikonu. Ölçüleri ve yazı rollerini motor CSS değişkenleriyle verir.
   Bütün sayılar (tarih, saat, sayaç ve metin içindeki rakamlar) sayı rolünde (.num / .cd). */
import type { Show, Templates, TemplateContext } from '../../engine/types';
import { SURFACE } from './surface';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Kaçışlı metindeki sayıları sayı rolüne al */
const nums = (html: string) => html.replace(/\d+(?:[.,:]\d+)*/g, '<span class="num">$&</span>');
const txt = (ctx: TemplateContext, s: string) => nums(ctx.esc(s));

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
  if (director) rows.push(`<div class="gr ln"><span class="lb">Yöneten</span><span class="gv">${txt(ctx, director.people.join(', '))}</span></div>`);
  const at = nextAt(s);
  if (at) {
    const d = new Date(at);
    const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    rows.push(
      `<div class="gr ln"><span class="lb">Tarih</span><span class="gv"><span class="num">${date}</span>` +
        `<span class="gcd"><span class="cd" data-cd="${s.k}">${counterChars(s, ctx)}</span></span></span></div>`,
    );
  }
  if (!ctx.mobile && s.cast.length) {
    const names = s.cast.slice(0, SURFACE.castMax).map((c) => `<span>${txt(ctx, c.name)}</span>`).join('');
    rows.push(`<div class="gr ln"><span class="lb">Oyuncular</span><span class="gv gv-col">${names}</span></div>`);
  }
  // son satırın altında bir elmaslı çizgi daha ve tanıtım (en fazla birkaç satır, kalanı "…")
  const desc = !ctx.mobile && s.intro ? rule() + `<p class="gdesc ln">${txt(ctx, s.intro)}</p>` : '';
  return `<h2 class="gt ln">${txt(ctx, s.title)}</h2><div class="gi-rest">${rule()}${rows.join(rule())}${desc}</div>`;
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

/* ---------- tür + alıntı ---------- */
/** "alinti" varsa o; yoksa tanıtımın ilk cümlesi (en fazla `quoteChars` karakter, kelime sınırında "…") */
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
  const label = present(s.genre) ? `<div class="gl ln">${txt(ctx, s.genre)}</div>` : '';
  const q = quoteOf(s);
  return label + (q ? `<p class="gq ln">“${txt(ctx, q)}”</p>` : '');
}

/* ---------- tam ekran ---------- */
/** Tam ekran: çok büyük tek satır başlık ve altında etiketsiz sayaç ve saat; boyları motor verir */
function fullTitle(s: Show, ctx: TemplateContext) {
  const at = nextAt(s);
  const d = at ? new Date(at) : null;
  const hour = d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
  return `<div class="fst-t">${txt(ctx, s.title)}</div>` +
    `<div class="fst-c"><div class="cd" data-cd="${s.k}">${counterChars(s, ctx)}</div></div>` +
    `<div class="fst-c fst-h"><div class="cd">${hour}</div></div>`;
}

/* ---------- düğmeler ---------- */
/** Daire düğmeler: düz beyaz, konturusuz, yazı ortada tek satır (motor sığdırır) */
function circleButtons(items: [string, string][], ctx: TemplateContext) {
  return items.map(([label, act]) => `<button type="button" class="cb" data-act="${act}"><span>${ctx.esc(label)}</span></button>`).join('');
}

/** Kapatma ikonu: yalnızca × — ince çizgi (ölçeklenmez), keskin, düz uçlu, merkezden ±45°; metin renginde */
const CLOSE_R = 49;
function closeIcon(_ctx: TemplateContext) {
  const h = CLOSE_R / Math.SQRT2;
  const a = (50 - h).toFixed(3);
  const b = (50 + h).toFixed(3);
  const sw = SURFACE.line;
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">` +
    `<line class="xl" x1="${a}" y1="${a}" x2="${b}" y2="${b}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/>` +
    `<line class="xl" x1="${a}" y1="${b}" x2="${b}" y2="${a}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/></svg>`;
}

export const templates: Templates = {
  info,
  stageName,
  caption,
  fullTitle,
  circleButtons,
  closeIcon,
};
