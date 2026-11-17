/* Motorun dış dünyayla sözleşmesi: içerik verisi ve kimlik katmanı bu tiplere uyar. */

/* ---------- içerik ---------- */
export interface Photo {
  id: string;
  /** Orijinal piksel boyutu */
  w: number;
  h: number;
  /** Üretilmiş genişlikler (public/img/<id>-<w>.webp|avif) */
  widths: number[];
  alt: string;
}

/** Tam ekranda oynayan video (src/content/videos.json) */
export interface FullVideo {
  kind: 'youtube' | 'vimeo' | 'mp4';
  /** YouTube / Vimeo kimliği */
  id?: string;
  /** mp4 adresi */
  url?: string;
  /** Başlangıç (saniye) */
  start: number;
  /** Bitiş (saniye): başlangıç > 0 ve bitiş > başlangıç ise yalnızca bu aralık döngüde oynar */
  end?: number;
}

export interface VideoLoop {
  /** Sessiz, döngüde oynatılacak kısa video. En az biri gerekli. */
  webm?: string;
  mp4?: string;
  poster?: string;
}

export interface CreditRow {
  /** Künye alan adı (ör. "Yöneten") */
  field: string;
  people: string[];
}

export interface CastMember {
  name: string;
  /** Boş olabilir */
  role: string;
}

export interface Show {
  /** Sıra (0'dan) — halkadaki sıra */
  k: number;
  id: string;
  title: string;
  /** Özgün ad; boş olabilir */
  originalTitle: string;
  genre: string;
  stage: string;
  /** Boş olabilir */
  duration: string;
  /** Boş olabilir */
  age: string;
  intro: string;
  /** Elle girilmiş alıntı ("alinti"); boş olabilir */
  quote: string;
  /** Sabit sıralı künye (kaynak sırası korunur) */
  credits: CreditRow[];
  cast: CastMember[];
  /** Yalnızca veri modelinde; arayüzde gösterilmez */
  archive: { referenceProduction: string; sources: string[]; note: string };
  /** Kaynak fotoğraflar */
  photoA?: Photo;
  photoB?: Photo;
  extraPhotos?: Photo[];
  /** Dairede gösterilen fotoğraf: A, yoksa B */
  photo?: Photo;
  /** Öğenin rengi: veride elle girilmiş "renk", yoksa fotoğraftan çıkarılan; fotoğraf yoksa boş (kimlik paleti) */
  color?: string;
  /** Fotoğrafın odak noktası (yüzde): veride elle girilmiş "odak", yoksa yüz algılama / attention.
      faceTop / faceH: seçilen yüz kutusunun üst kenarı ve yüksekliği (yüzde; yalnızca algılanan yüzlerde) */
  focus: { x: number; y: number; faceTop?: number; faceH?: number };
  /** İsteğe bağlı video döngüsü (veri modelinde; arayüz kullanmıyor) */
  video?: VideoLoop;
  /** Tam ekran videosu: yalnızca tam ekranda, fotoğrafın arkasında yüklenip oynar */
  fullVideo?: FullVideo;
  /** videos.json'daki yedek girdi (şimdilik kullanılmıyor) */
  fullVideoBackup?: FullVideo;
  /** Örnek değerler; at: temsillerin zaman damgaları (ms) */
  sample: { dates: string[]; time: string; price: number; at: number[] };
}

/* ---------- şablon bağlamı ---------- */
export interface TemplateContext {
  /** Sayaç ayracı */
  sep?: string;
  mobile: boolean;
  vw: number;
  vh: number;
  /** Geri sayımın başlangıç değerleri [ay, gün, saat, dakika, saniye]; motor her saniye
      [data-cd="<k>"] içindeki karakter span'larını (her konum bir span) günceller */
  countdown(show: Show): number[];
  esc(s: string): string;
}

export interface Templates {
  /** Sol üst künye bloğu: başlık; .gi-rest içinde elmaslı çizgiler, YÖNETEN / TARİH (+ sayaç) / OYUNCULAR
      satırları ve tanıtım. Satır satır geçiş için her satır .ln taşır; mobilde oyuncular ve tanıtım yok */
  info(show: Show, ctx: TemplateContext): string;
  /** Alt ortadaki sahne adı (.ln); sahne yoksa '' */
  stageName(show: Show, ctx: TemplateContext): string;
  /** Üst ortadaki tür satırı ve alıntı (.ln satırları) */
  caption(show: Show, ctx: TemplateContext): string;
  /** Tam ekran başlığı ve sayacı: .fst-t başlık (tek satır), .fst-c sayaç ([data-cd]) */
  fullTitle(show: Show, ctx: TemplateContext): string;
  /** Daire düğmeler: [etiket, data-act] çiftleri */
  circleButtons(items: [string, string][], ctx: TemplateContext): string;
  /** Kapatma ikonu: daire içinde × (tek inline SVG) */
  closeIcon(ctx: TemplateContext): string;
}

