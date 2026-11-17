/* Fotoğrafın kutu içindeki yerleşimi. Görsel kutuyu kaplayacak şekilde ölçeklenir; odak noktası
   yatayda kutunun ortasına, dikeyde kutunun üstünden %40'a getirilir. Yüz kutusu bilgisi varsa ve
   kutuya sığıyorsa yüzün üst kenarının üstünde yüz yüksekliğinin yarısı kadar pay bırakılır (saç ve
   alın kesilmez). Görselin kenarı hiçbir zaman kutunun içine girmez: konum kenarda sabitlenir.
   Kutu boyutu her değiştiğinde (yeniden boyutlanma, açılma / kapanma ve animasyon karesi) yeniden
   hesaplanır. */
import type { Show } from './types';

/** Odağın kutu içindeki hedefi: yatayda orta, dikeyde üstten %40 */
const TARGET_X = 0.5;
const TARGET_Y = 0.4;
/** Yüzün üstündeki pay: yüz yüksekliğinin oranı */
const HEADROOM = 0.5;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** a: görselin doğal en-boy oranı; w × h: kutu (px). Dönüş: görselin sol üstü ve ölçeklenmiş boyutu. */
export function placePhoto(a: number, w: number, h: number, f: Show['focus']) {
  const ih = Math.max(h, w / a); // kaplama
  const iw = ih * a;
  let x = TARGET_X * w - (f.x / 100) * iw;
  let y = TARGET_Y * h - (f.y / 100) * ih;
  if (f.faceTop != null && f.faceH != null) {
    const top = (f.faceTop / 100) * ih;
    const fh = (f.faceH / 100) * ih;
    const pad = HEADROOM * fh;
    // yüz + üstündeki pay kutuya sığıyorsa yüzün üstü kesilmesin
    if (top + y < pad && pad + fh <= h) y = pad - top;
  }
  x = clamp(x, w - iw, 0);
  y = clamp(y, h - ih, 0);
  return { x, y, w: iw, h: ih };
}
