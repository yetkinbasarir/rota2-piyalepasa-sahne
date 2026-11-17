# Piyalepaşa Sahne — ROTA2

Çapraz 3B daire galerisi (CSS 3B): daireler bir köşegen boyunca dizilir. Ana daire (p = 0 yuvası: en büyük, renkli,
en önde; konumu serbest kompozisyon değeri mainX / mainY) renkli, diğerleri duotone; ana daireye tıklanınca diğer daireler
yerinde kalır, ana daire düzleşip ekranı kaplayana kadar büyür ve tam ekran video (ince çizgili eşkenar dörtgen ağ ile) belirir; ekranda gösteri başlığı, kısa
logo, Bilet Al ve × kalır. Web + mobil PWA.
Vite + TypeScript, framework yok; animasyon GSAP (CustomEase, InertiaPlugin, Observer).

```bash
npm install
npm run dev            # geliştirme
npm run build          # dist/ (Vercel: vercel.json)
npm run photos:download   # kaynaklar.json → photos-raw/ (git dışı)
npm run photos:build      # photos-raw/ → public/img/*.webp|avif + src/content/photos.generated.json + eksik_fotograflar.txt
npm run icons             # logo SVG → public/icons/
```

## Yapı

```
src/
  main.ts                 kimlik + içerik seçilir, motor başlar
  content/shows.ts        içerik modeli: tek kaynak ../icerik_kunye.json (id ile eşleşir) + fotoğraf eşlemesi
                          (A, yoksa B) + renk + odak + alıntı ("alinti") + örnek tarih/saat/fiyat
  content/*.generated.json  scripts/build-images.mjs çıktısı: görsel boyutları, fotoğraf renkleri, odak noktaları
  slides/web, slides/mobile  slayt gösterisinin görselleri (16:9 / dikey PNG); klasöre bırakılan her PNG eklenir
  identity/rota1/         KİMLİK KATMANI — motordan ayrı, tek yer
    index.ts              token'lar: renkler, kâğıt dokusu, galeri (yerleşim, s(p), eğim, süzülme, düzleşme, gölge,
                          hareket, açık hâlin ağı, açılma), ekran (metin rengi, yazı rolleri, ölçüler, düğmeler, logo), ×,
                          yükleme ekranı, süreler, logo
    templates.ts          başlık + tanıtım, sağ alt künye (tür, tarih, sahne, emek), alıntı, daire düğmeler, ×
    styles.css            görsel dil
  engine/
    types.ts              motor ↔ kimlik/içerik sözleşmesi
    state.ts              durum (galeri konumu S.pos) + ekran ölçüsü
    gallery.ts            duruş yerleşimi (yazılardan), daireler (CSS 3B, Catmull-Rom), gölgeler, eğim / düzleşme,
                          açık hâl (ana dairenin büyümesi, video, ağ), yazı geçişleri
    screen.ts             yazı ölçüleri (CSS değişkenleri; sayıların büyük harf yüksekliği canvas ile), uzun / kısa logo, Üye Ol / Giriş, düğme yazısı sığdırma
    camera.ts             konum: sürükleme, atalet, oturma, adım, kendiliğinden ilerleme
    slides.ts             kimlik slayt gösterisi (logoya tıklayınca): src/slides/web|mobile/*.png, dosya adı sırasıyla
    commands.ts           tüm girişlerin çağırdığı komut katmanı
    present.ts            kendi kendine sunum
    fullVideo.ts          tam ekran videosu (YouTube / Vimeo / mp4, ses)
    counter.ts            canlı geri sayım (tek zamanlayıcı, yalnızca görünen sayaçlar)
    loader.ts, screensaver.ts  yükleme ekranı ve açılış ekran koruyucusu
    logo.ts               iki parçalı, uzayıp kısalan logo
    media.ts, crop.ts, texture.ts  srcset + önceden yükleme, tam ekran yerleşimi, ağ (açık hâlde eşkenar dörtgen / ekran koruyucuda yuvarlak)
    theme.ts              kimlik token'larını sayfaya uygular, DOM iskeleti
    input/pointer.ts      işaretçi / dokunma (Observer)
    input/wheel.ts        tekerlek / trackpad (Observer)
    input/keyboard.ts     klavye + TV kumandası
```

`npm run photos:build` görselleri üretirken her fotoğrafın rengini de çıkarır (node-vibrant: LightVibrant →
LightMuted → ortalama renk; koyu yazıyla kontrast en az 4.5 olana kadar açılaştırılır).

İkinci bir kimlik: `src/identity/<ad>/` altında aynı `Identity` arayüzüyle tanımlanır, `main.ts`'teki import değiştirilir.