/* ---------- kimlik ---------- */
/** Uzayıp kısalabilen logonun bir parçası: SVG, yatay çizgilerin merkez y değerleri ve kalınlığı (viewBox birimi) */
export interface LogoPart {
  svg: string;
  lines: number[];
  thick: number;
}

/** Yazı rolü: aile, ağırlık, değişken font ekseni */
export interface TypeRole {
  family: string;
  weight: number;
  /** font-variation-settings (ör. '"wght" 300') */
  variation?: string;
}

/** ROTA2 çapraz 3B daire galerisi: ölçüler ekran yüksekliği H'nin (belirtilenler genişlik W'nin) oranı */
export interface GalleryTokens {
  /** CSS perspective (px); perspective-origin ekranın ortası */
  perspective: number;
  /** Duruştaki yerleşim */
  layout: {
    /** Ortadaki dairenin merkezi x (W oranı) */
    centerX: number;
    /** Ortadaki daire: alıntının altı ile sahne adının üstü arasında, her iki yanda bu boşlukla (H) en büyük çap */
    gap: number;
    /** Çap üst sınırı (W oranı) */
    cap: { web: number; mobile: number };
    /** Ölçek anahtarları s(p), p = −3 … +3 (arası sürekli) */
    keys: number[];
    /** p = +1 dairenin ekranın sağ kenarı dışında kalan genişlik oranı */
    rightOut: number;
    /** Soldaki daire sağındaki dairenin arkasına kendi genişliğinin en fazla bu oranı kadar girebilir */
    tuck: number;
    /** Yazı, düğme ve logodan en az boşluk (H) */
    clear: number;
    /** Başlangıç köşegeni (sola bir adımda [W, H] oranı); sığmazsa yatıklaştırılır */
    slope: [number, number];
  };
  /** 3B eğim (°): x, z sabit; y eğri üzerinde sol uçtan (yLeft, leftAt adım) sağ uca (yRight, rightAt adım) */
  rotate: { x: number; y: number; z: number; yLeft: number; yRight: number; leftAt: number; rightAt: number };
  /** Daire içindeki fotoğraf: normal kaplamanın katı */
  photoZoom: number;
  /** Ortadan uzaklık (adım): DOM'da tutulan daireler [-around, +around] */
  around: number;
  /** Renklenme / duotone'a dönüş (sn) */
  colorFade: number;
  /** Süzülme: dikey genlik (H oranı), rotateX genliği (°), periyot aralığı (sn), eğri */
  float: { y: number; rx: number; min: number; max: number; ease: string };
  /** Fare eğimi (kenardaki daireler): en fazla açı (°), yay sertliği ve sönüm (dönüş) */
  tilt: { max: number; stiffness: number; damping: number };
  /** Ortadaki daire düzleşir (masaüstünde fare üzerindeyken, mobilde duruşta): ölçek, süre, eğri; gölgenin
      yükseklik oranı (düz hâlde) */
  flat: { scale: number; dur: number; ease: string; shadowHeight: number };
  /** Zemine düşen gölge */
  shadow: {
    color: string;
    /** Genişlik: dairenin ekrandaki genişliğinin oranı; yükseklik: genişliğin oranı */
    width: number;
    height: number;
    opacity: number;
    centerOpacity: number;
    blur: number;
    /** Dairenin alt kenarından aşağı, sağa (H oranı) */
    below: number;
    right: number;
    /** Daire en yukarıdayken: küçülme oranı, bulanıklık (px), opaklık */
    lift: { shrink: number; blur: number; opacity: number };
    /** Fare eğiminde en fazla kayma (H oranı) */
    tiltShift: number;
  };
  /** Hareket: oturma, kendiliğinden ilerleme */
  settle: { dur: number; ease: string };
  auto: { every: number; dur: number; ease: string };
  /** Açılma: süre, açılış / kapanış eğrisi, videonun belirme başlangıcı ve süresi (sn) */
  open: { dur: number; easeIn: string; easeOut: string; videoAt: number; videoDur: number };
  /** Atalet: bırakma hızının ileri izdüşüm süresi (sn) ve en fazla adım */
  throw: { time: number; max: number };
  /** Tekerlek: bir adım için kaydırma (H oranı); duruşta son yöne eğilim (adım) */
  wheel: { step: number; bias: number; idle: number };
}

