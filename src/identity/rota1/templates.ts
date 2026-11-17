/* ROTA1 şablonları: kart (renk kutusu), açılmış hâlin metin paneli, bilet (devre dışı). */
import type { Show, Templates, TemplateContext, TicketState } from '../../engine/types';
import { SURFACE } from './surface';

const DARK = '#0b0b0b';
const LIGHT = '#fff';

/** Göreli parlaklık (WCAG) ve kontrast oranı */
const lum = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const tl = (n: number) => n.toLocaleString('tr-TR') + ' ₺';
const px = (t: { scale: number; minPx: number }, W: number) => Math.max(t.minPx, W * t.scale);

/* ---------- kart: renk kutusu ----------
   Kart genişliğinde (w), renk kutusu yüksekliğinde (h) dizilir. .nm isim (sol üst, Light),
   .cdw sayaç (motor kutunun altına yerleştirir). Sayaç tek satır, etiketsiz: 01:24:42:14:21. */
/** Sayaç "00:00:00:00:00" genişliği (em, mono: 14 × 0,6) — ilk tahmin; motor data-fit ile tam genişliğe oturtur */
const CD_EM = 8.4;

/** Sayaç: 14 karakter ("AA:GG:SS:DD:SS"), her konum ayrı span (sayaç ↔ tarih geçişi konum konum döner) */
function counterChars(s: Show, ctx: TemplateContext) {
  const text = ctx.countdown(s).map((n) => String(n).padStart(2, '0')).join(':');
  return [...text].map((c) => `<span>${c}</span>`).join('');
}
function counter(s: Show, ctx: TemplateContext, size: number) {
  return `<div class="cd" data-cd="${s.k}" data-fit style="font-size:${size.toFixed(2)}px">${counterChars(s, ctx)}</div>`;
}

function name(s: Show, ctx: TemplateContext) {
  const parts = s.title.split(' & ');
  // " & " varsa iki parça yan yana iki sütun
  if (parts.length === 2) return `<div class="nm nm-2"><span>${ctx.esc(parts[0])}</span><span>${ctx.esc(parts[1])}</span></div>`;
  return `<div class="nm">${ctx.esc(s.title)}</div>`;
}

function card(s: Show, w: number, h: number, ctx: TemplateContext) {
  const pad = px(SURFACE.pad, w);
  const title = px(SURFACE.title, w);
  const cd = (w - 2 * pad) / CD_EM;
  // isim sayaca değmesin
  const nameLines = Math.max(1, Math.floor((h - 2 * pad - cd - pad * 0.5) / (title * 1.08)));
  return `<div class="nmw" style="padding:${pad.toFixed(1)}px;font-size:${title.toFixed(2)}px;--lines:${nameLines}">${name(s, ctx)}</div>` +
    `<div class="cdw" style="padding:0 ${pad.toFixed(1)}px ${pad.toFixed(1)}px">${counter(s, ctx, cd)}</div>`;
}

/* ---------- açılmış öğe: renk paneli ----------
   Üstte başlık (büyük, Light), altında tanıtım, altında Detay / Bilet Al / Paylaş (ince çerçeveli,
   küçük), en altta tek satır sayaç. .pl öğeleri açılmanın son bölümünde sırayla belirir. */
function panel(s: Show, w: number, h: number, ctx: TemplateContext) {
  const pad = px(SURFACE.pad, w);
  const cd = (w - 2 * pad) / CD_EM;
  return `<div class="pnl" style="width:${w}px;height:${h}px;padding:${pad.toFixed(1)}px">` +
    `<h2 class="pt pl" style="font-size:${px(SURFACE.panelTitle, w).toFixed(2)}px">${ctx.esc(s.title)}</h2>` +
    (s.intro ? `<p class="pin pl" style="font-size:${px(SURFACE.panelBody, w).toFixed(2)}px">${ctx.esc(s.intro)}</p>` : '<p class="pin"></p>') +
    `<div class="pbt pl" style="font-size:${px(SURFACE.button, w).toFixed(2)}px"><button type="button" data-act="video">Video</button><button type="button" data-act="detail" aria-pressed="false">Detay</button><button type="button" data-act="ticket">Bilet Al</button><button type="button" data-act="share">Paylaş</button></div>` +
    `<div class="pcw pl">${counter(s, ctx, cd)}</div></div>`;
}

