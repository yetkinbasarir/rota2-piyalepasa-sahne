# Piyalepaşa Sahne — ROTA1

16:9 (mobilde 9:16) birimlerden örülmüş, iki yönde sonsuz dönen program yüzeyi. Web + mobil PWA.
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
                          (A, yoksa B) + renk (veride elle "renk" > fotoğraftan çıkarılan) + örnek tarih/saat/fiyat
  content/*.generated.json  scripts/build-images.mjs çıktısı: görsel boyutları, fotoğraf renkleri
  identity/rota1/         KİMLİK KATMANI — motordan ayrı, tek yer
    index.ts              duvar ölçüleri (kart sayısı, oran, fotoğraf payı, akış hızı, karartma, logo kutusu),
                          palet, font rolleri (light, bold, sayaç), tek punto token'ı, "move" eğrisi, süreler
    surface.ts            kart tipografisi
    templates.ts          kart renk kutusu (isim + sayaç), metin paneli, bilet (devre dışı)
    styles.css            görsel dil
  engine/
    types.ts              motor ↔ kimlik/içerik sözleşmesi
    state.ts              durum + ekran ölçüsü (kamera kart birimi cinsinden)
    wall.ts               duvar: sanallaştırılmış kartlar, L hâline açılma, karartma, metin paneli
    camera.ts             gezinme, InertiaPlugin savrulma, boşta sağdan sola akış, klavye adımı
    counter.ts            canlı geri sayım (tek zamanlayıcı, yalnızca görünen sayaçlar)
    fit.ts                sayacı renk kutusunun tam genişliğine oturtur
    commands.ts           tüm girişlerin çağırdığı komut katmanı
    media.ts              srcset, önceden yükleme + decode, video oynatma sınırı
    theme.ts              kimlik token'larını sayfaya uygular, DOM iskeleti
    input/pointer.ts      işaretçi / dokunma (Observer)
    input/wheel.ts        tekerlek / trackpad (Observer)
    input/keyboard.ts     klavye + TV kumandası
```

`npm run photos:build` görselleri üretirken her fotoğrafın rengini de çıkarır (node-vibrant: LightVibrant →
LightMuted → ortalama renk; koyu yazıyla kontrast en az 4.5 olana kadar açılaştırılır).

İkinci bir kimlik: `src/identity/<ad>/` altında aynı `Identity` arayüzüyle tanımlanır, `main.ts`'teki import değiştirilir.
