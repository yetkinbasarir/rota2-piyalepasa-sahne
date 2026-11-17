/* Komut katmanı: işaretçi, dokunma, tekerlek, klavye ve kumanda girişlerinin tamamı
   yalnızca bu komutları çağırır. */
import type { Camera } from './camera';
import type { Wall } from './wall';
import { viewCols, type State } from './state';

export interface Commands {
  /** Her girişte çağrılır (akış artık beklemez; kanca olarak duruyor) */
  input(): void;
  press(): void;
  release(): void;
  /** Kapalıyken: dikey hareket de yataya çevrilir (baskın eksen) */
  pan(dx: number, dy: number): void;
  fling(vx: number, vy: number): void;
  /** Tekerlek bitince en yakın kolona otur */
  settle(): void;
  /** Ok tuşları: kapalıyken bir kart kaydır; açıkken yatayda sonraki / önceki, dikeyde açık öğeyi kaydır */
  arrow(di: number, dj: number): void;
  tap(x: number, y: number): void;
  /** (i, j) öğesini aç: kullanıcı tıklamasıyla aynı yol (kendi kendine sunum da bunu kullanır) */
  openItem(i: number, j: number): void;
  /** Açık öğenin fotoğrafını tam ekrana al (fotoğrafa / Detay'a dokunmakla aynı yol) */
  fullscreen(): void;
  /** Ekran ortasındaki kartı aç */
  openCenter(): void;
  /** Açıkken sonraki (+1) / önceki (−1) kartı açar */
  next(d: 1 | -1): void;
  close(): void;
  /** Kapatma ikonu: künye, video, tam ekran ya da açılmış öğe — ne olursa olsun doğrudan grid'e */
  home(): void;
  isOpen(): boolean;
  /** Fare uzun künyenin üzerindeyse tekerlek künyeyi kaydırır; true: tüketildi (duvar yatay kaymaz) */
  creditsWheel(x: number, y: number, dy: number): boolean;
  /** Açık öğeyi dikey kaydır (sığmıyorsa) */
  openScroll(dy: number): void;
  openFling(v: number): void;
  openStop(): void;
}

export function createCommands(o: { S: State; camera: Camera; wall: Wall }): Commands {
  const { S, camera, wall } = o;
  const dominant = (a: number, b: number) => (Math.abs(a) >= Math.abs(b) ? a : b);

  /** Açılma kamerayı kaydırmaz: öğe ekranın ortasında açılır, duvar ikiye ayrılır */
  function open(i: number, j: number) {
    camera.stop();
    wall.open(i, j);
  }

  const cmd: Commands = {
    // akış artık etkileşimden sonra beklemez; kaydırma bittiği anda sürer
    input: () => {},
    press() {
      S.pressed = true;
      if (!S.open) camera.stop();
      wall.stopOpen();
    },
    release() {
      S.pressed = false;
    },
    pan(dx, dy) {
      if (!S.open) camera.pan(dominant(dx, dy));
    },
    fling(vx, vy) {
      if (!S.open) camera.fling(dominant(vx, vy));
    },
    settle() {
      if (!S.open) camera.settle();
    },
    arrow(di, dj) {
      if (S.open) {
        if (di) cmd.next(di > 0 ? 1 : -1);
        else wall.stepOpen(dj > 0 ? 1 : -1);
        return;
      }
      if (di) camera.step(di);
    },
    tap(x, y) {
      // tam ekranda ekranın herhangi bir yerine dokunmak doğrudan grid'e döndürür
      if (S.full) return wall.fullscreen(false);
      // mobil: açılmış öğenin dışında kalan üst banda dokunmak öğeyi kapatır
      if (S.mobile && S.open && y < S.top) return void wall.close();
      const h = wall.hit(x, y);
      if (!h) return;
      if (h.part === 'photo') return wall.fullscreen(true);
      if (h.part === 'act') {
        // Video tam ekranı açar; Detay künyeyi açıp kapatır; Bilet Al ve Paylaş şimdilik işlevsiz
        if (h.act === 'video') wall.fullscreen(true);
        else if (h.act === 'detail') wall.credits();
        return;
      }
      if (h.part === 'open') return wall.tapOpen(x, y);
      // kenardaki başka bir kart: açık öğe kartına dönüp yerine iner, yeni öğe açılır
      open(h.i, h.j);
    },
    openItem: (i, j) => open(i, j),
    fullscreen() {
      if (S.open && !S.full) wall.fullscreen(true);
    },
    openCenter() {
      if (S.open) return;
      open(Math.floor(S.cx + viewCols(S) / 2), 0);
    },
    next(d) {
      if (!S.open || S.full) return;
      open(S.open.i + d, S.open.j);
    },
    close() {
      // geri: tam ekrandan doğrudan grid'e, açık öğeden grid'e; kamera olduğu yerde kalır
      if (S.full) return wall.fullscreen(false);
      // künye açıksa önce künye kapanır
      if (wall.creditsOpen()) return wall.credits(false);
      wall.close();
    },
    home() {
      if (S.full) return wall.fullscreen(false);
      if (S.open) wall.close();
    },
    isOpen: () => !!S.open,
    creditsWheel: (x, y, dy) => wall.creditsWheel(x, y, dy),
    openScroll: (dy) => wall.scrollOpen(dy),
    openFling: (v) => wall.flingOpen(v),
    openStop: () => wall.stopOpen(),
  };
  return cmd;
}