/* ---------- web: açılmış öğenin künyesi ----------
   Beyaz zemin, siyah yazı; iç boşluk ve punto renk panelininkiyle aynı. Tek sütun, fotoğraf alanının
   tam genişliği; yükseklik içerik kadar. Liste 2px siyah çizgilerle ayrılır; her satır iki kolonlu
   grid: solda alan adı (Bold, sabit genişlik: iç genişliğin %32'si), sağda kişiler (Light). Alan adı
   kolonu 110px'ten dar kalırsa alan adı kişilerin üstüne geçer. Oynayanlar: her oyuncu ayrı satırda
   "Ad — Rol" (sığmazsa rol alt satıra). */
function credits(s: Show, w: number, _h: number, pw: number, ctx: TemplateContext) {
  const pad = px(SURFACE.pad, pw);
  const fs = px(SURFACE.panelBody, pw);
  const label = (w - 2 * pad) * SURFACE.creditsLabel.ratio;
  const stack = label < SURFACE.creditsLabel.minPx;
  const rows = s.credits.map((r) => `<li><b>${ctx.esc(r.field)}</b><span>${r.people.map(ctx.esc).join(', ')}</span></li>`);
  if (s.cast.length) {
    const cast = s.cast
      .map((c) => `<span class="cm">${c.role ? `<span>${ctx.esc(c.name)} —</span> <span>${ctx.esc(c.role)}</span>` : `<span>${ctx.esc(c.name)}</span>`}</span>`)
      .join('');
    rows.push(`<li><b>Oynayanlar</b><span>${cast}</span></li>`);
  }
  return `<div class="kn${stack ? ' kn-stack' : ''}" style="width:${w}px;padding:${pad.toFixed(1)}px;font-size:${fs.toFixed(2)}px;--gut:${pad.toFixed(1)}px;--kl:${label.toFixed(1)}px">` +
    `<ul class="knl">${rows.join('')}</ul></div>`;
}

/* ---------- açılmış hâl: metin kutusu ----------
   Tek punto (--fs / --lh), iki ağırlık (<b> Bold, geri kalan Light). Doğrudan tanıtım metniyle
   başlar; altında 2px çizgilerle ayrılmış tek liste: künye satırları (her zaman açık), ardından
   açılır-kapanır "Oynayanlar" ve "Tarih ve Saat" (boşsa hiç gösterilmez). Açma/kapama motorda
   ([data-acc] düğmesi + hemen ardındaki gövde). */
const section = (name: string, body: string, cls = '') => `<section class="sec ${cls}"><h3><b>${name}</b></h3>${body}</section>`;

function accordion(title: string, body: string) {
  return `<li class="la"><button class="acc-h" type="button" data-acc aria-expanded="false"><b>${title}</b><span class="pm" aria-hidden="true">+</span></button>` +
    `<div class="acc-b"><div class="acc-i">${body}</div></div></li>`;
}

function textPanel(s: Show, ctx: TemplateContext) {
  const rows: string[] = s.credits.map((r) => `<li class="lr"><b>${ctx.esc(r.field)}</b><span>${r.people.map(ctx.esc).join(', ')}</span></li>`);
  if (s.cast.length) {
    const text = s.cast.map((c) => ctx.esc(c.role ? `${c.name} (${c.role})` : c.name)).join(', ');
    rows.push(accordion('Oynayanlar', `<p>${text}</p>`));
  }
  const d = s.sample;
  if (d.dates.length) rows.push(accordion('Tarih ve Saat', d.dates.map((x) => `<p>${x} · ${d.time}</p>`).join('')));
  return `<div class="tw">${s.intro ? `<p class="in">${ctx.esc(s.intro)}</p>` : ''}${rows.length ? `<ul class="ls">${rows.join('')}</ul>` : ''}</div>`;
}

/* ---------- bilet (şimdilik devre dışı; arayüzde açılmıyor) ---------- */
const join = (parts: string[]) => parts.filter(Boolean).join(' · ');

function head(s: Show, ctx: TemplateContext) {
  const meta = join([s.genre, s.stage, s.duration, s.age]);
  return `<header class="hd"><h2><b>${ctx.esc(s.title)}</b></h2>${s.originalTitle ? `<p>${ctx.esc(s.originalTitle)}</p>` : ''}${
    meta ? `<p>${ctx.esc(meta)}</p>` : ''
  }</header>`;
}

