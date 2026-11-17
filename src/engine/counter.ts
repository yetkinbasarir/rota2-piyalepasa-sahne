/* Canlı geri sayım: sıradaki temsile kalan süre [ay, gün, saat, dakika, saniye].
   Ay farkı takvim ayıyla; kalan gün/saat/dakika/saniye ondan sonra. Hedef: henüz geçmemiş
   ilk temsil; hepsi geçmişse sıfırda durur. Tek zamanlayıcı her saniye yalnızca ekranda
   görünen sayaçları günceller: [data-cd="<k>"] içindeki 14 karakter span'ı (her konum bir span). */
import { gsap } from './motion';
import type { Motion } from './motion';
import type { Show } from './types';

/** Tarihe takvim ayı ekler; gün taşarsa ayın son gününe sabitlenir */
function addMonths(d: Date, m: number) {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + m);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

export function countdown(now: Date, target: number | null): number[] {
  if (target === null || target <= now.getTime()) return [0, 0, 0, 0, 0];
  const t = new Date(target);
  let m = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
  while (m > 0 && addMonths(now, m).getTime() > target) m--;
  let rest = Math.floor((target - addMonths(now, m).getTime()) / 1000);
  const days = Math.floor(rest / 86400);
  rest -= days * 86400;
  const h = Math.floor(rest / 3600);
  rest -= h * 3600;
  const min = Math.floor(rest / 60);
  return [m, days, h, min, rest - min * 60];
}

export const pad2 = (n: number) => String(Math.max(0, Math.min(99, n))).padStart(2, '0');

/** Sayaç metni: "AA:GG:SS:DD:SS" (14 karakter) */
let SEP = ':';
export const countText = (v: number[]) => v.map(pad2).join(SEP);
/** Tarih metni: "GG / AA / YYYY" (14 karakter) */
export const dateText = (ms: number | null) => {
  if (ms === null) return '00 / 00 / 0000';
  const d = new Date(ms);
  return `${pad2(d.getDate())} / ${pad2(d.getMonth() + 1)} / ${d.getFullYear()}`;
};

export interface Counters {
  /** Bir gösterinin şu anki değerleri */
  values(show: Show): number[];
  /** Yeni oluşturulan öğedeki sayaçları hemen doldur (ve sayaç ↔ tarih döngüsüne kat) */
  fill(root: Element): void;
}

/* Sayaç ↔ tarih: .cd[data-cd] içindeki her karakter konumu ayrı bir span. Sayaç belirli aralıklarla
   sıradaki gösterim gününe ("GG / AA / YYYY") döner ve geri gelir; her konum kendi yerinde, soldan
   sağa gecikmeyle kısa bir süre rastgele rakamlar arasında döner ve yeni karakterine oturur (aynı
   kalan konumlar dönmez). Tarih gösterilirken sayaç arka planda sayar; dönüşte güncel değere oturur.
   Grid kartları (.ccard içindekiler) ortak döngüde, ekranda soldan sağa bir dalga olarak döner;
   yalnızca görünen kartlar animasyon çalıştırır. Açılmış öğe ve tam ekran sayaçları kendi döngüsünü
   oluşturuldukları andan itibaren sayaçla başlatır. prefers-reduced-motion: dönme yok, kısa opaklık geçişi. */
type Mode = 'count' | 'date';

