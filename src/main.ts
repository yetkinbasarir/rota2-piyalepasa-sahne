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
