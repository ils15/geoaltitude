import React from 'react';

/** Marca do OpenGeoaltitude: globo em wireframe + pico com ponto de medição. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="OpenGeoaltitude">
      <defs>
        <linearGradient id="og-bg-h" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#003a70" />
          <stop offset="0.55" stopColor="#004a8e" />
          <stop offset="1" stopColor="#00a1e4" />
        </linearGradient>
        <linearGradient id="og-peak-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#bfe3ff" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#og-bg-h)" />
      <g stroke="#ffffff" strokeOpacity="0.85" strokeWidth="13" fill="none" strokeLinecap="round">
        <circle cx="256" cy="224" r="142" />
        <ellipse cx="256" cy="224" rx="62" ry="142" />
        <path d="M129 172 H383" />
        <path d="M118 250 H394" />
        <path d="M150 322 C190 348 322 348 362 322" />
      </g>
      <path d="M256 186 L376 442 H136 Z" fill="url(#og-peak-h)" />
      <path d="M256 186 L376 442 H256 Z" fill="#8fc6ee" fillOpacity="0.85" />
      <circle cx="256" cy="186" r="34" fill="#fdb913" stroke="#ffffff" strokeWidth="10" />
    </svg>
  );
}
