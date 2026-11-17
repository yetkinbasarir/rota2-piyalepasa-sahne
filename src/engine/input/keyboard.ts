/* Klavye ve TV kumandası → komut katmanı.
   Sol / sağ (kanal 428 / 427): kapalıyken bir kart kaydırır; açıkken sonraki / önceki kartı açar.
   Yukarı / aşağı: açık öğeyi kaydırır. Enter: ekran ortasındaki kartı açar.
   Esc / Backspace / kumanda geri (10009 Tizen, 461 webOS): açık öğeyi kapatır. */
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
    if (k === 'ArrowRight' || c === 427) cmd.arrow(1, 0);
    else if (k === 'ArrowLeft' || c === 428) cmd.arrow(-1, 0);
    else if (k === 'ArrowDown' || k === 'PageDown') cmd.arrow(0, 1);
    else if (k === 'ArrowUp' || k === 'PageUp') cmd.arrow(0, -1);
    else if (k === 'Enter') cmd.openCenter();
    else if (BACK_KEYS.has(k) || BACK_CODES.has(c)) cmd.close();
    else handled = false;
    if (handled) e.preventDefault();
  });
}
