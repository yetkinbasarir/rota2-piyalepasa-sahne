/* Giriş: kimlik + içerik seçilir, motor başlatılır.
   İkinci bir kimlik için yalnızca bu import değişir.
   Açılış güvencesi: motor ilk ekranı başlatamadan çökerse (hata günlüğe yazılır) siyah katman 4 sn sonra
   kaldırılır; sayfa boş kalmaz. */
import { startEngine } from './engine';
import { rota1 } from './identity/rota1';
import { SHOWS } from './content/shows';

const rescue = () => {
  if (document.documentElement.classList.contains('ld-started')) return;
  document.getElementById('ld')?.remove();
};
try {
  startEngine(rota1, SHOWS).catch((e) => {
    console.error('[rota2] açılış', e);
    window.setTimeout(rescue, 4000);
  });
} catch (e) {
  console.error('[rota2] açılış', e);
  window.setTimeout(rescue, 4000);
}

/* Vercel Web Analytics (yalnızca sayfa görüntüleme): siyah ilk ekran göründükten sonra, boşta yüklenir;
   ayrı parça olarak gelir, açılışı asla bekletmez; hata olursa sessizce yutulur. */
const loadAnalytics = () => {
  try {
    import('@vercel/analytics')
      .then(({ inject }) => {
        try {
          inject();
        } catch {
          /* yok say */
        }
      })
      .catch(() => {
        /* yok say */
      });
  } catch {
    /* yok say */
  }
};
try {
  const later = () => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(loadAnalytics, { timeout: 5000 });
    else window.setTimeout(loadAnalytics, 1500);
  };
  // ilk boyamadan (siyah ilk ekran) sonra
  window.requestAnimationFrame(() => window.setTimeout(later, 0));
} catch {
  /* yok say */
}
