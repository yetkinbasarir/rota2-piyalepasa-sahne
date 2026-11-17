/* Canlı geri sayım: sıradaki temsile kalan süre [ay, gün, saat, dakika, saniye].
   Ay farkı takvim ayıyla; kalan gün/saat/dakika/saniye ondan sonra. Hedef: henüz geçmemiş
   ilk temsil; hepsi geçmişse sıfırda durur. Tek zamanlayıcı her saniye yalnızca ekranda
   görünen sayaçları günceller: [data-cd="<k>"] içindeki karakter span'ları (her konum bir span). */
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

const pad2 = (n: number) => String(Math.max(0, Math.min(99, n))).padStart(2, '0');

export interface Counters {
  /** Bir gösterinin şu anki değerleri */
  values(show: Show): number[];
  /** Yeni oluşturulan öğedeki sayaçları hemen doldur */
  fill(root: Element): void;
}

export function createCounters(shows: Show[], visible: () => Iterable<Element>, sep: string): Counters {
  const byK = new Map(shows.map((s) => [s.k, s]));
  const target = (s: Show) => s.sample.at.find((t) => t > Date.now()) ?? null;
  const text = (el: HTMLElement) => {
    const s = byK.get(+el.dataset.cd!);
    return (s ? countdown(new Date(), target(s)) : [0, 0, 0, 0, 0]).map(pad2).join(sep);
  };
  const write = (el: HTMLElement) => {
    const t = text(el);
    ([...el.children] as HTMLElement[]).forEach((c, k) => {
      const ch = t[k] ?? ' ';
      if (c.textContent !== ch) c.textContent = ch;
    });
  };
  const update = (roots: Iterable<Element>) => {
    for (const root of roots) for (const el of root.querySelectorAll<HTMLElement>('[data-cd]')) write(el);
  };
  // saniye başına hizalanmış tek zamanlayıcı
  const tick = () => {
    update(visible());
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };
  setTimeout(tick, 1000 - (Date.now() % 1000) + 5);

  return {
    values: (s) => countdown(new Date(), target(s)),
    fill: (root) => update([root]),
  };
}
