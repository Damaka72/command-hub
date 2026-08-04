'use client';

import { useEffect, useRef, useState } from 'react';

// SVG progress ring used by the home hero dial (150px) and per-site panel
// headers (46px). Always carries role="img" + an aria-label stating the
// percentage — the number must never be conveyed by colour alone (UX spec §9).

interface ProgressRingProps {
  size:          number;
  strokeWidth?:  number;
  pct:           number; // 0-100
  label:         string; // e.g. "Pushed" or a site name — used to build the aria-label
  color?:        string; // solid stroke colour; ignored if `gradient` is true
  gradient?:     boolean; // blue→purple gradient — reserved for the home hero dial
  trackColor?:   string;
  animate?:      boolean; // false for panel-header rings, which should not restage on every open/close
  centerText?:   boolean; // render the percentage + sublabel in the centre (hero dial only)
  subLabel?:     string;
}

let gradientIdSeq = 0;

export default function ProgressRing({
  size,
  strokeWidth = size >= 100 ? 10 : 4,
  pct,
  label,
  color = 'var(--ok)',
  gradient = false,
  trackColor = 'var(--line-2)',
  animate = true,
  centerText = false,
  subLabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [displayPct, setDisplayPct] = useState(animate ? 0 : clamped);
  const [dashOffset, setDashOffset] = useState(animate ? circumference : circumference - (clamped / 100) * circumference);
  const [gradientId] = useState(() => `hub-ring-gradient-${++gradientIdSeq}`);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!animate || reduceMotion.current) {
      setDisplayPct(clamped);
      setDashOffset(circumference - (clamped / 100) * circumference);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5); // approximates cubic-bezier(.22,1,.36,1)
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuint(t);
      setDisplayPct(Math.round(eased * clamped));
      setDashOffset(circumference - (eased * clamped / 100) * circumference);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped, circumference, animate]);

  return (
    <div
      role="img"
      aria-label={`${label}: ${clamped}%`}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {centerText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono-num font-semibold" style={{ fontSize: size * 0.24, color: 'var(--fg)', lineHeight: 1 }}>
            {displayPct}%
          </span>
          {subLabel && (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>
              {subLabel}
            </span>
          )}
        </div>
      )}
      {!centerText && size < 100 && (
        <span className="absolute mono-num font-semibold" style={{ fontSize: size * 0.26, color: 'var(--fg)' }}>
          {displayPct}%
        </span>
      )}
    </div>
  );
}
