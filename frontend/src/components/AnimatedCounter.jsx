import React, { useEffect, useRef, useState } from 'react';

/**
 * Counts up from 0 (or from its previous value) to `value` whenever `value`
 * changes, using requestAnimationFrame with an ease-out curve — no external
 * animation library required.
 *
 * Usage: <AnimatedCounter value={stats.pending} suffix="%" />
 */
const AnimatedCounter = ({ value = 0, duration = 800, suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    const start = performance.now();

    // Respect reduced-motion preference: jump straight to the value.
    const prefersReducedMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    if (prefersReducedMotion) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }

    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuint(t);
      const current = from + (to - from) * eased;
      setDisplay(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
