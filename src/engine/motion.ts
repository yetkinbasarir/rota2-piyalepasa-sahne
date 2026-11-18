/* GSAP kurulumu: eklentiler, kimliğin CustomEase eğrileri, süreler ve azaltılmış hareket. */
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Observer } from 'gsap/Observer';
import type { Identity } from './types';

gsap.registerPlugin(CustomEase, InertiaPlugin, Observer);

export type EaseKey = keyof Identity['eases'];
export type DurKey = keyof Identity['durations'];

export interface Motion {
  ease: Record<EaseKey, string>;
  /** Süre (s); azaltılmış harekette kısalır */
  dur(key: DurKey): number;
  reduced: boolean;
}

/** Azaltılmış harekette süre çarpanı */
const REDUCED_FACTOR = 0.2;

export function createMotion(id: Identity): Motion {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = {} as Record<EaseKey, string>;
  for (const [k, path] of Object.entries(id.eases) as [EaseKey, string][]) {
    const name = `${id.id}-${k}`;
    CustomEase.create(name, path);
    ease[k] = name;
  }
  const NOT_SCALED: DurKey[] = ['videoIn', 'videoOut', 'videoTimeout', 'youtubeHold', 'soundIn', 'soundOut', 'autoReturn', 'presentIdle', 'presentOpen', 'presentPhoto', 'presentResume', 'closeFade'];
  return {
    ease,
    reduced,
    dur: (k) => (reduced && !NOT_SCALED.includes(k) ? id.durations[k] * REDUCED_FACTOR : id.durations[k]),
  };
}

export { gsap, Observer };
