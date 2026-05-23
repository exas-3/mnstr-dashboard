import React from 'react';

type Props = {
  size?: number;
  mascotUrl?: string;
  mono?: boolean;
  color?: string;
  className?: string;
  ariaLabel?: string;
};

export function MnstrWatch({
  size = 64,
  mascotUrl,
  mono = false,
  color = 'currentColor',
  className,
  ariaLabel = 'MnStr.watch',
}: Props) {
  const h = Math.round((size * 280) / 240);
  // Mascot is rendered at 60% of watch width with `auto` height so the wide
  // (~2.2:1) pixel-art SVG shows in full. Anchored at the watch's vertical
  // dial center (~53% of total height) so it sits inside the dark recess
  // rather than the bezel up top.
  const mascotWidth = Math.round(size * 0.6);

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        lineHeight: 0,
        width: size,
        height: h,
        color,
      }}
      role="img"
      aria-label={ariaLabel}
    >
      {mono ? <WatchMono size={size} h={h} /> : <WatchFoil size={size} h={h} />}
      {mascotUrl && (
        <img
          src={mascotUrl}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '53%',
            transform: 'translate(-50%, -50%)',
            width: mascotWidth,
            height: 'auto',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      )}
    </span>
  );
}

function WatchFoil({ size, h }: { size: number; h: number }) {
  return (
    <svg viewBox="0 0 240 280" width={size} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="bezel-foil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.93 0.13 88)" />
          <stop offset="0.3" stopColor="oklch(0.84 0.16 85)" />
          <stop offset="0.7" stopColor="oklch(0.66 0.14 75)" />
          <stop offset="1" stopColor="oklch(0.45 0.12 55)" />
        </linearGradient>
        <radialGradient id="dial-bg" cx="0.3" cy="0.25" r="0.9">
          <stop offset="0" stopColor="oklch(0.20 0.012 75)" />
          <stop offset="1" stopColor="oklch(0.07 0 0)" />
        </radialGradient>
        <pattern id="tapisserie" patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="4" cy="4" r="0.7" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>
      <g transform="translate(120 14)">
        <rect x="-14" y="0" width="28" height="30" rx="14" fill="none" stroke="oklch(0.78 0.008 85)" strokeWidth="5" />
        <rect x="-9" y="22" width="18" height="22" rx="3" fill="oklch(0.12 0.01 75)" stroke="oklch(0.30 0.01 75)" strokeWidth="1.4" />
        <circle cx="0" cy="33" r="4" fill="oklch(0.08 0 0)" stroke="oklch(0.62 0.14 70)" strokeWidth="1.2" />
      </g>
      <g transform="translate(20 56)">
        <polygon points="58,4 142,4 196,58 196,142 142,196 58,196 4,142 4,58" fill="oklch(0.09 0.005 75)" stroke="oklch(0.22 0.01 75)" strokeWidth="1" />
        <polygon points="64,12 136,12 188,64 188,136 136,188 64,188 12,136 12,64" fill="url(#bezel-foil)" />
        <polygon points="74,28 126,28 172,74 172,126 126,172 74,172 28,126 28,74" fill="url(#dial-bg)" stroke="oklch(0.05 0 0)" strokeWidth="1" />
        <polygon points="74,28 126,28 172,74 172,126 126,172 74,172 28,126 28,74" fill="url(#tapisserie)" opacity="0.7" />
        <g fill="oklch(0.06 0 0)" stroke="oklch(0.62 0.14 70)" strokeWidth="0.8">
          <polygon points="100,15 106,18 106,24 100,27 94,24 94,18" />
          <polygon points="166,40 172,43 172,49 166,52 160,49 160,43" />
          <polygon points="178,93 184,96 184,102 178,105 172,102 172,96" />
          <polygon points="166,153 172,156 172,162 166,165 160,162 160,156" />
          <polygon points="100,178 106,181 106,187 100,190 94,187 94,181" />
          <polygon points="34,153 40,156 40,162 34,165 28,162 28,156" />
          <polygon points="22,93 28,96 28,102 22,105 16,102 16,96" />
          <polygon points="34,40 40,43 40,49 34,52 28,49 28,43" />
        </g>
        <g stroke="oklch(0.45 0 0)" strokeWidth="0.9" strokeLinecap="round">
          <line x1="98" y1="18" x2="103" y2="24" />
          <line x1="164" y1="43" x2="169" y2="49" />
          <line x1="176" y1="96" x2="181" y2="102" />
          <line x1="164" y1="156" x2="169" y2="162" />
          <line x1="98" y1="181" x2="103" y2="187" />
          <line x1="32" y1="156" x2="37" y2="162" />
          <line x1="20" y1="96" x2="25" y2="102" />
          <line x1="32" y1="43" x2="37" y2="49" />
        </g>
        <polygon points="74,28 126,28 172,74 172,126 126,172 74,172 28,126 28,74" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
        <g fill="oklch(0.84 0.16 85)" opacity="0.9">
          <rect x="98" y="38" width="4" height="8" />
          <rect x="98" y="154" width="4" height="8" />
          <rect x="38" y="98" width="8" height="4" />
          <rect x="154" y="98" width="8" height="4" />
        </g>
        <circle cx="100" cy="92" r="32" fill="oklch(0.05 0 0)" opacity="0.6" />
        <text x="100" y="148" fontFamily="UnifrakturCook, UnifrakturMaguntia, serif" fontSize="26" fill="oklch(0.96 0.01 85)" textAnchor="middle" fontWeight="700">Mn$tr</text>
        <text x="101" y="162" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6.5" fill="#e3ae2c" textAnchor="middle" letterSpacing="3">·  W  A  T  C  H  ·</text>
      </g>
    </svg>
  );
}

