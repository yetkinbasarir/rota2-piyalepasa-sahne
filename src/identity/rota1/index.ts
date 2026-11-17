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
    /* açık kâğıt zemin; metin ve çizgiler neredeyse siyah; ikincil metin gri */
    background: '#ECEBE8',
    ink: '#111214',
    muted: '#5E6266',
    focus: '#DA00F9',
    /* yatay telefon katmanı: koyu, düz */
    overlay: '#2A2D31',
  },
  /* zeminin üstünde çok hafif kâğıt dokusu */
  paper: { frequency: 0.9, octaves: 2, opacity: 0.05 },

  /* çapraz 3B daire galerisi: ölçüler ekran yüksekliği H'nin (x'ler genişlik W'nin) oranı */
  gallery: {
    perspective: 1600,
    /* ortadaki dairenin merkezi; sağdaki (sonraki) ve soldaki (önceki) komşuya adım */
    web: { center: [0.517, 0.53], next: [0.353, -0.19], prev: [-0.312, 0.11], disc: 0.6 },
    /* mobil: dikeye yakın eğri; çap genişliğin oranı */
    mobile: { center: [0.5, 0.5], next: [0.18, -0.36], prev: [-0.16, 0.34], disc: 0.82 },
    scale: { prev2: 0.62, prev: 0.78, center: 1, next: 1.04, min: 0.2 },
    /* rotateX(28°) rotateY(−22°) rotateZ(−8°); rotateY sol uçta (−2 adım) −30°, sağ uçta (+1 adım) −14° */
    rotate: { x: 28, y: -22, z: -8, yLeft: -30, yRight: -14, leftAt: -2, rightAt: 1 },
    photoZoom: 1.15,
    /* ortadan ±3 adım: 7 daire */
    around: 3,
    colorFade: 0.6,
    float: { y: 0.006, rx: 1.2, min: 5, max: 7, ease: 'sine.inOut' },
    tilt: { max: 7, stiffness: 140, damping: 14 },
    shadow: {
      color: '#111214',
      width: 0.9,
      height: 0.35,
      opacity: 0.22,
      centerOpacity: 0.26,
      blur: 28,
      below: 0.06,
      right: 0.03,
      lift: { shrink: 0.08, blur: 36, opacity: 0.16 },
      tiltShift: 0.01,
    },
    settle: { dur: 0.7, ease: 'power3.out' },
    auto: { every: 6, dur: 1.2, ease: 'power2.inOut' },
    iris: { dur: 0.9, ease: 'power3.inOut' },
    throw: { time: 0.3, max: 4 },
    wheel: { step: 0.25, bias: 0.3, idle: 0.16 },
  },

  /* ekrandaki yazılar ve düğmeler */
  screen: {
    label: { size: 0.0105, track: 0.16 },
    info: { left: 0.012, top: 0.02, width: 0.21, minWidth: 300, title: 0.036, value: 0.017, row: 0.029, counter: 0.015, diamond: 7, mobilePad: 0.02 },
    stage: { size: 0.019, track: 0.18, top: 0.03 },
    caption: { bottom: 0.05, quote: 0.027, lh: 1.05, lines: 2, maxW: 0.42, gap: 0.025 },
    ticket: { d: 0.09, font: 0.018 },
    logo: { h: 0.11, bottom: 0.03 },
    members: { d: 0.075, font: 0.016, gap: 0.012, pad: 0.02, mobileD: 0.11 },
    swap: { shift: 8, stagger: 0.04, total: 0.6 },
  },

  /* sayaç noktalı: ay.gün.saat.dakika.saniye */
  counterFormat: { sep: '.' },
  /* kenardaki daireler duotone: koyu ve açık ton */
  duotone: { dark: '#2A2D31', light: '#ECEBE8' },

  /* Fotoğrafı olmayan öğelerin rengi (ROTA1 artboard renkleri); yükleme ekranının nokta paleti */
  palette: ['#64AADC', '#9FC54E', '#6AB27A', '#4070B8', '#C9222A'],

  /* Adobe Fonts kiti fpj2hxb. Ağırlık / aile değişikliği yalnızca burada yapılır. */
  fonts: {
    stylesheets: ['https://use.typekit.net/fpj2hxb.css'],
    roles: {
      /* başlık, alıntı ve değerler 400; etiketler 700 */
      light: { family: '"comma-serif", serif', weight: 400 },
      bold: { family: '"comma-serif", serif', weight: 700 },
      /* sayaç: config-mono-vf wght 300; tam ekran sayacı 500 */
      counter: { family: '"config-mono-vf", monospace', weight: 300, variation: '"wght" 300' },
      counterStrong: { family: '"config-mono-vf", monospace', weight: 500, variation: '"wght" 500' },
    },
  },

  /* Tam ekran başlığı: ekran genişliğinin %11'i (en fazla %90 genişlik); sayaç başlığın yarısı, arası 0.15 */
  fullTitle: {
    size: 0.11,
    maxWidth: 0.9,
    counter: 0.5,
    gap: 0.15,
    stageBasis: 0.461,
    pad: 0.034,
    closeSize: 56,
  },

  /* Yükleme ekranı: nokta matrisi logo (2) ya da içi dolan logo (1); en az 1.2 sn */
  loader: {
    logoAnim: 2, minTime: 1.2, base: '#2a2a2a',
    /* büyük logo: genişlik en fazla ekranın %50'si (mobil %86), yükseklik en fazla %45'i */
    logoW: { web: 0.5, mobile: 0.86 }, logoH: 0.45,
    /* daire paleti (ROTA2 griler) */
    dotPalette: ['#636D74', '#8B959B', '#B4BCC1', '#D5DADD', '#4A5157'],
    /* opak, düz, keskin daireler: temel yarıçap logo yüksekliğinin %4'ü, 0.15–5 katı; kuvvet dağılımı
       (çok sayıda küçük, az sayıda çok büyük); kalan boşlukları küçükler doldurur; yarıçapın %15'i kadar süzülür */
    blobBase: 0.04, blobMin: 0.15, blobMax: 5, blobSkew: 4, blobFill: 1.2,
    blobDrift: 0.15,
    /* noktalar zamana bağlı: 0–1.8 sn rastgele gecikme, 0.6–1.4 sn büyüme; hepsi en fazla 2.4 sn, hızlanarak */
    dotDelay: 1.8, dotGrowMin: 0.6, dotGrowMax: 1.4, dotTotal: 2.4,
    /* ekran koruyucuya sert flaşla geçilir: 3 kare (~50 ms) düz beyaz, geçişsiz kesilir; akış 1.08'den,
       logo 1.04'ten 0.6 sn'de (expo.out) oturur */
    dotSat: 100, dotLight: 50, dotHueMerge: 12, flashHold: 0.05,
    enterFlow: 1.08, enterLogo: 1.04, enterDur: 0.6,
  },
  /* Açılış ekran koruyucusu: 1 sn kesmeler, sabit ritim; web'de 4 oynatıcılık havuz; QR karesi */
  screensaver: { cut: 1, variance: 0, pool: 4, qr: { web: 272, mobile: 192, margin: 1 } },
  /* QR kodunun göstereceği herkese açık adres (boşsa sayfanın kendi adresi) */
  site: { publicUrl: '' },

  /* Telefonda yatay ekran kapalı: yatay + dokunmatik + görünür yükseklik < 500px */
  rotate: { maxHeight: 500, icon: 0.28, turn: 1.6, hold: 1.2 },

  /* Tam ekran delikli doku: 4px aralık, siyah yüzey %30 */
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
    textureIn: 0.6,
    textureOut: 0.4,
    autoReturn: 15,
    /* ekran koruyucu: belirme, kararma */
    ssIn: 0.6,
    ssOut: 0.4,
    /* çıkış: katman yukarı kayar */
    ldExit: 1.0,
    /* kendi kendine sunum */
    presentIdle: 8,
    presentOpen: 5,
    presentPhoto: 8,
    presentResume: 20,
    /* tam ekran başlığı ve sayacı */
    titleIn: 1.6,
    counterDelay: 0.2,
    counterIn: 0.6,
    titleOut: 0.5,
    /* tam ekran: saat sayaçtan 0.15 sn sonra; sahne etiketi 0.6 sn */
    hourDelay: 0.15,
    stageIn: 0.6,
    closeFade: 0.3,
  },

  /* iki parçalı logo: çizgiler x = 0'dan başlar, sola uzar. Uzun logo hedef yükseklikte kullanılabilir
     genişliğin %70'ine sığıyorsa uzun, değilse kısa; mobilde hep kısa */
  logo: {
    long: { svg: logoLong, lines: [14.31, 169.18, 324.05, 478.92], thick: 3.94 },
    short: { svg: logoShort, lines: [14.53, 169.53, 324.53, 479.53, 634.53], thick: 4 },
    longFit: 0.7,
  },
  templates,

  strings: {
    surfaceLabel: 'Piyalepaşa Sahne programı',
  },
};