/** Ekrandaki yazılar ve düğmeler (H oranı; belirtilenler W oranı ya da px) */
export interface ScreenTokens {
  /** Metin rengi (yazılar, logolar, künye çizgileri, düğme yazıları) */
  text: string;
  /** Yazı rolleri: künye başlığı, alıntı, değerler / tanıtım, etiketler ve düğmeler, sayılar */
  type: { title: TypeRole; quote: TypeRole; body: TypeRole; label: TypeRole; number: TypeRole };
  /** Tür satırı (alıntının üstünde): yazı boyu, harf aralığı (em) */
  label: { size: number; track: number };
  /** Künye bloğu: sol (W), üst, genişlik (W, en az px), başlık (W; web / mobil), değer ve etiket boyu, satır,
      etiket harf aralığı (em), elmas yüksekliği (px), tanıtımın en fazla satırı; mobilde kenar boşluğu (H) */
  info: {
    left: number; top: number; width: number; minWidth: number; title: { web: number; mobile: number };
    value: number; row: number; track: number; diamond: number; descLines: number; mobilePad: number;
  };
  /** Üst orta: tür satırının üstü (H), alıntı boyu (W), satır aralığı, en fazla genişlik (W) */
  quote: { top: number; size: { web: number; mobile: number }; lh: number; maxW: { web: number; mobile: number } };
  /** Alt orta sahne adı: yazı boyu, harf aralığı (em), Bilet Al ile arası */
  stage: { size: number; track: number; gap: number };
  /** Bilet Al: çap, yazı boyu, alt boşluk */
  ticket: { d: number; font: number; bottom: number };
  /** Daire düğmeler: dolgu; yazı tek satırda en fazla çapın `fit` oranı genişlikte (rahat iç boşluk) */
  button: { fill: string; fit: number };
  /** Logo: masaüstünde uzun logo yüksekliği, alt boşluk, ilk harfin soldan uzaklığı (W); mobilde kısa logo
      yüksekliği ve alt boşluğu */
  logo: { h: number; bottom: number; letter: number; mobileH: number; mobileBottom: number };
  /** Üye Ol / Giriş: çap, yazı boyu, aralık, üst ve sağ boşluk; mobilde çap (W oranı) */
  members: { d: number; font: number; gap: number; pad: number; mobileD: number };
  /** Yazı değişimi: kayma (px), satırlar arası gecikme, toplam süre (sn) */
  swap: { shift: number; stagger: number; total: number };
}

