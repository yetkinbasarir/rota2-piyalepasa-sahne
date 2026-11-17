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
  /** Sıra (0'dan) — mozaikteki dağılım bu sıraya göre yapılır */
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
  /** Sabit sıralı künye (kaynak sırası korunur) */
  credits: CreditRow[];
  cast: CastMember[];
  /** Yalnızca veri modelinde; arayüzde gösterilmez */
  archive: { referenceProduction: string; sources: string[]; note: string };
  /** Kaynak fotoğraflar */
  photoA?: Photo;
  photoB?: Photo;
  extraPhotos?: Photo[];
  /** Kartta gösterilen fotoğraf: A, yoksa B */
  photo?: Photo;
  /** Öğenin rengi: veride elle girilmiş "renk", yoksa fotoğraftan çıkarılan; fotoğraf yoksa boş (kimlik paleti) */
  color?: string;
  /** Fotoğrafın odak noktası (yüzde): veride elle girilmiş "odak", yoksa yüz algılama / attention.
      faceTop / faceH: seçilen yüz kutusunun üst kenarı ve yüksekliği (yüzde; yalnızca algılanan yüzlerde) */
  focus: { x: number; y: number; faceTop?: number; faceH?: number };
  /** İsteğe bağlı video döngüsü; varsa birimde fotoğrafın yerine oynar */
  video?: VideoLoop;
  /** Tam ekran videosu: yalnızca tam ekranda, fotoğrafın arkasında yüklenip oynar */
  fullVideo?: FullVideo;
  /** videos.json'daki yedek girdi (şimdilik kullanılmıyor) */
  fullVideoBackup?: FullVideo;
  /** Örnek değerler (detay ve bilet ekranı için); at: temsillerin zaman damgaları (ms) */
  sample: { dates: string[]; time: string; price: number; at: number[] };
}

/* ---------- şablon bağlamı ---------- */
export interface MediaOptions {
  /** CSS piksel olarak gösterim genişliği (srcset sizes için) */
  width: number;
  /** Video varsa onu kullan */
  video?: boolean;
  className?: string;
}

export interface TemplateContext {
  mobile: boolean;
  vw: number;
  vh: number;
  /** Birim genişliği / yüksekliği (px) */
  W: number;
  H: number;
  /** Fotoğraf / video işaretlemesi (motor sağlar) */
  media(show: Show, opts: MediaOptions): string;
  /** Satır içi logo; genişlik px */
  logo(width: number, className?: string): string;
  /** Geri sayımın başlangıç değerleri [ay, gün, saat, dakika, saniye]; motor her saniye
      [data-cd="<k>"] içindeki 14 karakter span'ını (her konum bir span) günceller */
  countdown(show: Show): number[];
  esc(s: string): string;
}

export interface TicketState {
  sel: number;
  qty: number;
  message: string;
}

export interface Templates {
  /** Kartın renk kutusu içeriği (kart genişliği w, renk kutusu yüksekliği h px):
      .nm isim (sol üst), .cdw sayaç sarmalayıcısı (kutunun altına yerleşir) */
  card(show: Show, w: number, h: number, ctx: TemplateContext): string;
  /** Açılmış öğenin renk paneli (w × h px): başlık, tanıtım, Video / Detay / Bilet Al / Paylaş, sayaç.
      Belirme sırası için öğeler .pl sınıfı taşır; düğmeler data-act (video, detail, ticket, share). */
  panel(show: Show, w: number, h: number, ctx: TemplateContext): string;
  /** Web'de açılmış öğenin künyesi (fotoğraf alanını kaplar, w × h px): künye satırları ve Oynayanlar.
      İç boşluk ve punto panelinkiyle aynı (panel genişliği pw); .knl liste CSS columns ile yayılır */
  credits(show: Show, w: number, h: number, pw: number, ctx: TemplateContext): string;
  /** Açılmış hâlin metin paneli: tanıtım, künye, oynayanlar */
  textPanel(show: Show, ctx: TemplateContext): string;
  /** Bilet ekranı (şimdilik devre dışı) */
  ticket(show: Show, state: TicketState, ctx: TemplateContext): string;
  /** Tam ekran başlığı ve sayacı: .fst-t başlık (tek satır), .fst-c sayaç ([data-cd]) */
  fullTitle(show: Show, ctx: TemplateContext): string;
  /** Tam ekranın üst ortasındaki sahne etiketi (panel genişliği w'ye göre boyut); sahne yoksa '' */
  stageLabel(show: Show, w: number, ctx: TemplateContext): string;
  /** Alt bandın sağındaki düğmeler (panel genişliği w'ye göre boyut; scale ek küçültme); data-band */
  bandButtons(w: number, scale: number, ctx: TemplateContext): string;
  /** Kapatma ikonu: daire içinde × (tek inline SVG; çizgi kalınlığı üye düğmelerinin konturu) */
  closeIcon(ctx: TemplateContext): string;
  /** Renk zemini üzerindeki yazı rengi */
  inkOn(color: string): string;
}

/* ---------- kimlik ---------- */
export interface FontRole {
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  letterSpacing?: string;
  /** Değişken font eksenleri (ör. '"wght" 200') */
  variation?: string;
}

