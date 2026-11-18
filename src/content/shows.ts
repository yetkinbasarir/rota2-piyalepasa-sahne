/* İçerik verisi — Piyalepaşa Sahne programı.
   Tek kaynak: proje kökündeki icerik_kunye.json (gösteriler "id" ile eşleşir).
   Burada yalnızca fotoğraf eşlemesi ve örnek tarih/saat/fiyat değerleri eklenir. */
import type { FullVideo, Photo, Show, VideoLoop } from '../engine/types';
import data from '../../icerik_kunye.json';
import manifest from './photos.generated.json';
import photoColors from './colors.generated.json';
import photoFocus from './focus.generated.json';
import focusOverrides from './focus.overrides.json';
import videoList from './videos.json';

interface SourceShow {
  no: number;
  id: string;
  baslik: string;
  ozgun_ad: string;
  sahne: string;
  tur: string;
  sure: string;
  yas: string;
  tanitim: string;
  /** Elle girilmiş alıntı (varsa tanıtımın ilk cümlesinin yerine gösterilir) */
  alinti?: string;
  kunye: { alan: string; kisiler: string[] }[];
  oynayanlar: { ad: string; rol: string }[];
  referans_yapim?: string;
  kaynaklar?: string[];
  not?: string;
  /** Elle girilmiş renk (varsa fotoğraftan çıkarılan rengin önüne geçer) */
  renk?: string;
  /** Elle girilmiş odak noktası (yüzde): {"x": 50, "y": 30} veya "50% 30%" */
  odak?: { x: number; y: number } | string;
}

type ManifestEntry = { w: number; h: number; widths: number[]; alt: string };
const M = manifest as Record<string, ManifestEntry>;
const photo = (id?: string): Photo | undefined => (id && M[id] ? { id, ...M[id] } : undefined);
/** Derleme sırasında fotoğraftan çıkarılan renkler (scripts/build-images.mjs) */
const PC = photoColors as Record<string, { renk: string }>;
/** Derleme sırasında hesaplanan odak noktaları (yüz algılama / attention) */
const PF = photoFocus as Record<string, { x: number; y: number; yuzUst?: number; yuzYukseklik?: number }>;
/** Elle düzeltilmiş odaklar (focus.overrides.json): hesaplananın önüne geçer; görseller yeniden üretilince
    (scripts/build-images.mjs yalnızca focus.generated.json'u yazar) kaybolmaz. Galeri dairesi, ilk ekran daireleri
    ve tam ekran görseli aynı odağı kullanır */
const FO = focusOverrides as Record<string, { x: number; y: number }>;
/** Hesaplanan odak: nokta + varsa yüz kutusunun üst kenarı ve yüksekliği (elle düzeltilmişse yalnızca nokta) */
function autoFocus(pid?: string) {
  const o = pid ? FO[pid] : undefined;
  if (o && Number.isFinite(o.x) && Number.isFinite(o.y)) return { x: o.x, y: o.y };
  const f = pid ? PF[pid] : undefined;
  if (!f) return undefined;
  return f.yuzUst != null && f.yuzYukseklik != null ? { x: f.x, y: f.y, faceTop: f.yuzUst, faceH: f.yuzYukseklik } : { x: f.x, y: f.y };
}
const DEFAULT_FOCUS = { x: 50, y: 33 };
/** Elle girilmiş odak: nesne ya da "x% y%" metni */
function manualFocus(v: SourceShow['odak']) {
  if (!v) return undefined;
  if (typeof v === 'string') {
    const m = v.match(/(-?[\d.]+)%?\s+(-?[\d.]+)%?/);
    return m ? { x: +m[1], y: +m[2] } : undefined;
  }
  return Number.isFinite(v.x) && Number.isFinite(v.y) ? { x: v.x, y: v.y } : undefined;
}

/* Gösteri id → fotoğraf dosya kökü (public/img/<kök>_A|B-<genişlik>.*) */
const PHOTOS: Record<string, { a: string; b: string; extra?: string[] }> = {
  'lukus-hayat': ab('Lukus_Hayat'),
  'sunset-bulvari': ab('Sunset_Bulvari'),
  'paranormal-activity': ab('Paranormal_Activity'),
  'karagoz-ve-hacivat': ab('Karagoz_ve_Hacivat'),
  'we-will-rock-you': ab('We_Will_Rock_You'),
  cats: ab('Cats'),
  'slavas-snowshow': ab('Slavas_Snowshow'),
  'the-snowman': ab('The_Snowman'),
  riverdance: ab('Riverdance'),
  'uyuyan-guzel': ab('Uyuyan_Guzel'),
  findikkiran: ab('Findikkiran'),
  'kugu-golu': ab('Kugu_Golu'),
  tarkan: ab('Tarkan'),
  'sertab-erener': ab('Sertab_Erener'),
  'luka-sulic': ab('Luka_Sulic'),
  'tony-ann': ab('Tony_Ann'),
  'fazil-say': ab('Fazil_Say'),
  cabaret: ab('Cabaret_Kit_Kat'),
  'ucurtma-avcisi': ab('Ucurtma_Avcisi'),
  sanat: ab('Sanat'),
  medea: ab('Medea'),
  'guess-how-much-i-love-you': ab('Guess_How_Much_I_Love_You'),
  madagascar: ab('Madagascar'),
  'iksv-istanbul-tiyatro-festivali': ab('IKSV_Istanbul_Tiyatro_Festivali'),
  'june-carter-cash': ab('June_Carter_Cash'),
  'isabelle-huppert-ve-jeremy-irons': { a: 'Isabelle_Huppert_A', b: 'Jeremy_Irons_A', extra: ['Isabelle_Huppert_B', 'Jeremy_Irons_B'] },
  circa: ab('Circa'),
  'bubble-man': ab('Bubble_Man'),
  'stand-up-geceleri': ab('Stand_up_Geceleri'),
  'caz-geceleri': ab('Caz_Geceleri'),
  'turk-ve-yunan-geceleri': ab('Turk_ve_Yunan_Geceleri'),
};
function ab(root: string) {
  return { a: `${root}_A`, b: `${root}_B` };
}

