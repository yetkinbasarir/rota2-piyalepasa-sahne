/* Giriş: kimlik + içerik seçilir, motor başlatılır.
   İkinci bir kimlik için yalnızca bu import değişir. */
import { startEngine } from './engine';
import { rota1 } from './identity/rota1';
import { SHOWS } from './content/shows';

startEngine(rota1, SHOWS);
