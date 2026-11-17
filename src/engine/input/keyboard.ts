/* Klavye ve TV kumandası → komut katmanı.
   Sağ / aşağı (kanal 427): sonraki daire ortaya gelir; sol / yukarı (kanal 428): önceki.
   Enter: ortadaki daireyi açar. Esc / Backspace / kumanda geri (10009 Tizen, 461 webOS): tam ekrandan galeriye. */
import type { Commands } from '../commands';

const BACK_KEYS = new Set(['Escape', 'Backspace', 'BrowserBack', 'GoBack']);
const BACK_CODES = new Set([10009, 461]);

export function bindKeyboard(cmd: Commands) {
  addEventListener('keydown', (e) => {
    const k = e.key;
    const c = e.keyCode;
    if ((k === 'Enter' || k === ' ') && (e.target as HTMLElement).closest?.('button')) return;
    cmd.input();
    let handled = true;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || c === 427) cmd.arrow(1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || c === 428) cmd.arrow(-1);
    else if (k === 'Enter') cmd.openCenter();
    else if (BACK_KEYS.has(k) || BACK_CODES.has(c)) cmd.close();
    else handled = false;
    if (handled) e.preventDefault();
  });
}
