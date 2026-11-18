/* Motor: bir kimlik + içerik listesi alır, 3B daire galerisini kurar ve çalıştırır. */
import './engine.css';
import { gsap, createMotion } from './motion';
import { applyIdentity, buildDom, landscapeQuery } from './theme';
import { createState, measure, esc } from './state';
import { createMedia } from './media';
import { createCounters } from './counter';
import { createGallery } from './gallery';
import { createFullVideo } from './fullVideo';
import { createCamera } from './camera';
import { createCommands } from './commands';
import { startPresentation } from './present';
import { createLoader } from './loader';
import { layoutScreen } from './screen';
import { bindPointer } from './input/pointer';
import { bindWheel } from './input/wheel';
import { bindKeyboard } from './input/keyboard';
import { createSlides } from './slides';
import type { Identity, Show, TemplateContext } from './types';

export async function startEngine(id: Identity, shows: Show[]) {
  const motion = createMotion(id);
  applyIdentity(id);
  const dom = buildDom(id);
  const S = createState();
  measure(S, id);
  // ilk ekran (index.html'de satır içi siyah katman): galeri gizli, sitenin logosu ve üye düğmeleri üstünde
  const loader = createLoader({
    id, motion, surface: dom.surface, brand: dom.brand, members: dom.members,
    gallery: [dom.shadows, dom.stage, dom.ui],
  });

  const media = await createMedia();
  let visible: () => Iterable<Element> = () => [];
  const counters = createCounters(shows, () => visible(), id.counterFormat.sep);
  const tctx = (): TemplateContext => ({
    mobile: S.mobile,
    vw: S.vw,
    vh: S.vh,
    countdown: (s) => counters.values(s),
    sep: id.counterFormat.sep,
    esc,
  });

  const gallery = createGallery({
    S, id, motion, media, shows, dom, tctx,
    video: createFullVideo({ root: dom.video, motion, id }),
    busy: () => camera.busy(),
    onCreate: (el) => counters.fill(el),
  });
  // künye sayacı ve tam ekran başlığının sayacı saniye saniye güncellenir
  visible = () => gallery.visible();
  const camera = createCamera(S, id, motion);
  const cmd = createCommands({ S, id, camera, gallery });

  bindPointer(dom.surface, cmd);
  // fare eğimi (dokunmatikte yok)
  dom.surface.addEventListener('pointermove', (e) => gallery.hover(e));
  dom.surface.addEventListener('pointerleave', () => gallery.hover(null));
  bindWheel(dom.surface, cmd, id.gallery.wheel.idle);
  // kimlik slayt gösterisi: tuşları galeriden önce alır (açıkken galeriye geçmez)
  const slides = createSlides({
    id, before: dom.brand, reduced: motion.reduced,
    hold(on) {
      S.slides = on;
      gallery.hold(on);
      // kapanınca kendiliğinden ilerleme sayacı baştan
      if (!on) camera.touch();
    },
  });
  bindKeyboard(cmd);
  // logo (yükleme ekranı kalktıktan sonra, görünen logo): slayt gösterisini açar / kapatır; tıklama galeriye geçmez
  let logoLive = false;
  const logoHit = (e: Event) => {
    if (!logoLive) return false;
    const part = (e.target as Element | null)?.closest?.<HTMLElement>('.lg-l, .lg-s');
    return !!part && parseFloat(getComputedStyle(part).opacity) >= 0.5;
  };
  for (const t of ['pointerdown', 'touchstart']) dom.brand.addEventListener(t, (e) => logoHit(e) && e.stopPropagation());
  dom.brand.addEventListener('click', (e) => {
    if (!logoHit(e)) return;
    e.stopPropagation();
    slides.toggle();
  });

  // ekran çerçevesi, sonra ondan hesaplanan galeri yerleşimi
  const layout = () => {
    layoutScreen(S, id, dom, tctx());
    gallery.layout();
  };
  layout();
  // fontlar yüklenince logo, yazılar ve galeri yerleşimi yeniden ölçülür
  document.fonts?.ready.then(() => {
    layout();
    gallery.refresh();
  });
  // kapatma ikonu: dokununca tam ekrandan galeriye dönülür; tıklama alttaki katmanlara geçmez
  dom.close.innerHTML = id.templates.closeIcon(tctx());
  dom.close.addEventListener('pointerdown', (e) => e.stopPropagation());
  dom.close.addEventListener('click', (e) => {
    e.stopPropagation();
    cmd.close();
  });

  // ilk ekranda görünecek daire görselleri
  const N = shows.length;
  const A = id.gallery.around;
  const firstScreen = new Set<Show>();
  for (let n = -A; n <= A; n++) firstScreen.add(shows[((n % N) + N) % N]);
  const discW = () => id.gallery.layout.cap[S.mobile ? 'mobile' : 'web'] * S.vw * id.gallery.photoZoom;
  const firstImages = media.preload([...firstScreen], discW());
  // Görselleri ilk çizimden önce yükle + decode et (en fazla kısa bir süre bekle)
  await Promise.race([firstImages, new Promise((r) => setTimeout(r, 1200))]);
  gsap.ticker.add(gallery.render);
  // ilk ekranın daireleri başlar; çıkış açılır (galeri altında hazır)
  loader.start({ shows, media, mobile: () => S.mobile });
  const later = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 300));
  later(() => media.preload(shows, discW()));

  let presenter: { refresh(): void } | null = null;
  let resizeTimer = 0;
  /* telefonda yatay ekran: katman açıkken galeri yeniden kurulmaz, durum korunur; her şey bekler.
     Dikleşince katman kaybolur, yerleşim dikey ölçüye göre bir kez (gerekirse) yeniden hesaplanır */
  const landscape = matchMedia(landscapeQuery(id));
  let before: { vw: number; vh: number } | null = null;
  const relayout = () => {
    camera.stop();
    measure(S, id);
    // aynı daire ortada kalır
    S.pos = Math.round(S.pos);
    gallery.rebuild();
    presenter?.refresh();
    layout();
    gallery.refresh();
    gallery.render(); // boş kare kalmasın
  };
  const rotateOn = () => {
    if (S.paused) return;
    S.paused = true;
    before = { vw: innerWidth, vh: innerHeight };
    gsap.killTweensOf(dom.rotate);
    gsap.set(dom.rotate, { autoAlpha: 1 });
    dom.rotate.classList.add('rot--on');
    gallery.suspend(true);
    gsap.globalTimeline.pause();
  };
  const rotateOff = () => {
    if (!S.paused) return;
    S.paused = false;
    gsap.globalTimeline.resume();
    // dikey ölçü değiştiyse bir kez yeniden hesaplanır; aynıysa her şey kaldığı yerden sürer
    const changed = !before || Math.abs(innerWidth - before.vw) > 1 || Math.abs(innerHeight - before.vh) > 1;
    if (changed && (S.vw !== innerWidth || Math.abs(S.vh - innerHeight) > 1)) relayout();
    else gallery.suspend(false);
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
      relayout();
    }, 150);
  });

  // ilk ekran tamamen kalkınca kendiliğinden ilerleme ve kendi kendine sunumun sayacı başlar
  loader.onGone(() => {
    logoLive = true;
    dom.brand.classList.add('is-live');
    camera.autoplay(true);
    presenter = startPresentation({ S, camera, gallery, cmd, motion, id });
  });

  return { S, cmd };
}