export interface TypeSize {
  /** CSS uzunluk (clamp/vw olabilir) */
  size: string;
  /** Satır aralığı oranı; taban ızgarasının birimi = size × lineHeight */
  lineHeight: number;
}

/** Uzayıp kısalabilen logonun bir parçası: SVG, yatay çizgilerin merkez y değerleri ve kalınlığı (viewBox birimi) */
export interface LogoPart {
  svg: string;
  lines: number[];
  thick: number;
}

export interface Identity {
  id: string;
  name: string;
  colors: {
    background: string;
    paper: string;
    ink: string;
    focus: string;
    /** İkincil çizgi rengi */
    line?: string;
    /** Alt / üst bant rengi ve opaklığı */
    band?: string;
    bandAlpha?: number;
    /** Verilirse bütün bilet kartlarının ve açılmış öğe panelinin rengi (fotoğraftan çıkarılan renk kullanılmaz) */
    card?: string;
  };
  /** Grid fotoğraflarının duotone eşlemesi (SVG filtresi): koyu ve açık ton */
  duotone: { dark: string; light: string };
  /** Renk kutularının paleti; yan yana iki öğe aynı rengi almaz */
  palette: string[];
  fonts: {
    stylesheets: string[];
    /** Yalnızca iki metin ağırlığı (light, bold) + büyük başlık */
    roles: { coverTitle: FontRole; light: FontRole; bold: FontRole; counter: FontRole; counterStrong?: FontRole };
  };
  /** Detay, künye ve bilet katmanlarının tek puntosu ve satır aralığı (taban ızgarası) */
  type: { web: TypeSize; mobile: TypeSize };
  /** Bilet kartı duvarı */
  wall: {
    /** En alttaki siyah bant: ekran yüksekliğinin oranı; logo bandın içinde sol altta */
    band: { web: number; mobile: number };
    /** Mobil (tek kolon): üst bant yüksekliği (px, üst güvenli alan hariç) ve logo / düğme boşluğu (px) */
    mobileBand: number;
    mobileLogoPad: number;
    /** Mobil açılmış öğe: fotoğraf yüksekliği (görünür alan yüksekliğinin oranı) */
    mobilePhoto: number;
    /** Mobil renk paneli: tanıtım metni ile düğmeler arası (panel iç boşluğunun katı) */
    mobileIntroGap: number;
    /** Mobil renk paneli: başlık, tanıtım metni ve künye puntosu (px) */
    mobileBody: number;
    /** Kapatma ikonu (grid'e dönüş): web'de çap (px); mobilde çap üst banttaki logo yüksekliği */
    closeSize: number;
    /** Logonun bant içindeki üst, alt ve sol boşluğu (kartlar arası boşluğun katı); logo yüksekliği = bant − 2 × boşluk */
    logoPad: number;
    /** Kart, satır ve kenar boşluğu (px) */
    gap: number;
    /** Satır sayısı */
    rows: number;
    /** Kart oranı (genişlik / yükseklik), her ekran genişliğinde sabit; kart genişliği = yükseklik × oran */
    cardRatio: number;
    /** Ortada görünen tam kolon sayısının üst sınırı */
    maxCols: number;
    /** Otomatik ileri hareket (sağdan sola): uzak hedeflerde sürenin en fazla katı */
    moveMaxFactor: number;
    /** Mıknatıs hareketi: başlangıçtaki boşluk (normal boşluğun katı) ve oturuş eğrisi (GSAP ease) */
    magnetGap: number;
    magnetEase: string;
    /** Fotoğrafın kart yüksekliğindeki payı; kalanı renk kutusu */
    photo: number;
    /** Perforaj: renk kutusunun her kenarında dikey ortadaki tek dairenin çapı (kart genişliğinin oranı); merkez kartlar arası boşluğun ortasında */
    perforation: number;
    /** Sürekli akış hızı (kolon / saniye), sağdan sola */
    drift: number;
    /** Fare grid'in üzerindeyken akış hızı (normal hızın oranı) */
    driftHover: number;
    /** Grid'deki tek renkli fotoğrafın kontrastı */
    /** Görsellerde yavaş zoom: ölçek aralığı ve öğeden öğeye değişen süre (sn), yoyo, sine.inOut */
    zoom: { from: number; to: number; min: number; max: number };
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
  };
  /** Grid kartlarında parlama: kartın tamamından geçen eğik, yumuşak kenarlı beyaz şerit (soft-light) */
  shine: {
    /** Parlama dalgası açık mı */
    enabled: boolean;
    /** Şeridin en parlak yerindeki beyaz opaklığı */
    opacity: number;
    /** Şerit genişliği (kart genişliğinin oranı) */
    width: number;
    /** Eğim (derece, dikeyden) */
    angle: number;
  };
  /** Yükleme ekranı: logo animasyonu (1: içi dolan, 2: nokta matrisi), en kısa görünme süresi (sn),
      içi dolan logonun koyu zemini; nokta matrisinin aralığı (logo yüksekliğinin oranı, en az px) ve
      en büyük nokta yarıçapı (aralığın oranı) */
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
    /** Nokta renkleri: bilet renklerinin tonu, doygunluk ve açıklık (%) bu değerlere çekilir; birbirine
        dotHueMerge dereceden yakın tonlar tek renge indirgenir. Ekran koruyucuya geçiş: son nokta tamamlandığı
        karede ekran düz beyaz olur, flashHold sn kalıp geçişsiz kesilir; ardından akış ve logo küçülerek oturur */
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
  /** Tam ekran delikli doku: siyah yüzeyde kare ızgaraya dizilmiş yuvarlak delikler */
  texture: {
    /** Delik aralığı, merkezden merkeze (px) */
    pitch: number;
    /** Siyah yüzeyin kapladığı alan oranı; delik çapı bundan hesaplanır */
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
  eases: { move: string; open: string; page: string; fade: string };
  /** Saniye */
  durations: {
    /** Açılma / kapanma (itme ile iç içe) */
    open: number;
    /** Açılmada parçaların sırası: renk kutusu gecikmesi, metin ve butonların gecikmesi ve aralığı */
    colorDelay: number;
    textDelay: number;
    lineStagger: number;
    /** İtmede kolon başına gecikme (yakındakiler önce) */
    pushStagger: number;
    /** Fotoğrafın tam ekrana büyümesi */
    fullscreen: number;
    /** Tam ekran videosu: oynayınca fotoğraftan videoya geçiş, çıkışta geri geçiş, başlamazsa bekleme sınırı */
    videoIn: number;
    videoOut: number;
    videoTimeout: number;
    /** YouTube: PLAYING geldikten sonra fotoğrafın üstte kalma süresi (oynatıcı yazıları kaybolsun) */
    youtubeHold: number;
    /** Tam ekran videosu: görünür olunca sesin 0'dan hedefe yükselmesi / çıkışta kısılması */
    soundIn: number;
    soundOut: number;
    /** Tam ekran delikli dokunun belirmesi / kaybolması */
    textureIn: number;
    textureOut: number;
    /** Açılmış öğenin fotoğraf dokusu: açılma bitince belirme / hareketten hemen önce kaybolma */
    photoTextureIn: number;
    photoTextureOut: number;
    /** Video görünür olduktan bu kadar sn sonra kendiliğinden grid'e dönülür */
    autoReturn: number;
    /** Ekran koruyucu: belirme, çıkışta kararma; logonun site logosunun yerine taşınması */
    ssIn: number;
    ssOut: number;
    /** Yükleme / ekran koruyucu katmanının yukarı kayarak çıkması */
    ldExit: number;
    /** Kendi kendine sunum: ilk başlama için hareketsizlik, grid'de bekleme, duvarın kayması,
        açık kalma, videosuz tam ekran fotoğraf süresi, etkileşimden sonra yeniden başlama */
    presentIdle: number;
    presentGrid: number;
    presentMove: number;
    presentOpen: number;
    presentPhoto: number;
    presentResume: number;
    /** Tam ekran başlığı: soldan girip ortada durma, sayacın gecikmesi ve belirmesi, çıkışta sağa kayma */
    titleIn: number;
    counterDelay: number;
    counterIn: number;
    titleOut: number;
    /** Tam ekran: saatin sayaçtan sonraki gecikmesi; sahne etiketinin belirmesi */
    hourDelay: number;
    stageIn: number;
    /** Ekran yeniden boyutlanınca kartların yeni yerlerine kayması */
    columnShift: number;
    /** Mobil: tam ekrana geçerken renk panelinin aşağı kayıp kaybolması */
    panelOut: number;
    /** Künyenin fotoğraf alanına kayması / geri inmesi */
    credits: number;
    /** Uzun künyenin kaydırma çubuğunun belirmesi */
    scrollbarIn: number;
    /** Mıknatıs hareketi: bir kartın oturuşu ve merkezden dışa kartlar arası gecikme */
    magnet: number;
    magnetStagger: number;
    /** Sayaç ↔ tarih: konumlar arası gecikme, bir konumun dönme süresi, sayaç / tarih gösterim süreleri,
        grid dalgasının ekranı soldan sağa geçişi */
    flipStagger: number;
    flipSpin: number;
    countShow: number;
    dateShow: number;
    flipWave: number;
    /** Parlama: şeridin bir karttan geçişi, dalganın ekranı soldan sağa geçişi, alt satır gecikmesi, tekrar aralığı */
    shine: number;
    shineSweep: number;
    shineRow: number;
    shineEvery: number;
    /** Klavye ile bir kolon kaydırma ve bırakınca kolona oturma */
    step: number;
    /** Girişten sonra boşta akışın yeniden başlaması */
    /** Akış hızı geçişleri (yavaşlama, durma, kalkış) */
    driftRamp: number;
    /** Mobil metin kutusu kaydırma adımı */
    scroll: number;
  };
  /** Logo: eski tek parça (logoHtml için) ve iki parçalı uzun / kısa logo (çizgileri sola uzar) */
  logo: { svg: string; long: LogoPart; short: LogoPart; longFit: number };
  templates: Templates;
  strings: {
    surfaceLabel: string;
  };
}