export function createCounters(shows: Show[], visible: () => Iterable<Element>, motion: Motion, format?: { sep: string; flip: boolean }): Counters {
  if (format) SEP = format.sep;
  const flipOn = format?.flip !== false;
  const byK = new Map(shows.map((s) => [s.k, s]));
  const target = (s: Show) => s.sample.at.find((t) => t > Date.now()) ?? null;
  const showOf = (el: HTMLElement) => byK.get(+el.dataset.cd!);
  const live = (el: HTMLElement) => {
    const s = showOf(el);
    return countText(s ? countdown(new Date(), target(s)) : [0, 0, 0, 0, 0]);
  };
  const dateOf = (el: HTMLElement) => {
    const s = showOf(el);
    return dateText(s ? target(s) ?? s.sample.at.at(-1) ?? null : null);
  };
  const slots = (el: HTMLElement) => [...el.children] as HTMLElement[];
  const write = (el: HTMLElement, text: string) =>
    slots(el).forEach((c, k) => {
      const t = text[k] ?? ' ';
      if (c.textContent !== t) c.textContent = t;
    });
  const modeOf = (el: HTMLElement) => (el.dataset.mode as Mode) ?? 'count';
  /** Elemanın o anki hedef metni: sayaçsa güncel sayaç, tarihse tarih */
  const targetText = (el: HTMLElement) => (modeOf(el) === 'date' ? dateOf(el) : live(el));
  const isDigit = (ch: string | undefined) => !!ch && ch >= '0' && ch <= '9';

  /** Süren geçişler: eleman başına tek kayıt (en geç 'until' anında bitmiş sayılır) */
  const anims = new WeakMap<HTMLElement, { tws: gsap.core.Animation[]; until: number }>();
  /** Geçişi kesin olarak bitir: animasyonu öldür, metni o anki hedefe yeniden yaz */
  function finish(el: HTMLElement) {
    const a = anims.get(el);
    if (a) {
      anims.delete(el);
      a.tws.forEach((t) => t.kill());
    }
    gsap.killTweensOf(el);
    el.style.opacity = '';
    write(el, targetText(el));
  }
  /** Geçiş sürüyor mu (süresi aşılmışsa kesin olarak bitirilir) */
  function running(el: HTMLElement) {
    const a = anims.get(el);
    if (!a) return false;
    if (performance.now() <= a.until) return true;
    finish(el);
    return false;
  }

  /** Karakter karakter geçiş. Yalnızca rakam konumları döner; ayraçlar (":" ve " / ") hedeflerine doğrudan
      geçer. Bittiğinde ya da kesildiğinde metin hedefe kesin olarak yazılır. */
  function flip(el: HTMLElement, to: Mode, animate: boolean) {
    if (modeOf(el) === to && !anims.has(el)) return;
    // süren geçiş varsa önce kesin olarak bitir
    if (anims.has(el)) finish(el);
    el.dataset.mode = to;
    if (!animate || !el.isConnected) {
      finish(el);
      return;
    }
    const done = () => finish(el);
    if (motion.reduced) {
      // azaltılmış hareket: dönme yok, kısa opaklık geçişi
      const tw = gsap.to(el, {
        opacity: 0, duration: 0.15, ease: 'none',
        onComplete: () => {
          if (!anims.has(el)) return;
          write(el, targetText(el));
          a.tws.push(gsap.to(el, { opacity: 1, duration: 0.15, ease: 'none', onComplete: done }));
        },
      });
      const a = { tws: [tw as gsap.core.Animation], until: performance.now() + 600 };
      anims.set(el, a);
      return;
    }
    const cs = slots(el);
    const from = cs.map((c) => c.textContent ?? ' ');
    const st = motion.dur('flipStagger');
    const spin = motion.dur('flipSpin');
    const total = (cs.length - 1) * st + spin;
    const state = { t: 0 };
    let lastRand = -1;
    const tw = gsap.to(state, {
      t: total,
      duration: total,
      ease: 'none',
      onUpdate: () => {
        const target = targetText(el); // sayaç geri dönüşte güncel değere oturur
        const step = Math.floor(state.t / 0.045);
        const rnd = step !== lastRand;
        lastRand = step;
        cs.forEach((c, k) => {
          const goal = target[k] ?? ' ';
          let ch: string;
          if (!isDigit(goal) || !isDigit(from[k])) ch = goal; // ayraç: doğrudan hedef
          else if (from[k] === goal) ch = goal; // aynı kalan konum dönmez
          else {
            const local = state.t - k * st;
            if (local < 0) ch = from[k];
            else if (local < spin) ch = rnd || !isDigit(c.textContent ?? '') ? String(Math.floor(Math.random() * 10)) : c.textContent!;
            else ch = goal;
          }
          if (c.textContent !== ch) c.textContent = ch;
        });
      },
      onComplete: done,
      onInterrupt: done,
    });
    anims.set(el, { tws: [tw], until: performance.now() + total * 1000 + 400 });
  }

  /* ---------- grid: ortak döngü, soldan sağa dalga ---------- */
  let gridMode: Mode = 'count';
  const gridEls = () => [...document.querySelectorAll<HTMLElement>('#wall .ccard [data-cd]')];
  let waveCalls: gsap.core.Tween[] = [];
  function gridWave(to: Mode) {
    gridMode = to;
    waveCalls.forEach((d) => d.kill());
    waveCalls = [];
    const vw = innerWidth;
    for (const el of gridEls()) {
      const r = el.getBoundingClientRect();
      const on = r.right > 0 && r.left < vw;
      if (!on || motion.reduced) {
        if (!on) flip(el, to, false);
        else flip(el, to, true);
        continue;
      }
      const delay = Math.min(1, Math.max(0, r.left / vw)) * motion.dur('flipWave');
      waveCalls.push(gsap.delayedCall(delay, () => flip(el, gridMode, el.isConnected)));
    }
  }
  function gridCycle() {
    gsap.delayedCall(motion.dur('countShow'), () => {
      gridWave('date');
      gsap.delayedCall(motion.dur('dateShow'), () => {
        gridWave('count');
        gridCycle();
      });
    });
  }
  if (flipOn) gridCycle();

  /* ---------- açılmış öğe / tam ekran: kendi döngüsü, açıldığı andan itibaren ---------- */
  const own = new WeakSet<HTMLElement>();
  function ownCycle(el: HTMLElement) {
    if (own.has(el) || !flipOn) return;
    own.add(el);
    const loop = () =>
      gsap.delayedCall(motion.dur('countShow'), () => {
        if (!el.isConnected) return;
        flip(el, 'date', true);
        gsap.delayedCall(motion.dur('dateShow'), () => {
          if (!el.isConnected) return;
          flip(el, 'count', true);
          loop();
        });
      });
    loop();
  }

  const update = (roots: Iterable<Element>) => {
    for (const root of roots) {
      for (const el of root.querySelectorAll<HTMLElement>('[data-cd]')) {
        // geçiş sürerken konumlar ezilmez; geçiş bitince (ya da süresi aşılınca) güncel değere oturur
        if (running(el)) continue;
        // grid kartı (açılıp geri dönen dahil) duvarın o anki hâline katılır
        if (modeOf(el) !== gridMode && el.closest('.ccard') && el.closest('#wall')) el.dataset.mode = gridMode;
        write(el, targetText(el));
      }
    }
  };
  // Saniye başına hizalanmış tek zamanlayıcı
  const tick = () => {
    update(visible());
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };
  setTimeout(tick, 1000 - (Date.now() % 1000) + 5);

  return {
    values: (s) => countdown(new Date(), target(s)),
    fill(root) {
      for (const el of root.querySelectorAll<HTMLElement>('[data-cd]')) {
        if (!el.dataset.mode) {
          // grid kartı ortak döngünün o anki hâline katılır; diğerleri sayaçla kendi döngüsünü başlatır
          const grid = !!el.closest('.ccard');
          el.dataset.mode = grid ? gridMode : 'count';
          if (!grid) ownCycle(el);
        }
      }
      update([root]);
    },
  };
}
