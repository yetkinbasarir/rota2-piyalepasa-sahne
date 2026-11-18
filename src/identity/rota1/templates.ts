/* ROTA1 şablonları: galeri yazıları (sağ sütunda başlık, tanıtım, künye),
   daire düğmeler ve kapatma ikonu. Ölçüleri ve yazı rollerini motor CSS değişkenleriyle verir.
   Sayı rolü (.num / .cd) yalnızca künyedeki tarih / saat ve sayaçta; akan metindeki rakamlar metnin fontunda. */
import type { Show, Templates, TemplateContext } from '../../engine/types';
import { SURFACE } from './surface';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Akan metin: içindeki sayılar (ör. "1950") metnin kendi fontunda kalır; sayı rolü yalnızca künye tarihi ve sayaçta */
const txt = (ctx: TemplateContext, s: string) => ctx.esc(s);

/** Sayaç: her karakter konumu ayrı span (motor saniye saniye günceller) */
function counterChars(s: Show, ctx: TemplateContext) {
  const text = ctx.countdown(s).map(pad2).join(ctx.sep ?? '.');
  return [...text].map((c) => `<span>${c}</span>`).join('');
}

/** Sayacın geri saydığı temsil: henüz geçmemiş ilk temsil, hepsi geçmişse sonuncusu */
const nextAt = (s: Show) => s.sample.at.find((t) => t > Date.now()) ?? s.sample.at.at(-1);

/** Logo çizgisi: logo-long.svg'deki yatay çizgi ve sağ ucundaki elmas (viewBox logonun kendi biriminde; kalınlık
    ve elmas boyu uzun logonun ekrandaki ölçeğinde, screen.ts --lr-t / --lr-d). Çizgi sağda elmasla biter; künyede
    aynası (elmas solda) */
const DIAMOND =
  '<svg class="dm" viewBox="900 154.87 41.732 28.626" aria-hidden="true" focusable="false"><path d="M920.961,177.038l6.458,6.458,14.313-14.313-14.313-14.313-6.458,6.458c-3.769,3.769-8.88,5.886-14.21,5.886H900V171.153H906.751c5.33,0,10.441,2.117,14.21,5.886Z"/></svg>';
const rule = (gap = false) => `<div class="lr lr-r${gap ? ' lr-g' : ''} ln" aria-hidden="true"><i></i>${DIAMOND}</div>`;

/** İçerikte gerçek değer yoksa (boş, "—", "Belirtilmedi") gösterilmez */
const present = (v: string) => !!v && v !== '—' && v !== '-' && v.toLocaleLowerCase('tr') !== 'belirtilmedi';

/* ---------- sağ sütun: başlık, tanıtım, künye ----------
   Başlığın altında aynalı logo çizgisi, tam tanıtım, altında yine çizgi (künyenin ilk satırının üstündeki çizgi);
   künye satırlarının her birinin üstünde çizgi. Başlık ve tanıtımın altındaki çizgilerin üstünde ve altında
   boşluk (.lr-g). Açık hâlde başlık ve altındaki çizgi yerinde kalır (beyaza döner), geri kalanı (.gi-rest)
   kaybolup kapanır */
function info(s: Show, ctx: TemplateContext) {
  const desc = s.intro ? `<p class="gdesc ln">${txt(ctx, s.intro)}</p>` : '';
  const rows = credits(s, ctx);
  // mobil: tarih · saat ve altında sayaç, başlığın çizgisi ile tanıtım arasında (künyede TARİH satırı yok)
  const w = ctx.mobile ? when(s, ctx) : null;
  let rest = w ? `<div class="gdt ln"><span class="num">${w.date}</span>${w.counter}</div>` : '';
  if (desc) rest += desc + (rows.length ? rule(true) : '');
  rest += rows.join(rule());
  return `<h2 class="gt ln">${txt(ctx, s.title)}</h2>${rule(true)}<div class="gi-rest">${rest}</div>`;
}

/* künye: TÜR, TARİH (+ sayaç), SAHNE, sonra emek satırları */
const STAGE: Record<string, string> = {
  'Ana Sahne': 'Büyük Sahne',
  'Küçük Sahne': 'Küçük Sahne',
};
/** Tür değeri büyük harfe çevrilmez: yalnızca kelimelerin ilk harfi büyük */
const initials = (v: string) =>
  v.toLocaleLowerCase('tr').replace(/(^|[\s\-/(])(\S)/g, (_m, a: string, b: string) => a + b.toLocaleUpperCase('tr'));
const row = (label: string, value: string, cls = '') => `<div class="gr ln"><span class="lb">${label}</span><span class="gv${cls}">${value}</span></div>`;
/** Sıradaki temsilin tarihi · saati ve sayacı */
function when(s: Show, ctx: TemplateContext) {
  const at = nextAt(s);
  if (!at) return null;
  const d = new Date(at);
  return {
    date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    counter: `<span class="gcd"><span class="cd" data-cd="${s.k}">${counterChars(s, ctx)}</span></span>`,
  };
}
function credits(s: Show, ctx: TemplateContext): string[] {
  const rows: string[] = [];
  if (present(s.genre)) rows.push(row('Tür', txt(ctx, initials(s.genre))));
  const w = ctx.mobile ? null : when(s, ctx);
  if (w) rows.push(row('Tarih', `<span class="num">${w.date}</span>${w.counter}`));
  const stage = STAGE[s.stage];
  if (stage) rows.push(row('Sahne', txt(ctx, stage)));
  const director = s.credits.find((r) => r.field.toLocaleLowerCase('tr') === 'yöneten');
  if (director) rows.push(row('Yöneten', txt(ctx, director.people.join(', '))));
  if (s.cast.length) {
    const names = s.cast.slice(0, SURFACE.castMax).map((c) => `<span>${txt(ctx, c.name)}</span>`).join('');
    rows.push(row('Oyuncular', names, ' gv-col'));
  }
  return rows;
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
  circleButtons,
  closeIcon,
  /** Mobil açık hâl (video başlamadan): başlık, altında çizgi, altında tarih · saat ve sayaç */
  videoTitle(s, ctx) {
    const w = when(s, ctx);
    return `<h2 class="gt">${txt(ctx, s.title)}</h2>${rule(true)}` + (w ? `<div class="gdt"><span class="num">${w.date}</span>${w.counter}</div>` : '');
  },
};
