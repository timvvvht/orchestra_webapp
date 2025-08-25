import { useEffect, useRef, useCallback } from 'react';

type DistanceMode = 'rect' | 'center';

interface UseGlobalMouseTrackingOptions {
  enabled?: boolean;
  computeDistance?: boolean;
  distanceMode?: DistanceMode;
  maxDistance?: number; // px until intensity saturates
}

export function useGlobalMouseTracking<T extends HTMLElement>(
  options: UseGlobalMouseTrackingOptions = {}
) {
  const {
    enabled = true,
    computeDistance = true,
    distanceMode = 'rect',
    maxDistance = 450,
  } = options;

  const elementRef = useRef<T>(null);
  const rafRef = useRef<number | null>(null);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // Anchor point clamped to nearest point on the element's rect — ensures the border glow is always visible
    const clampedClientX = Math.min(Math.max(clientX, rect.left), rect.right);
    const clampedClientY = Math.min(Math.max(clientY, rect.top), rect.bottom);
    const gx = clampedClientX - rect.left;
    const gy = clampedClientY - rect.top;

    let intensity = 0;
    if (computeDistance) {
      let dist = 0;
      if (distanceMode === 'rect') {
        const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
        const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
        dist = Math.hypot(dx, dy); // 0 if inside or touching the rect
      } else {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const r = Math.min(rect.width, rect.height) / 2;
        dist = Math.max(0, Math.hypot(clientX - cx, clientY - cy) - r);
      }
      const raw = clamp01(dist / maxDistance);
      // Proximity (awakening): stronger when closer.
      // Adjust curve to be more noticeable near; still smooth
      intensity = Math.pow(1 - raw, 1.6);
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      element.style.setProperty('--px', `${x}px`);
      element.style.setProperty('--py', `${y}px`);
      // anchored gradient center
      element.style.setProperty('--gpx', `${gx}px`);
      element.style.setProperty('--gpy', `${gy}px`);
      if (computeDistance) {
        // primary proximity variable
        element.style.setProperty('--p', `${intensity}`);
        // backward-compat
        element.style.setProperty('--white-i', `${intensity}`);
      }
      rafRef.current = null;
    });
  }, [computeDistance, distanceMode, maxDistance]);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (element) {
      element.style.setProperty('--px', '50%');
      element.style.setProperty('--py', '50%');
      element.style.setProperty('--gpx', '50%');
      element.style.setProperty('--gpy', '50%');
      element.style.setProperty('--p', '0');
      element.style.setProperty('--white-i', '0'); // quiet when we don't know yet
    }

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, updatePosition]);

  return elementRef;
}