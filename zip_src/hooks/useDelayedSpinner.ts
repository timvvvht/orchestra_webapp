import { useEffect, useState } from 'react';

/**
 * useDelayedSpinner – returns true only if `active` remains true for `delayMs`.
 * Prevents flicker for fast-resolving loading states.
 */
export default function useDelayedSpinner(active: boolean, delayMs = 300): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (active) {
      timer = setTimeout(() => setShow(true), delayMs);
    } else {
      setShow(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [active, delayMs]);

  return show;
}