function ticket(s: Show, st: TicketState, ctx: TemplateContext) {
  const d = s.sample;
  return `<div class="dw">${head(s, ctx)}<div class="bd">
    ${section('Tarih', `<div class="ds">${d.dates.map((x, n) => `<button data-d="${n}" aria-pressed="${n === st.sel}">${x} · ${d.time}</button>`).join('')}</div>`)}
    ${section('Adet', `<div class="qt"><button data-q="-1" aria-label="Azalt">−</button><span>${st.qty}</span><button data-q="1" aria-label="Artır">+</button></div>`)}
    <dl class="sec crs"><div class="cr"><dt><b>Toplam</b></dt><dd>${tl(st.qty * d.price)}</dd></div></dl>
    <div class="sec"><button class="go" data-a="pay"><b>Satın al</b></button>${st.message ? `<p class="msg" aria-live="polite">${ctx.esc(st.message)}</p>` : ''}</div>
  </div></div>`;
}

/** Tam ekran: çok büyük tek satır başlık (Light) ve altında etiketsiz sayaç; boyları motor verir */
function fullTitle(s: Show, ctx: TemplateContext) {
  // saat: sayacın geri saydığı gösterimin saati ("SS:DD"); sayaç ↔ tarih geçişinden etkilenmez
  const at = s.sample.at.find((t) => t > Date.now()) ?? s.sample.at.at(-1);
  const d = at ? new Date(at) : null;
  const hour = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
  return `<div class="fst-t">${ctx.esc(s.title)}</div>` +
    `<div class="fst-c"><div class="cd" data-cd="${s.k}">${counterChars(s, ctx)}</div></div>` +
    `<div class="fst-c fst-h"><div class="cd">${hour}</div></div>`;
}

/** İçerikteki sahne adı → tam ekran etiketi; eşleşmeyen (boş, "—") değerlerde etiket yok */
const STAGE_NAMES: Record<string, string> = {
  'Ana Sahne': 'Büyük Sahne',
  'Küçük Sahne': 'Küçük Sahne',
};
function stageLabel(s: Show, w: number, ctx: TemplateContext) {
  const name = STAGE_NAMES[s.stage];
  if (!name) return '';
  return `<span class="fsl-b" style="font-size:${(px(SURFACE.button, w) * SURFACE.stageLabel).toFixed(2)}px">${ctx.esc(name)}</span>`;
}

/** Alt bant: Üye Ol / Üye Girişi (şimdilik işlevsiz) */
function bandButtons(w: number, scale: number, _ctx: TemplateContext) {
  const fs = px(SURFACE.button, w) * SURFACE.stageLabel * scale;
  return `<div class="bnb" style="font-size:${fs.toFixed(2)}px;--bnb-line:${SURFACE.bandLine}px">` +
    `<button type="button" class="fsl-b" data-band="signup">Üye Ol</button>` +
    `<button type="button" class="fsl-b" data-band="login">Üye Girişi</button></div>`;
}

/** Kapatma ikonu: yalnızca × — ince çizgi (ölçeklenmez), keskin, düz uçlu, merkezden ±45°.
    Çizgilerin uçları (artık çizilmeyen) dairenin geçtiği noktalarda biter; tıklama alanı dairenin çapı */
const CLOSE_R = 49;
function closeIcon(_ctx: TemplateContext) {
  const h = CLOSE_R / Math.SQRT2; // yarım çizginin x / y izdüşümü (viewBox 100)
  const a = (50 - h).toFixed(3);
  const b = (50 + h).toFixed(3);
  const sw = SURFACE.bandLine;
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">` +
    `<line class="xl" x1="${a}" y1="${a}" x2="${b}" y2="${b}" stroke="#fff" stroke-width="${sw}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/>` +
    `<line class="xl" x1="${a}" y1="${b}" x2="${b}" y2="${a}" stroke="#fff" stroke-width="${sw}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/></svg>`;
}

export const templates: Templates = {
  card,
  fullTitle,
  stageLabel,
  bandButtons,
  closeIcon,
  credits,
  panel,
  textPanel,
  ticket,
  // renk zemini üzerinde daha yüksek kontrast veren yazı rengi
  inkOn: (c) => (contrast(c, DARK) >= contrast(c, LIGHT) ? DARK : LIGHT),
};
