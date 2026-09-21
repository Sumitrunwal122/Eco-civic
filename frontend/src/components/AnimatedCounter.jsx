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
    // --- Wrapper that produces the blurry dark-teal gradient background ---
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 12,
        background: `
          radial-gradient(120% 90% at 30% 85%, #2e5d54 0%, #1b3b36 35%, #0a1a17 70%, #000000 100%)
        `,
      }}
    >
      {/* Soft blur layer to get the hazy, out-of-focus feel */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          background: `
            radial-gradient(60% 50% at 25% 90%, rgba(72,140,120,0.55), transparent 70%),
            radial-gradient(50% 40% at 80% 20%, rgba(0,0,0,0.6), transparent 70%)
          `,
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <span
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: '3rem',
          fontWeight: 600,
          color: '#e8f2ef',
          letterSpacing: '-0.02em',
        }}
      >
        {display.toFixed(decimals)}
        {suffix}
      </span>
    </div>
  );
};

export default AnimatedCounter;
