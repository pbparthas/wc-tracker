import React from "react";

/* The "topbins" mark, inline and theme-aware: goal frame in the ink/text
   colour, trajectory + ball in the accent — so it prints correctly on paper,
   in lights-out mode, and on any league accent. */
export default function Logo({ size = 20 }) {
  const h = size;
  const w = Math.round(size * 1.45);
  return (
    <svg viewBox="30 180 460 320" width={w} height={h} aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-2px" }}>
      <line x1="34" y1="432" x2="478" y2="432" stroke="currentColor" strokeWidth="14" opacity="0.35" />
      <path d="M64 432 L64 222 L448 222 L448 432" stroke="currentColor" strokeWidth="26" strokeLinecap="round" fill="none" />
      <path d="M92 478 Q 214 462 384 304" stroke="var(--saffron)" strokeWidth="20" fill="none" strokeLinecap="round" strokeDasharray="2 40" />
      <circle cx="396" cy="278" r="52" fill="var(--saffron)" />
    </svg>
  );
}
