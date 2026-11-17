/* Motor: bir kimlik + içerik listesi alır, poster duvarını kurar ve çalıştırır. */
import './engine.css';
import { gsap, createMotion } from './motion';
import { applyIdentity, buildDom, landscapeQuery } from './theme';
import { createState, measure, esc, viewCols, snapCamForward } from './state';
import { createMedia } from './media';
import { createCounters } from './counter';
import { fitText } from './fit';
import { createWall } from './wall';
import { createFullVideo } from './fullVideo';
import { createCamera } from './camera';
import { createCommands } from './commands';
import { startPresentation } from './present';
import { createLoader } from './loader';
import { pickLogo, layoutLogo } from './logo';
import { createScreensaver } from './screensaver';
import { bindPointer } from './input/pointer';
import { bindWheel } from './input/wheel';
import { bindKeyboard } from './input/keyboard';
import type { Identity, Show, TemplateContext } from './types';

export async function startEngine(id: Identity, shows: Show[]) {
  const motion = createMotion(id);
  const { logoHtml, brandHtml } = applyIdentity(id);
  const dom = buildDom(id, brandHtml);
  const S = createState();
  measure(S, id);
  // yükleme ekranı (index.html'de satır içi): site öğeleri çıkışa kadar gizli
  const loader = createLoader({
    id, motion,
    brand: () => document.querySelector<HTMLElement>('.brand svg'),
    reveal: [...document.querySelectorAll<HTMLElement>('.band, .bnd, .brand, .topstrip')],
    // nokta matrisinin paleti: bütün gösterilerin bilet renkleri
    colors: shows.map((s) => s.color ?? id.palette[s.k % id.palette.length]),
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  const media = await createMedia();
  let visible: () => Iterable<Element> = () => [];
  const counters = createCounters(shows, () => visible(), motion);
  const tctx = (): TemplateContext => ({
    mobile: S.mobile,
    vw: S.vw,
    vh: S.vh,
    W: S.cw,
    H: S.ch,
    media: media.html,
    logo: logoHtml,
    countdown: (s) => counters.values(s),
    esc,
  });

  const wall = createWall({
    S, id, motion, media, shows, tctx, layer: dom.wall, top: dom.top,
    video: createFullVideo({ root: dom.video, motion, id }),
    texture: dom.texture,
    title: dom.title,
    stage: dom.stage,
    band: dom.band,
    close: dom.close,
    onCreate: (el) => {
      counters.fill(el);
      fitText(el);
    },
  });
  // tam ekran başlığının sayacı da saniye saniye güncellenir
  visible = () => [...wall.visible(), dom.title];
  const camera = createCamera(S, id, motion);
  const cmd = createCommands({ S, camera, wall });

  bindPointer(dom.surface, cmd);
  // fare grid'in üzerindeyken akış yavaşlar (alt bant grid sayılmaz; dokunmatikte üzerine gelme yok)
  dom.surface.addEventListener('pointermove', (e) => {
    S.hover = e.pointerType === 'mouse' && e.clientY < S.vh - S.band;
  });
  dom.surface.addEventListener('pointerleave', () => {
    S.hover = false;
  });
  bindWheel(dom.surface, cmd);
  bindKeyboard(cmd);

  /* alt bant düğmeleri: Üye Ol / Üye Girişi. Logo ile birlikte sığmazsa 0.8 katına küçülür; yine
     sığmazsa yalnızca Üye Girişi kalır. Şimdilik işlevsiz; tıklama duvara geçmez. */
  const brand = document.querySelector<HTMLElement>('.brand');
  /* alt bant logosu: iki parçalı logo, bandın içinde sola yakın (üst ve alt boşluk eşit), çizgi uzantıları
     ekranın sol kenarına kadar; ekran ölçüsüne göre uzun / kısa seçilir */
  const renderBrand = () => {
    if (!brand) return;
    const css = getComputedStyle(document.documentElement);
    const pad = parseFloat(css.getPropertyValue(S.mobile ? '--mpad' : '--logo-pad')) || 0;
    const h = S.mobile ? S.band - S.safeTop - 2 * pad : S.band - 2 * pad;
    if (h <= 0) return;
    const L = layoutLogo(pickLogo(id, h, S.vw, S.mobile), h, pad);
    brand.style.width = `${L.width}px`;
    brand.style.height = `${h}px`;
    brand.innerHTML = L.html;
  };
  const renderBand = () => {
    renderBrand();
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(S.mobile ? '--mpad' : '--logo-pad')) || 0;
    const room = () => S.vw - (brand?.getBoundingClientRect().right ?? 0) - 2 * pad;
    // düğmeler eş boyda: genişlik ikisinden uzun olanınki, yazı ortalı
    const equalize = () => {
      const bs = [...dom.band.querySelectorAll<HTMLElement>('button')];
      bs.forEach((b) => (b.style.width = ''));
      const w = Math.max(...bs.map((b) => b.getBoundingClientRect().width));
      bs.forEach((b) => (b.style.width = `${Math.ceil(w)}px`));
    };
    // mobilde üst banda sığacak şekilde 0.8 katı
    for (const scale of S.mobile ? [0.8] : [1, 0.8]) {
      dom.band.innerHTML = id.templates.bandButtons(S.cw + S.gap, scale, tctx());
      equalize();
      if (dom.band.getBoundingClientRect().width <= room()) return;
    }
    dom.band.querySelector('[data-band="signup"]')?.remove();
  };
  renderBand();
  // fontlar yüklenince ölçüler değişir: düğmeler yeniden ölçülür
  document.fonts?.ready.then(renderBand);
  // kapatma ikonu: dokununca o anki durum ne olursa olsun doğrudan grid'e dönülür; tıklama alttaki
  // katmanlara geçmez (kendi kendine sunumu durdurma, pencere düzeyindeki dinleyicide yakalanır)
  dom.close.innerHTML = id.templates.closeIcon(tctx());
  dom.close.addEventListener('pointerdown', (e) => e.stopPropagation());
  dom.close.addEventListener('click', (e) => {
    e.stopPropagation();
    cmd.home();
  });
  dom.band.addEventListener('pointerdown', (e) => e.stopPropagation());
  dom.band.addEventListener('click', (e) => e.stopPropagation());

  // web: iki kenarda yarım kolon ile başla
  S.cx = S.snapOff;
  // yükleme işleri: fontlar, içerik, ilk ekranda görünecek kart görselleri, (web) ekran koruyucunun ilk 2 oynatıcısı
  const N = shows.length;
  const firstScreen = new Set<Show>();
  for (let i = Math.floor(S.cx) - 1; i <= Math.ceil(S.cx + viewCols(S)) + 1; i++)
    for (let j = 0; j < S.rows; j++) firstScreen.add(shows[(((2 * i + j) % N) + N) % N]);
  const firstImages = media.preload([...firstScreen], S.cw);
  const ss = loader.ssRoot ? createScreensaver({ root: loader.ssRoot, shows, media, id, mobile: S.mobile, reduced: motion.reduced }) : null;
  loader.attach(ss);
  // oynatıcılar yüklemeyi geciktirmez: hazır olmayanların kesmelerinde fotoğraf yedeği gösterilir
  loader.track([fontsReady, Promise.resolve(shows), firstImages]);
  // Görselleri ilk çizimden önce yükle + decode et (en fazla kısa bir süre bekle)
  await Promise.race([firstImages, new Promise((r) => setTimeout(r, 1200))]);
  gsap.ticker.add(wall.render);
  const later = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 300));
  later(() => media.preload(shows, 2 * S.cw));

  // Kimliğin font rolleri yüklenince ölçüye bağlı dizgiler (sayaç genişliği) yeniden kurulur
  if (document.fonts) {
    const loads = Object.values(id.fonts.roles).map((r) => document.fonts.load(`${r.weight} 16px ${r.family}`).catch(() => []));
    Promise.all(loads).then(() => wall.refresh());
  }

  let presenter: { refresh(): void } | null = null;
  let resizeTimer = 0;
  /* telefonda yatay ekran: katman açıkken duvar yeniden kurulmaz, durum korunur; her şey bekler.
     Dikleşince katman kaybolur, yerleşim dikey ölçüye göre bir kez (gerekirse) yeniden hesaplanır */
  const landscape = matchMedia(landscapeQuery(id));
  let before: { vw: number; vh: number } | null = null;
  const relayout = () => {
    const center = S.cx + viewCols(S) / 2;
    measure(S, id);
    const keep = center - viewCols(S) / 2;
    S.cx = keep;
    camera.stop();
    wall.rebuild();
    presenter?.refresh();
    renderBand();
    wall.render(); // boş kare kalmasın
    // kolon hizasına hep ileri (sağdan sola) oturur; geri gitmez
    camera.run(gsap.to(S, { cx: snapCamForward(S, keep), duration: motion.dur('columnShift'), ease: motion.ease.page }));
  };
  const rotateOn = () => {
    if (S.paused) return;
    S.paused = true;
    before = { vw: innerWidth, vh: innerHeight };
    gsap.killTweensOf(dom.rotate);
    gsap.set(dom.rotate, { autoAlpha: 1 });
    dom.rotate.classList.add('rot--on');
    wall.suspend(true);
    gsap.globalTimeline.pause();
  };
  const rotateOff = () => {
    if (!S.paused) return;
    S.paused = false;
    gsap.globalTimeline.resume();
    // dikey ölçü değiştiyse bir kez yeniden hesaplanır; aynıysa her şey kaldığı yerden sürer
    const changed = !before || Math.abs(innerWidth - before.vw) > 1 || Math.abs(innerHeight - before.vh) > 1;
    if (changed && (S.vw !== innerWidth || Math.abs(S.vh - innerHeight) > 1)) relayout();
    else wall.suspend(false);
    gsap.to(dom.rotate, {
      autoAlpha: 0, duration: 0.3, ease: motion.ease.fade,
      onComplete: () => {
        dom.rotate.classList.remove('rot--on');
        gsap.set(dom.rotate, { clearProps: 'opacity,visibility' });
      },
    });
  };
  const onOrientation = () => (landscape.matches ? rotateOn() : rotateOff());
  landscape.addEventListener('change', onOrientation);
  if (landscape.matches) rotateOn();
  dom.rotate.addEventListener('pointerdown', (e) => e.stopPropagation());

  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    // yatay telefon katmanı açıkken yerleşim yeniden hesaplanmaz (durum korunur)
    if (S.paused || landscape.matches) return;
    resizeTimer = window.setTimeout(() => {
      if (S.paused) return;
      // ölçü değişmediyse (ör. yatay katmandan dikeye dönüş sonrası gelen olay) yeniden kurma: durum korunur
      if (S.vw === innerWidth && Math.abs(S.vh - innerHeight) <= 2) return;
      // aynı kart ortada kalsın; kolon sayısı değişince kartlar yeni yerlerine yumuşakça kayar (sıçrama yok)
      const center = S.cx + viewCols(S) / 2;
      measure(S, id);
      const keep = center - viewCols(S) / 2;
      S.cx = keep;
      camera.stop();
      wall.rebuild();
      presenter?.refresh();
      renderBand();
      wall.render(); // boş kare kalmasın
      // kolon hizasına hep ileri (sağdan sola) oturur; geri gitmez
    camera.run(gsap.to(S, { cx: snapCamForward(S, keep), duration: motion.dur('columnShift'), ease: motion.ease.page }));
    }, 150);
  });

  // ekran koruyucudan çıkınca: kartlar mıknatısla gelir; kendi kendine sunumun sayacı ancak şimdi başlar
  loader.onExit(() => wall.magnet());
  loader.onGone(() => {
    presenter = startPresentation({ S, camera, wall, cmd, motion, id });
  });

  return { S, cmd };
}