export interface Identity {
  id: string;
  name: string;
  colors: {
    /** Zemin (html, body, theme-color) */
    background: string;
    focus: string;
    /** Yatay telefon katmanının zemini */
    overlay: string;
  };
  /** Kâğıt dokusu: SVG feTurbulence */
  paper: { frequency: number; octaves: number; opacity: number };
  gallery: GalleryTokens;
  screen: ScreenTokens;
  /** Sayaç biçimi: ayraç */
  counterFormat: { sep: string };
  /** Kenardaki dairelerin duotone eşlemesi (SVG filtresi): koyu ve açık ton */
  duotone: { dark: string; light: string };
  /** Fotoğrafı olmayan öğelerin rengi (yükleme ekranının nokta paleti) */
  palette: string[];
  fonts: {
    stylesheets: string[];
  };
  /** Tam ekran başlığı ve sayacı */
  fullTitle: {
    /** Başlık yazı boyu (ekran genişliğinin oranı) */
    size: number;
    /** Başlığın en fazla kaplayacağı genişlik (ekran genişliğinin oranı); uzunsa küçültülür */
    maxWidth: number;
    /** Sayaç yazı boyu (başlık boyunun oranı) */
    counter: number;
    /** Başlıkla sayaç arası (başlık boyunun oranı) */
    gap: number;
    /** Kapatma ikonunun ve yükleme ekranının kenar boşluğu (H oranı) */
    pad: number;
    /** Kapatma ikonunun çapı (px) */
    closeSize: number;
  };
  /** Yükleme ekranı: logo animasyonu (1: içi dolan, 2: nokta matrisi), en kısa görünme süresi (sn),
      içi dolan logonun koyu zemini */
  loader: {
    logoAnim: 1 | 2; minTime: number; base: string;
    /** Büyük logo: genişlik en fazla ekran genişliğinin oranı (web / mobil), yükseklik en fazla ekran yüksekliğinin oranı */
    logoW: { web: number; mobile: number }; logoH: number;
    /** Opak daireler: temel yarıçap (logo yüksekliğinin oranı), yarıçap katı aralığı ve küçüklere eğilim
        (kuvvet üssü), ana daire sayısı çarpanı, süzülme (yarıçapın oranı) */
    blobBase: number; blobMin: number; blobMax: number; blobSkew: number; blobFill: number;
    blobDrift: number;
    /** Nokta matrisi: her noktanın rastgele başlama gecikmesi (0..dotDelay sn) ve büyüme süresi (sn);
        hepsi en fazla dotTotal sn içinde tamamlanır (ölçeklenir), büyüme hızlanarak (power2.in) */
    dotDelay: number; dotGrowMin: number; dotGrowMax: number; dotTotal: number;
    /** Verilirse dairelerin paleti doğrudan bu renkler (bilet renklerinden türetilmez) */
    dotPalette?: string[];
    dotSat: number; dotLight: number; dotHueMerge: number; flashHold: number;
    enterFlow: number; enterLogo: number; enterDur: number;
  };
  /** Açılış ekran koruyucusu: kesme süresi (sn), ritim değişkenliği (0..1), web'de oynatıcı havuzu,
      QR karesinin kenarı (px) */
  screensaver: { cut: number; variance: number; pool: number; qr: { web: number; mobile: number; margin: number } };
  /** Sitenin herkese açık adresi (QR kodu); boşsa sayfanın kendi adresi */
  site: { publicUrl: string };
  /** Telefonda yatay ekran katmanı: koşul (yatay, dokunmatik, görünür yükseklik < maxHeight px),
      telefon simgesinin yüksekliği (ekran yüksekliğinin oranı), dönüş ve bekleme süreleri (sn) */
  rotate: { maxHeight: number; icon: number; turn: number; hold: number };
  /** Tam ekran ağı: zemin renginde yüzey, kare ızgarada eşkenar dörtgen delikler (ekran koruyucuda yuvarlak) */
  texture: {
    /** Delik aralığı, merkezden merkeze (px) */
    pitch: number;
    /** Yüzeyin kapladığı alan oranı; delik boyu bundan hesaplanır (eşkenar dörtgende en fazla yarı köşegen p/2) */
    cover: number;
  };
  /** Tam ekran videosu */
  video: {
    /** Bütün tam ekran videoları cover boyutunun bu katına büyütülür (oynatıcı yazıları ve gömülü alt yazılar ekran dışında) */
    scale: number;
    /** Büyütmenin dikey merkezi (ekranın üstünden oran); yatayda orta */
    originY: number;
    /** Bitişe bu kadar saniye kala başlangıca sarılır (bitiş ekranına hiç ulaşılmaz) */
    youtubeTail: number;
    /** "baslangic" 0 olan videolar süresinin bu oranından başlar (tam saniyeye yuvarlanır) */
    startRatio: number;
    /** Sesin hedef seviyesi (0–1) */
    volume: number;
    /** Ses yükselme / kısılma eğrisi (GSAP ease adı) */
    soundEase: string;
  };
  /** CustomEase SVG yol tanımları */
  eases: { fade: string };
  /** Saniye */
  durations: {
    /** Tam ekran videosu: oynayınca fotoğraftan videoya geçiş, çıkışta geri geçiş, başlamazsa bekleme sınırı */
    videoIn: number;
    videoOut: number;
    videoTimeout: number;
    /** YouTube: PLAYING geldikten sonra fotoğrafın üstte kalma süresi (oynatıcı yazıları kaybolsun) */
    youtubeHold: number;
    /** Tam ekran videosu: görünür olunca sesin 0'dan hedefe yükselmesi / çıkışta kısılması */
    soundIn: number;
    soundOut: number;
    /** Video görünür olduktan bu kadar sn sonra kendiliğinden galeriye dönülür */
    autoReturn: number;
    /** Ekran koruyucu: belirme, çıkışta kararma */
    ssIn: number;
    ssOut: number;
    /** Yükleme / ekran koruyucu katmanının yukarı kayarak çıkması */
    ldExit: number;
    /** Kendi kendine sunum: ilk başlama için hareketsizlik, ortaya gelen dairenin açılmadan önce bekleme,
        videosuz tam ekran fotoğraf süresi, etkileşimden sonra yeniden başlama */
    presentIdle: number;
    presentOpen: number;
    presentPhoto: number;
    presentResume: number;
    /** Tam ekran başlığı: soldan girip ortada durma, sayacın gecikmesi ve belirmesi, çıkışta sağa kayma */
    titleIn: number;
    counterDelay: number;
    counterIn: number;
    titleOut: number;
    /** Tam ekran: saatin sayaçtan sonraki gecikmesi */
    hourDelay: number;
    /** Kapatma ikonunun belirmesi / kaybolması */
    closeFade: number;
  };
  /** Logo: iki parçalı uzun / kısa logo (çizgileri sola uzar) */
  logo: { long: LogoPart; short: LogoPart; longFit: number };
  templates: Templates;
  strings: {
    surfaceLabel: string;
  };
}