/* İsteğe bağlı video döngüleri:  'riverdance': { mp4: '/video/riverdance.mp4' } */
const VIDEOS: Record<string, VideoLoop> = {};

/* Tam ekran videoları (videos.json): "acik": false olan ya da tur'u "sayfa" olan girdiler yok sayılır */
interface SourceVideo {
  tur: string;
  id?: string;
  url?: string;
  baslangic?: number;
  bitis?: number;
  acik?: boolean;
  yedek?: SourceVideo;
}
const SV = videoList as Record<string, SourceVideo>;
function fullVideo(v?: SourceVideo): FullVideo | undefined {
  if (!v || v.acik === false) return undefined;
  const start = Math.max(0, Number(v.baslangic) || 0);
  // bitiş yalnızca başlangıç > 0 ve bitiş > başlangıç ise geçerli (aralık döngüsü)
  const bitis = Number(v.bitis);
  const end = start > 0 && Number.isFinite(bitis) && bitis > start ? bitis : undefined;
  if ((v.tur === 'youtube' || v.tur === 'vimeo') && v.id) return { kind: v.tur, id: String(v.id), start, end };
  if (v.tur === 'mp4' && v.url) return { kind: 'mp4', url: v.url, start, end };
  return undefined; // "sayfa" ve eksik girdiler
}

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TIME = { h: 20, m: 30 };
/** Örnek temsil günleri (gösteri sırasına göre) */
const sampleDays = (k: number) => {
  const b = new Date(2026, 11, 1 + k * 3, TIME.h, TIME.m);
  return [0, 1, 7].map((x) => new Date(b.getFullYear(), b.getMonth(), b.getDate() + x, TIME.h, TIME.m));
};
const label = (d: Date) => `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}`;

const clean = (s: string | undefined) => (s ?? '').trim();

export const SHOWS: Show[] = (data.gosteriler as SourceShow[]).map((g, k) => {
  const p = PHOTOS[g.id];
  if (!p) console.warn(`Fotoğraf eşlemesi yok: ${g.id}`);
  const photoA = photo(p?.a);
  const photoB = photo(p?.b);
  return {
    k,
    id: g.id,
    title: clean(g.baslik),
    originalTitle: clean(g.ozgun_ad),
    genre: clean(g.tur),
    stage: clean(g.sahne),
    duration: clean(g.sure),
    age: clean(g.yas),
    intro: clean(g.tanitim),
    quote: clean(g.alinti),
    credits: g.kunye
      .map((r) => ({ field: clean(r.alan), people: r.kisiler.map(clean).filter(Boolean) }))
      .filter((r) => r.field && r.people.length),
    cast: g.oynayanlar.map((c) => ({ name: clean(c.ad), role: clean(c.rol) })).filter((c) => c.name),
    archive: { referenceProduction: clean(g.referans_yapim), sources: g.kaynaklar ?? [], note: clean(g.not) },
    photoA,
    photoB,
    extraPhotos: p?.extra?.map(photo).filter((x): x is Photo => !!x),
    // A yoksa B kullanılır; ikisi de yoksa renk zemin
    photo: photoA ?? photoB,
    // renk: veride elle girilmiş > gösterilen fotoğraftan çıkarılan > (yoksa kimlik paleti)
    color: clean(g.renk) || PC[(photoA ?? photoB)?.id ?? '']?.renk,
    // odak: veride elle girilmiş > gösterilen fotoğraftan hesaplanan > varsayılan (üst üçte bir)
    focus: manualFocus(g.odak) ?? autoFocus((photoA ?? photoB)?.id) ?? DEFAULT_FOCUS,
    video: VIDEOS[g.id],
    fullVideo: fullVideo(SV[g.id]),
    fullVideoBackup: fullVideo(SV[g.id]?.yedek),
    sample: {
      dates: sampleDays(k).map(label),
      time: `${TIME.h}.${String(TIME.m).padStart(2, '0')}`,
      price: 450 + ((k * 137) % 20) * 100,
      at: sampleDays(k).map((d) => d.getTime()),
    },
  };
});