function WatchMono({ size, h }: { size: number; h: number }) {
  return (
    <svg viewBox="0 0 240 280" width={size} height={h} style={{ display: 'block', color: 'currentColor' }}>
      <g transform="translate(120 14)">
        <rect x="-14" y="0" width="28" height="30" rx="14" fill="none" stroke="currentColor" strokeWidth="5" />
        <rect x="-9" y="22" width="18" height="22" rx="3" fill="currentColor" opacity="0.18" />
        <circle cx="0" cy="33" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </g>
      <g transform="translate(20 56)" fill="none" stroke="currentColor">
        <polygon points="58,4 142,4 196,58 196,142 142,196 58,196 4,142 4,58" strokeWidth="2" />
        <polygon points="64,12 136,12 188,64 188,136 136,188 64,188 12,136 12,64" strokeWidth="1.5" />
        <polygon points="74,28 126,28 172,74 172,126 126,172 74,172 28,126 28,74" strokeWidth="1.4" />
        <g fill="currentColor">
          <polygon points="100,15 106,18 106,24 100,27 94,24 94,18" />
          <polygon points="166,40 172,43 172,49 166,52 160,49 160,43" />
          <polygon points="178,93 184,96 184,102 178,105 172,102 172,96" />
          <polygon points="166,153 172,156 172,162 166,165 160,162 160,156" />
          <polygon points="100,178 106,181 106,187 100,190 94,187 94,181" />
          <polygon points="34,153 40,156 40,162 34,165 28,162 28,156" />
          <polygon points="22,93 28,96 28,102 22,105 16,102 16,96" />
          <polygon points="34,40 40,43 40,49 34,52 28,49 28,43" />
        </g>
        <g fill="currentColor">
          <rect x="98" y="38" width="4" height="8" />
          <rect x="98" y="154" width="4" height="8" />
          <rect x="38" y="98" width="8" height="4" />
          <rect x="154" y="98" width="8" height="4" />
        </g>
        <text x="100" y="148" fontFamily="UnifrakturCook, serif" fontSize="26" fill="currentColor" textAnchor="middle" fontWeight="700" stroke="none">Mn$tr</text>
        <text x="101" y="162" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="currentColor" textAnchor="middle" letterSpacing="3" stroke="none">·  W  A  T  C  H  ·</text>
      </g>
    </svg>
  );
}
