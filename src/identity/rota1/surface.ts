/* ROTA1 kart ve panel tipografisi (kimlik katmanı). Puntolar kart genişliğiyle orantılıdır; minPx alt sınırdır. */
export const SURFACE = {
  /** Kart: isim puntosu (Light) */
  title: { scale: 0.075, minPx: 14 },
  /** Renk kutusu ve panel iç boşluğu */
  pad: { scale: 0.05, minPx: 10 },
  /** Panel: başlık (büyük, Light), tanıtım ve düğme puntoları */
  panelTitle: { scale: 0.12, minPx: 22 },
  panelBody: { scale: 0.052, minPx: 13 },
  button: { scale: 0.042, minPx: 11 },
  /** Üye düğmelerinin kontur kalınlığı (px) */
  bandLine: 1,
  /** Tam ekran sahne etiketi: panel düğmesi boyutunun katı */
  stageLabel: 1.6,
  /** Künye: alan adı kolonu (künye iç genişliğinin oranı); bundan dar kalırsa alan adı kişilerin üstüne geçer */
  creditsLabel: { ratio: 0.32, minPx: 110 },
};
