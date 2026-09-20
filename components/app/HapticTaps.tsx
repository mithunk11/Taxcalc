'use client';
import { useEffect } from 'react';

/**
 * A buzz under the thumb, for every control, from one place.
 *
 * Mounted once in the layout rather than wired into each button. A delegated
 * `pointerdown` listener is closer to what a native app does anyway: the phone
 * answers when your finger lands, not when it lifts and the click resolves.
 *
 * Three things it deliberately does not do:
 *
 * - It ignores a mouse. `pointerType` tells us, and a desktop buzzing at a
 *   cursor would be a bug, not a feature.
 * - It ignores disabled controls, which have nothing to acknowledge.
 * - It does nothing at all when the browser has no `vibrate` — Safari on iOS
 *   has none, so roughly half the audience feels this and nobody depends on
 *   it. Nothing in the product is conveyed by a buzz; every state it
 *   accompanies is also on screen.
 *
 * Reduced motion turns it off too. That setting is about vestibular and
 * sensory load, not pixels, and somebody who asked their phone to stop moving
 * things has not asked it to start buzzing instead.
 */
export function HapticTaps() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      const target = event.target as Element | null;
      const control = target?.closest?.('button, [role="button"], summary, label[for]');
      if (!control || (control as HTMLButtonElement).disabled) return;
      /* 8ms reads as the interface acknowledging a touch. Anything near 50ms
         starts to read as an error, whatever it was meant to say. */
      try { navigator.vibrate(8); } catch { /* a browser that throws does not do this */ }
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return null;
}
