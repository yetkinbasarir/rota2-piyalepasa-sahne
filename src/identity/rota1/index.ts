/* ROTA1 kimliği — Piyalepaşa Sahne (ROTA2 görünümü: çapraz 3B daire galerisi).
   Kimliğe ait her şey burada: galeri ve ekran ölçüleri, renkler, logo, font rolleri, eğriler,
   süreler ve şablonlar. Motor bu nesneyi okur; ikinci bir kimlik aynı arayüzle yeni bir klasörde
   tanımlanıp main.ts'te seçilir. */
import type { Identity } from '../../engine/types';
import { templates } from './templates';
import logoLong from './logo-long.svg?raw';
import logoShort from './logo-short.svg?raw';
import { SURFACE } from './surface';
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
      /* temel çap: alıntının altı ile sahne adının üstü arasında 0.03H boşlukla en büyük, en fazla 0.48W (mobil
         0.82W); ana daire bunun %15 büyüğü (alıntı ve sahne adıyla biraz örtüşür) */
      gap: 0.03,
      cap: { web: 0.48, mobile: 0.82 },
      mainScale: 1.15,
      /* s(p): p = −3 … +3 */
      keys: [0.18, 0.3, 0.48, 1, 0.88, 0.5, 0.32],
      /* p = +1 ile ana daire arası (ekrandaki biçimler, köşegen boyunca) 0.02W */
      rightGap: 0.02,
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
    colorFade: 0.6,
    float: { y: 0.006, rx: 1.2, min: 5, max: 7, ease: 'sine.inOut' },
    tilt: { max: 7, stiffness: 140, damping: 14 },
    /* ana daire düzleşir: 1.08, 0.5 sn power2.out; gölge daha yuvarlak */
    flat: { scale: 1.08, dur: 0.5, ease: 'power2.out', shadowHeight: 0.5 },
    shadow: {
      color: '#111214',
      width: 0.9,
      height: 0.35,
      opacity: 0.22,
      mainOpacity: 0.26,
      blur: 28,
      below: 0.06,
      right: 0.03,
      lift: { shrink: 0.08, blur: 36, opacity: 0.16 },
      tiltShift: 0.01,
    },
    settle: { dur: 0.7, ease: 'power3.out' },
    auto: { every: 6, dur: 1.2, ease: 'power2.inOut' },
    /* açık hâlin ağı: 6px hücre, delikler arası 1px zemin grisi (delik köşegeni 5px), opaklık 0.9 */
    mesh: { cell: 6, line: 1, opacity: 0.9 },
    /* açılma: her şey aynı anda, 0.8 sn power3.in (dönüş power3.out); video 0.3 sn'de başlayıp 0.6 sn'de belirir */
    open: { dur: 0.8, easeIn: 'power3.in', easeOut: 'power3.out', videoAt: 0.3, videoDur: 0.6 },
    throw: { time: 0.3, max: 4 },
    wheel: { step: 0.25, bias: 0.3, idle: 0.16 },
  },

  /* kimlik slayt gösterisi (logoya tıklayınca): 5 sn'de bir, yatay itme 0.8 sn power2.inOut, açılma / kapanma
     0.5 sn; denetimler beyaz %60 (üzerindeyken %100), kenardan 0.025W, yan üçgenler 28px, duraklat 16px */
  slides: {
    interval: 5,
    dur: 0.8,
    ease: 'power2.inOut',
    fade: 0.5,
    mobileMax: 768,
    background: '#000000',
    color: '#FFFFFF',
    stroke: SURFACE.line,
    opacity: { idle: 0.6, hover: 1 },
    margin: 0.025,
    arrow: { h: 28, ratio: 0.5 },
    pause: 16,
    swipe: 0.2,
    swipeSpeed: 0.5,
  },

  /* ekrandaki yazılar ve düğmeler */
  screen: {
    /* bütün yazılar, logolar ve düğme yazıları saf siyah */
    text: '#000000',
    /* yazı rolleri: başlık ve alıntı comma-serif 300; değerler ve tanıtım 400; etiketler ve düğmeler
       config-mono-vf wght 500 (büyük harf); bütün sayılar config-mono-vf wght 300 */
    type: {
      title: { family: '"comma-serif", serif', weight: 300 },
      quote: { family: '"comma-serif", serif', weight: 300 },
      body: { family: '"comma-serif", serif', weight: 400 },
      label: { family: '"config-mono-vf", monospace', weight: 500, variation: '"wght" 500' },
      number: { family: '"config-mono-vf", monospace', weight: 300, variation: '"wght" 300' },
    },
    label: { size: 0.0105, track: 0.16 },
    info: {
      left: 0.012, top: 0.02, width: 0.21, minWidth: 300, title: { web: 0.032, mobile: 0.075 },
      value: 0.017, row: 0.029, track: 0.16, diamond: 7, descLines: 6, mobilePad: 0.02,
    },
    quote: { top: 0.05, size: { web: 0.024, mobile: 0.055 }, lh: 1.15, maxW: { web: 0.5, mobile: 0.86 } },
    stage: { size: 0.019, track: 0.18, gap: 0.015 },
    ticket: { d: 0.09, font: 0.018, bottom: 0.04 },
    button: { fill: '#FFFFFF', fit: 0.68 },
    logo: { h: 0.16, bottom: 0.04, letter: 0.025, mobileH: 0.11, mobileBottom: 0.03 },
    members: { d: 0.075, font: 0.016, gap: 0.012, pad: 0.02, mobileD: 0.11 },
    swap: { shift: 8, stagger: 0.04, total: 0.6 },
  },

  /* sayaç noktalı: ay.gün.saat.dakika.saniye */
  counterFormat: { sep: '.' },
  /* kenardaki daireler duotone: koyu ve açık ton */
  duotone: { dark: '#2A2D31', light: '#ECEBE8' },

  /* Fotoğrafı olmayan öğelerin rengi (ROTA1 artboard renkleri); yükleme ekranının nokta paleti */
  palette: ['#64AADC', '#9FC54E', '#6AB27A', '#4070B8', '#C9222A'],

  /* Adobe Fonts kiti fpj2hxb (comma-serif 100–900, config-mono-vf 200–700). Yazı rolleri screen.type'ta */
  fonts: {
    stylesheets: ['https://use.typekit.net/fpj2hxb.css'],
  },

  /* Kapatma ikonu (×): kenar boşluğu (H oranı; yükleme ekranı da kullanır) ve çapı (px) */
  closeButton: { pad: 0.034, size: 56 },

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

  /* Yükleme ekranının ekran koruyucu ağı: 4px aralık, yuvarlak delikler, siyah yüzey %30 (açık hâlin ağı gallery.mesh) */
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
