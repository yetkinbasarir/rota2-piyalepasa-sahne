/* ROTA1 kimliği — Piyalepaşa Sahne (ROTA2 görünümü: çapraz 3B daire galerisi).
   Kimliğe ait her şey burada: galeri ve ekran ölçüleri, renkler, logo, font rolleri, eğriler,
   süreler ve şablonlar. Motor bu nesneyi okur; ikinci bir kimlik aynı arayüzle yeni bir klasörde
   tanımlanıp main.ts'te seçilir. */
import type { Identity } from '../../engine/types';
import { templates } from './templates';
import logoLong from './logo-long.svg?raw';
import logoShort from './logo-short.svg?raw';
import './styles.css';

export const rota1: Identity = {
  id: 'rota1',
  name: 'Piyalepaşa Sahne',

  colors: {
    /* açık kâğıt zemin */
    background: '#ECEBE8',
    focus: '#DA00F9',
    /* yatay telefon katmanı: koyu, düz */
    overlay: '#2A2D31',
  },
  /* zeminin üstünde çok hafif kâğıt dokusu */
  paper: { frequency: 0.9, octaves: 2, opacity: 0.05 },

  /* çapraz 3B daire galerisi: ölçüler ekran yüksekliği H'nin (belirtilenler genişlik W'nin) oranı */
  gallery: {
    perspective: 1600,
    layout: {
      /* ana daire (p = 0): sınır kutusunun merkezi; dikeyde önceki konum (mobilde önceki gibi ortada) */
      mainX: { web: 0.54, mobile: 0.5 },
      mainY: { web: 0.518, mobile: 0.608 },
      /* bütün grup (daireler ve gölgeleri) 0.04H yukarıda; aralık ve ölçüler aynı */
      lift: { web: 0.04, mobile: 0.04 },
      /* temel çap: üye düğmelerinin altı ile Bilet Al'ın üstündeki alt sınır arasında 0.03H boşlukla en büyük, en
         fazla 0.48W (mobil 0.82W); ana daire bunun %15 büyüğü */
      gap: 0.03,
      cap: { web: 0.48, mobile: 0.82 },
      mainScale: 1.15,
      /* s(p): p = −3 … +3 */
      keys: [0.18, 0.3, 0.48, 1, 0.88, 0.5, 0.32],
      /* masaüstü: ana dairenin sağ kenarı sağ sütunun 0.02W solunda (grup sola kayar); bütün komşular arası tek
         boşluk g (negatif olabilir), p = −3'ün merkezi x = 0'a gelecek şekilde seçilir */
      columnGap: 0.02,
      /* masaüstü: dairelerin sığdırıldığı üst sınır (önceki üye düğmelerinin altı; ölçüler değişmesin) */
      fitTop: 0.095,
      /* p = −3 logoya değecekse alt kenarı logonun 0.02H üstünde */
      logoClear: 0.02,
      /* başlangıç köşegeni: sola bir adımda (−0.312W, +0.11H); sığmazsa yatıklaştırılır */
      slope: [-0.312, 0.11],
    },
    /* rotateX(28°) rotateY(−22°) rotateZ(−8°); rotateY sol uçta (−2 adım) −30°, sağ uçta (+1 adım) −14° */
    rotate: { x: 28, y: -22, z: -8, yLeft: -30, yRight: -14, leftAt: -2, rightAt: 1 },
    photoZoom: 1.15,
    /* ortadan ±3 adım: 7 daire */
    around: 3,
    /* bütün daireler tam renkli; alan derinliği: |p| = 0 / 1 / 2 / 3'te opaklık 1 / 0.75 / 0.5 / 0.3, bulanıklık
       0 / 0.003W / 0.006W / 0.009W (mobilde yarısı), 0.5px adımlarla; gölge aynı opaklık katını alır */
    /* sağda p = +1 opaklık 0.45 (0.75 yerine); p ≥ +2 aynı oranda (0.6×) */
    focus: { opacity: [1, 0.75, 0.5, 0.3], opacityRight: [1, 0.45, 0.3, 0.18], blur: [0, 0.003, 0.006, 0.009], mobileBlur: 0.5, step: 0.5 },
    float: { y: 0.006, rx: 1.2, min: 5, max: 7, ease: 'sine.inOut' },
    tilt: { max: 7, stiffness: 140, damping: 14 },
    /* ana daire düzleşir: 1.08, 0.5 sn power2.out; gölge daha yuvarlak */
    flat: { scale: 1.08, dur: 0.5, ease: 'power2.out', shadowHeight: 0.5 },
    shadow: {
      color: '#111214',
      width: 0.9,
      height: 0.35,
      /* belirgin: opaklık 1.6×, bulanıklık 0.75× (0.22 / 0.26 / 28 / 36 / 0.16'dan) */
      opacity: 0.352,
      mainOpacity: 0.416,
      blur: 21,
      below: 0.06,
      right: 0.03,
      lift: { shrink: 0.08, blur: 27, opacity: 0.256 },
      tiltShift: 0.01,
    },
    settle: { dur: 0.7, ease: 'power3.out' },
    auto: { every: 6, dur: 1.2, ease: 'power2.inOut' },
    /* açık hâlin ağı: ROTA1'in tam ekran dokusu (texture: 4px aralık, %30 siyah, yuvarlak delikler), tam opak */
    mesh: { opacity: 1 },
    /* açılma: ana daire düzleşip yerinden ekranı kaplayana kadar büyür (0.9 sn power3.inOut), diğer daireler yerinde;
       video ve ağ 0.6 sn'de başlayıp 0.5 sn'de belirir. Logo, başlık ve altındaki çizgi ile × açılışla birlikte
       0.5 sn'de beyaza döner; aynı anda uzun logo sağdan kısa logonun genişliğine kırpılarak kaybolur, kısa logo
       aynı yerde belirir (power2.inOut). Bilet Al sütunla birlikte kaybolur. Kapanma tam tersi */
    open: { dur: 0.9, ease: 'power3.inOut', videoAt: 0.6, videoDur: 0.5, colorDur: 0.5, color: '#FFFFFF', logoEase: 'power2.inOut' },
    throw: { time: 0.3, max: 4 },
    wheel: { step: 0.25, bias: 0.3, idle: 0.16 },
  },

  /* kimlik slayt gösterisi (logoya tıklayınca): 5 sn'de bir, yatay itme 0.8 sn power2.inOut, açılma / kapanma
     0.5 sn; denetimler beyaz %60 (üzerindeyken %100), kenardan 0.025W, 3px çizgi (sitedeki × kendi değerinde),
     yan üçgenler 84px, duraklat 48px; sol altta dönüş oku 60px (görünmez 12px tıklama payı); açıkken site logosu gizli */
  slides: {
    interval: 5,
    dur: 0.8,
    ease: 'power2.inOut',
    fade: 0.5,
    mobileMax: 768,
    background: '#000000',
    color: '#FFFFFF',
    stroke: 3,
    opacity: { idle: 0.6, hover: 1 },
    margin: 0.025,
    arrow: { h: 84, ratio: 0.5 },
    pause: 48,
    back: { h: 60, hit: 12 },
    swipe: 0.2,
    swipeSpeed: 0.5,
  },

  /* ekrandaki yazılar ve düğmeler */
  screen: {
    /* bütün yazılar, logolar ve düğme yazıları saf siyah */
    text: '#000000',
    /* yazı rolleri (Adobe kiti fpj2hxb): başlık ogg-text 700 (içerikteki gibi, büyük harfe çevrilmez); tanıtım ve
       künye değerleri ogg-text 400; etiketler ve düğmeler config-mono-vf wght 500 (büyük harf); künyedeki tarih,
       saat ve sayaç config-mono-vf wght 300 */
    type: {
      title: { family: '"ogg-text", sans-serif', weight: 700, style: 'normal' },
      body: { family: '"ogg-text", sans-serif', weight: 400, style: 'normal' },
      label: { family: '"config-mono-vf", monospace', weight: 500, variation: '"wght" 500' },
      number: { family: '"config-mono-vf", monospace', weight: 300, variation: '"wght" 300' },
    },
    /* okuma metni (tanıtım, künye değerleri): clamp(16px, 1.15vw, 19px), satır aralığı 1.45 */
    body: { min: 16, vw: 0.0115, max: 19, lh: 1.45 },
    /* etiketler (künye etiketleri, tür satırı, sahne adı, düğme yazıları): clamp(10px, 0.75vw, 12px), 0.08em */
    label: { min: 10, vw: 0.0075, max: 12, track: 0.08 },
    /* sayılar: "H" harfinin yüksekliği okuma metninkine eşit (fontlar yüklenince canvas ile ölçülür) */
    number: { capOf: 'H' },
    /* sağ sütun (0.21W): başlık (0.028W, mobilde 0.075W; en fazla 2 satır, sığmazsa küçülür), aynalı logo çizgisi,
       tam tanıtım, logo çizgisi, künye satırları. Başlık ve tanıtımın altındaki çizgilerin üstünde ve altında
       0.0064W (mobilde 0.015W). Başlığın büyük harf üstü logonun üstüyle aynı çizgide. Açık hâlde başlık ve altındaki
       çizgi yerinde kalıp beyaza döner, sütunun geri kalanı kaybolur */
    info: {
      width: 0.21, minWidth: 300, title: { web: 0.028, mobile: 0.075 }, titleLh: 1.05,
      titleLines: 2, ruleGap: { web: 0.0064, mobile: 0.015 }, mobilePad: 0.02,
    },
    stage: { gap: 0.015 },
    /* Bilet Al: ana dairenin altında ortalı, alttan 0.04H; açık hâlde kaybolur. Üye Ol / Giriş de aynı çapta
       (masaüstü). × açık hâlde sağ altta (sağdan sütunun sağ boşluğu, alttan Üye Ol / Giriş'inki) */
    ticket: { d: 0.09, bottom: 0.04 },
    button: { fill: '#FFFFFF', fit: 0.68 },
    /* uzun ve kısa logo sol üstte, sol kenarı ekranın sol kenarında, aynı yükseklikte (0.216H), üstten 0.04H.
       0.012W kenar boşluğu: sağ sütunun sağ kenarı sağdan, Üye Ol / Giriş soldan, × sağdan */
    logo: { h: 0.216, top: 0.04, letter: 0.012, mobileH: 0.11, mobileBottom: 0.03 },
    /* Üye Ol / Giriş: masaüstünde sol altta (soldan logonun harf boşluğu, alttan Bilet Al'ınki); mobilde sağ üstte */
    members: { d: 0.09, gap: 0.012, pad: 0.02, mobileD: 0.11 },
    swap: { shift: 8, stagger: 0.04, total: 0.6 },
  },

  /* sayaç noktalı: ay.gün.saat.dakika.saniye */
  counterFormat: { sep: '.' },


  /* Adobe Fonts kiti fpj2hxb (comma-serif 100–900, config-mono-vf 200–700). Yazı rolleri screen.type'ta */
  fonts: {
    stylesheets: ['https://use.typekit.net/fpj2hxb.css'],
  },

  /* Kapatma ikonu (×): kenar boşluğu (H oranı; yükleme ekranı da kullanır) ve çapı (px) */
  closeButton: { pad: 0.034, size: 56 },

  /* Yükleme ekranı: nokta matrisi logo (2) ya da içi dolan logo (1); en az 1.2 sn */
  /* ilk ekran: düz siyah, logo beyaz (galerideki yerinde). Süzülen daireler: web 14 (0.04–0.16W), mobil 8
     (0.10–0.34W), az büyük çok küçük; opaklık 0.45 (en küçük) – 1 (en büyük), bulanıklık 0.004W – 0; hız
     0.01–0.03W/sn (büyükler hızlı, ±%15), dik salınım 0.01W, 6–12 sn; 1.5 sn içinde rastgele sırayla 0.5 sn'de
     belirir. Çıkış: zemin, daireler ve QR 0.9 sn power3.inOut yukarı kayar. QR karesi 272px (yalnızca web) */
  loader: {
    background: '#000000', logoColor: '#FFFFFF',
    count: { web: 14, mobile: 8 },
    size: { web: [0.04, 0.16], mobile: [0.1, 0.34] }, sizeSkew: 2.2,
    opacity: [0.45, 1], blur: 0.004,
    speed: [0.01, 0.03], speedJitter: 0.15,
    sway: { amp: 0.01, period: [6, 12] },
    fadeIn: { total: 1.5, each: 0.5 },
    exit: { dur: 0.9, ease: 'power3.inOut' },
    qr: { size: 272, margin: 1 },
  },
  /* QR kodunun göstereceği herkese açık adres (boşsa sayfanın kendi adresi) */
  site: { publicUrl: '' },

  /* Telefonda yatay ekran kapalı: yatay + dokunmatik + görünür yükseklik < 500px */
  rotate: { maxHeight: 500, icon: 0.28, turn: 1.6, hold: 1.2 },

  /* Açık hâlin ağı (ROTA1 ile aynı): 4px aralık, yuvarlak delikler, siyah yüzey %30 */
  texture: {
    pitch: 4,
    cover: 0.3,
  },

  /* Tam ekran videosu: oynatıcı yazılarını ve gömülü alt yazıları gizleme */
  video: {
    /* cover boyutunun 1.5 katı; merkez yatayda orta, dikeyde üstten %42 (alttan daha çok kesilir) */
    scale: 1.5,
    originY: 0.42,
    youtubeTail: 3,
    /* "baslangic" 0 olan videolar sürenin %45'inden başlar (ilk kare ve jenerik görünmez) */
    startRatio: 0.45,
    /* ses: görünür olunca 0'dan %80'e yumuşakça yükselir */
    volume: 0.8,
    soundEase: 'sine.inOut',
  },

  /* CustomEase yolları */
  eases: {
    fade: 'M0,0 C0.4,0 0.2,1 1,1',
  },

  durations: {
    videoIn: 0.8,
    videoOut: 0.5,
    videoTimeout: 8,
    youtubeHold: 4,
    soundIn: 2.5,
    soundOut: 0.5,
    autoReturn: 15,
    /* kendi kendine sunum */
    presentIdle: 8,
    presentOpen: 5,
    presentPhoto: 8,
    presentResume: 20,
    closeFade: 0.3,
  },

  /* iki parçalı logo (Rota2_long / Rota2_short): çizgiler x = 0'dan başlar; aynı yükseklik. Uzun logo hedef yükseklikte kullanılabilir
     genişliğin %70'ine sığıyorsa uzun, değilse kısa; mobilde hep kısa */
  logo: {
    long: { svg: logoLong, lines: [14.31, 169.18, 324.05, 478.92], thick: 3.94 },
    short: { svg: logoShort, lines: [14.532, 169.532, 324.532, 479.532], thick: 4 },
    longFit: 0.7,
  },
  templates,

  strings: {
    surfaceLabel: 'Piyalepaşa Sahne programı',
  },
};
