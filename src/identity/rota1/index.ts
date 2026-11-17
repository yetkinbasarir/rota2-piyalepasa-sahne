/* ROTA1 kimliği — Piyalepaşa Sahne.
   Kimliğe ait her şey burada: duvar ölçüleri, palet, renkler, logo, font rolleri,
   easing eğrileri, süreler, sayfa şablonları ve stil. Motor bu nesneyi okur;
   ikinci bir kimlik aynı arayüzle yeni bir klasörde tanımlanıp main.ts'te seçilir. */
import type { Identity } from '../../engine/types';
import { templates } from './templates';
import logoLong from './logo-long.svg?raw';
import logoShort from './logo-short.svg?raw';
import './styles.css';

export const rota1: Identity = {
  id: 'rota1',
  name: 'Piyalepaşa Sahne',

  colors: {
    /* ROTA2: koyu gri zemin, ikincil çizgi, yarı saydam bant; kart ve panel geçici olarak tek renk */
    background: '#2A2D31',
    paper: '#ffffff',
    ink: '#0b0b0b',
    focus: '#DA00F9',
    line: '#636D74',
    band: '#3A3D42',
    bandAlpha: 0.88,
    card: '#3A3F45',
    stroke: '#B4BCC1',
  },
  /* ROTA2 daire grid'i: bütün ölçüler ekran yüksekliği H'nin oranı */
  ring: {
    disc: 0.4025,
    discMobileW: 0.62,
    pitch: 0.873,
    row: 0.546,
    nameY: 0.039,
    nameSize: 0.043,
    counterY: 0.078,
    counterSize: 0.0224,
    counterTrack: 0.04,
    discTop: 0.108,
    photoZoom: 1.8,
    /* ayraç: 2px çizgi, elmas 0.03H × 0.02H; sarkaç en fazla ±1.5°, yarı periyot 1.2 sn, sönüm 0.25.
       gain: kameranın yatay hızı (px/sn) başına açı (°) — 1500 px/sn'de en büyük açı; phase: ayraçlar arası
       en fazla frekans farkı (küçük rastgele faz kayması) */
    sep: { width: 2, diamondH: 0.03, diamondW: 0.02, maxAngle: 1.5, gain: 0.001, halfPeriod: 1.2, damping: 0.25, phase: 0.08 },
    band: { web: 0.255, mobile: 0.2, open: 0.5, openMobile: 0.62, credits: 0.85, logoH: 0.195, logoPad: 0.034 },
    button: { d: 0.148, gap: 0.02, right: 0.039, font: 0.035, mobile: 0.7 },
    open: {
      iris: 0.9, irisOut: 0.8, ease: 'power3.inOut', bandOut: 0.5, textDelay: 0.2, textFade: 0.4,
      textGap: 0.05, textW: 0.42, titleSize: 0.043, introSize: 0.021, introLh: 1.4, introGap: 0.02,
    },
  },
  /* sayaç noktalı (ay.gün.saat.dakika.saniye); sayaç ↔ tarih dönüşü kapalı */
  counterFormat: { sep: '.', flip: false },
  /* grid fotoğrafları duotone: koyu ve açık ton */
  duotone: { dark: '#1E2125', light: '#D5DADD' },

  /* Fotoğrafı olmayan öğelerin rengi (ROTA1 artboard renkleri). Fotoğraflı öğelerin rengi
     derleme sırasında kendi fotoğrafından çıkarılır (scripts/build-images.mjs). */
  palette: ['#64AADC', '#9FC54E', '#6AB27A', '#4070B8', '#C9222A'],

  /* Adobe Fonts kiti fpj2hxb. Metinde yalnızca iki ağırlık var: Light ve Bold.
     Ağırlık / aile değişikliği yalnızca burada yapılır. */
  fonts: {
    stylesheets: ['https://use.typekit.net/fpj2hxb.css'],
    roles: {
      /* kapaktaki büyük başlık (metin kuralının dışında) */
      coverTitle: { family: '"comma-serif", serif', weight: 400 },
      /* bütün metinler comma-serif: düz 400, başlıklar ve alan adları 700 */
      light: { family: '"comma-serif", serif', weight: 400 },
      bold: { family: '"comma-serif", serif', weight: 700 },
      /* sayaç, tarih ve saat: config-mono-vf; varsayılan wght 300, vurgulu yerlerde (tam ekran sayacı) 500 */
      counter: { family: '"config-mono-vf", monospace', weight: 300, variation: '"wght" 300' },
      counterStrong: { family: '"config-mono-vf", monospace', weight: 500, variation: '"wght" 500' },
    },
  },

  /* Detay, künye ve bilet katmanlarının tek puntosu. Satır aralığı taban ızgarasıdır:
     bloklar arası boşluklar bu satır yüksekliğinin katlarıdır. */
  type: {
    web: { size: 'clamp(15px, 1.25vw, 24px)', lineHeight: 1.35 },
    mobile: { size: '15px', lineHeight: 1.4 },
  },

  /* Bilet kartı duvarı */
  wall: {
    /* en altta siyah bant (ekran yüksekliğinin oranı); logo bandın içinde sol altta */
    band: { web: 0.13, mobile: 0.1 },
    /* mobil: üstte siyah bant (76px + üst güvenli alan); logo ve düğmeler 12px boşlukla */
    mobileBand: 76,
    mobileLogoPad: 12,
    /* mobil açılmış öğe: fotoğraf görünür alanın %45'i */
    mobilePhoto: 0.45,
    /* mobil panel: tanıtım ile düğmeler arası = panel iç boşluğu */
    mobileIntroGap: 1,
    /* mobil panel: başlık (Bold), tanıtım ve künye 16px */
    mobileBody: 16,
    /* kapatma ikonu: web'de 56px çap */
    closeSize: 56,
    /* logonun bant içindeki üst / alt / sol boşluğu: kartlar arası boşluğun 2 katı */
    logoPad: 2,
    /* kart, satır ve kenar boşluğu (px) */
    gap: 10,
    /* bandın üstünde iki sıra */
    rows: 2,
    /* kart oranı (genişlik / yükseklik): 1440×900 ekrandaki tasarımın oranı (278 / 376.5) */
    cardRatio: 278 / 376.5,
    /* ortada en fazla 4 tam kolon; kalan alan iki kenarda kesik kartlarla dolar */
    maxCols: 4,
    /* otomatik hareketler hep sağdan sola; uzak hedefte süre en fazla 2 katına uzar */
    moveMaxFactor: 2,
    /* mıknatıs: kartlar 4 kat boşlukla başlar, hafif esneyerek oturur */
    magnetGap: 4,
    magnetEase: 'back.out(1.25)',
    /* fotoğrafın kart yüksekliğindeki payı; kalanı renk kutusu */
    photo: 2 / 3,
    /* perforaj: her kenarda ortada tek daire (merkez kartlar arası boşluğun ortasında), çap = kart genişliğinin %15'i */
    perforation: 0.15,
    /* sürekli akış: kolon / saniye, sağdan sola; fare grid'in üzerindeyken bu hızın %25'i */
    drift: 0.15,
    driftHover: 0.25,
    /* görsellerde çok yavaş zoom: 1.00 → 1.08, süre 18–26 sn (öğeden öğeye), yoyo */
    zoom: { from: 1, to: 1.08, min: 18, max: 26 },
  },

  /* Tam ekran başlığı: ekran genişliğinin %11'i (en fazla %90 genişlik); sayaç başlığın yarısı, arası 0.15 */
  fullTitle: {
    size: 0.11,
    maxWidth: 0.9,
    counter: 0.5,
    gap: 0.15,
  },

  /* Grid kartlarında parlama: ~20° eğik beyaz şerit, kart genişliğinin %45'i, soft-light */
  shine: {
    /* ROTA2: parlama dalgası yok */
    enabled: false,
    opacity: 0.35,
    width: 0.45,
    angle: 20,
  },

  /* Yükleme ekranı: nokta matrisi logo (2) ya da içi dolan logo (1); en az 1.2 sn.
     Nokta aralığı logo yüksekliğinin %6'sı (en az 12px), en büyük yarıçap aralığın 0.48 katı */
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
    /* noktalar bilet renklerinin tam doygun (S %100, L %50) tonlarında; ekran koruyucuya sert flaşla geçilir:
       3 kare (~50 ms) düz beyaz, geçişsiz kesilir; akış 1.08'den, logo 1.04'ten 0.6 sn'de (expo.out) oturur */
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
    /* klavye adımı ve kolona oturma */
    move: 'M0,0 C0.45,0 0.2,1 1,1',
    /* açılma, itme, tam ekran: hızlı ve canlı, net durur */
    open: 'M0,0 C0.16,0.84 0.3,1 1,1',
    page: 'M0,0 C0.7,0 0.2,1 1,1',
    fade: 'M0,0 C0.4,0 0.2,1 1,1',
  },

  durations: {
    open: 0.6,
    colorDelay: 0.07,
    textDelay: 0.3,
    lineStagger: 0.05,
    pushStagger: 0.035,
    fullscreen: 0.45,
    videoIn: 0.8,
    videoOut: 0.5,
    videoTimeout: 8,
    youtubeHold: 4,
    soundIn: 2.5,
    soundOut: 0.5,
    textureIn: 0.6,
    textureOut: 0.4,
    photoTextureIn: 0.4,
    photoTextureOut: 0.2,
    autoReturn: 15,
    /* ekran koruyucu: belirme, kararma, logo taşınması */
    ssIn: 0.6,
    ssOut: 0.4,
    /* çıkış: katman yukarı kayar */
    ldExit: 1.0,
    /* kendi kendine sunum */
    presentIdle: 8,
    presentGrid: 6,
    presentMove: 1.6,
    presentOpen: 5,
    presentPhoto: 8,
    presentResume: 20,
    /* parlama dalgası */
    shine: 1.4,
    shineSweep: 2.2,
    shineRow: 0.15,
    shineEvery: 7,
    /* tam ekran başlığı ve sayacı */
    titleIn: 1.6,
    counterDelay: 0.2,
    counterIn: 0.6,
    titleOut: 0.5,
    /* tam ekran: saat sayaçtan 0.15 sn sonra; sahne etiketi 0.6 sn */
    hourDelay: 0.15,
    stageIn: 0.6,
    /* kolon sayısı değişirken kartların yeni yerlerine kayması */
    columnShift: 0.5,
    /* künye: fotoğraf ve künye birlikte yukarı kayar */
    credits: 0.9,
    /* mobil: tam ekrana geçerken renk paneli aşağı kayıp kaybolur */
    panelOut: 0.5,
    /* uzun künyenin kaydırma çubuğu */
    scrollbarIn: 0.3,
    /* mıknatıs hareketi */
    magnet: 0.7,
    magnetStagger: 0.05,
    /* sayaç ↔ tarih: 10 sn sayaç, 4 sn tarih; karakter karakter dönme */
    flipStagger: 0.04,
    flipSpin: 0.35,
    countShow: 10,
    dateShow: 4,
    flipWave: 1.5,
    step: 0.55,
    /* akış hızı geçişleri: yavaşlama, durma, kalkış */
    driftRamp: 0.8,
    scroll: 0.42,
  },

  /* iki parçalı logo: çizgiler x = 0'dan başlar, sola uzar. Uzun logo hedef yükseklikte kullanılabilir
     genişliğin %70'ine sığıyorsa uzun, değilse kısa; mobilde hep kısa */
  logo: {
    svg: logoLong,
    long: { svg: logoLong, lines: [14.31, 169.18, 324.05, 478.92], thick: 3.94 },
    short: { svg: logoShort, lines: [14.53, 169.53, 324.53, 479.53, 634.53], thick: 4 },
    longFit: 0.7,
  },
  templates,

  strings: {
    surfaceLabel: 'Piyalepaşa Sahne programı',
  },
};
