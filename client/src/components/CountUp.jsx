import React, { useState, useEffect } from 'react';

/**
 * Lightweight, 60fps CountUp component with ease-out cubic animation
 * Adheres to prefers-reduced-motion
 */
function CountUp({ value = 0, duration = 750 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // If reduced motion is requested or target is 0, render immediately
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return;
    }

    if (target === 0) {
      setDisplay(0);
      return;
    }

    let startTime = null;
    let animId;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: fast start, soft deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easeOut * target);

      setDisplay(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [target, duration]);

  return <span>{display}</span>;
}

export default CountUp;
