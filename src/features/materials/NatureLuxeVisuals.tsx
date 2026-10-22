export function NatureHeroArtwork() {
  return (
    <div className="nature-hero-art" aria-hidden="true">
      <svg className="nature-hero-svg" viewBox="0 0 540 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e3f3eb" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ecf7f5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d8edf6" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#eef6f3" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d3e9f3" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="treeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#437752" />
            <stop offset="100%" stopColor="#255135" />
          </linearGradient>
          <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#40695b" />
            <stop offset="60%" stopColor="#284e3d" />
            <stop offset="100%" stopColor="#1a3528" />
          </linearGradient>
          <linearGradient id="breastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d654" />
            <stop offset="100%" stopColor="#dfa724" />
          </linearGradient>
          <pattern id="dotPatternHero" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="1.6" fill="#ffffff" fillOpacity="0.9" />
          </pattern>
        </defs>

        {/* Soft background glow */}
        <rect width="540" height="320" rx="16" fill="url(#skyGrad)" />

        {/* Distant building silhouette */}
        <path d="M220 320V120h80v200M300 320V90h65v230M365 320V140h55v180" fill="#cbe2d7" fillOpacity="0.4" />

        {/* Modern glass facade with canopy */}
        <g opacity="0.85">
          <path d="M280 40h170v280H280Z" fill="url(#glassGrad)" stroke="#b8d9cb" strokeWidth="1.5" />
          <path d="M280 40h170v280H280Z" fill="url(#dotPatternHero)" />
          {/* Glass mullions */}
          <line x1="336" y1="40" x2="336" y2="320" stroke="#a4cdbc" strokeWidth="1.5" />
          <line x1="392" y1="40" x2="392" y2="320" stroke="#a4cdbc" strokeWidth="1.5" />
          <line x1="280" y1="130" x2="450" y2="130" stroke="#a4cdbc" strokeWidth="1.5" />
          <line x1="280" y1="220" x2="450" y2="220" stroke="#a4cdbc" strokeWidth="1.5" />
          {/* Architectural overhang */}
          <polygon points="260,38 470,38 450,52 280,52" fill="#88b5a0" opacity="0.7" />
        </g>

        {/* Lush green foliage layers */}
        <path d="M190 320c15-40 40-75 75-80 30-4 50 15 65 40 10-25 35-45 60-35 25 10 40 45 45 75Z" fill="url(#treeGrad)" opacity="0.85" />
        <path d="M230 320c12-30 30-50 55-55 22-4 38 12 50 30 8-20 28-35 48-28 20 8 32 32 37 53Z" fill="#588e67" opacity="0.6" />

        {/* Flying Songbird (Great Tit / Bulbul inspired) */}
        <g transform="translate(145, 60) scale(0.95)">
          {/* Wings left/right spread */}
          {/* Left Wing (upper) */}
          <path d="M-15 15 C-25 -10, -50 -45, -75 -40 C-65 -20, -50 0, -25 20 Z" fill="url(#wingGrad)" />
          <path d="M-20 10 C-30 -5, -55 -30, -70 -25 C-60 -10, -45 5, -25 18 Z" fill="#608b79" opacity="0.7" />
          <path d="M-75 -40 C-70 -35, -45 -10, -20 18" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />

          {/* Right Wing (rear) */}
          <path d="M10 10 C20 -15, 45 -50, 70 -55 C65 -30, 48 -5, 20 15 Z" fill="url(#wingGrad)" />
          <path d="M12 8 C22 -10, 42 -35, 60 -40 C55 -20, 40 0, 20 14 Z" fill="#527d6d" opacity="0.7" />
          <path d="M70 -55 C60 -40, 38 -15, 15 12" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />

          {/* Tail */}
          <path d="M-4 35 L-8 75 L3 72 L8 76 L4 35 Z" fill="#203d30" />
          <path d="M-6 40 L-2 70 L2 40 Z" fill="#395f4e" />

          {/* Body & Golden Yellow Breast */}
          <ellipse cx="0" cy="24" rx="13" ry="19" fill="url(#breastGrad)" />
          {/* Olive back */}
          <path d="M-7 12 C-10 18, -10 32, -3 38 C-9 32, -10 20, -7 12 Z" fill="#789d53" />

          {/* Head & Crown */}
          <ellipse cx="-2" cy="7" rx="9" ry="9" fill="#1b3027" />
          {/* White cheek patch */}
          <path d="M-4 6 C-1 4, 4 6, 4 10 C2 13, -2 13, -4 10 Z" fill="#ffffff" />
          {/* Eye */}
          <circle cx="-1" cy="7" r="1.5" fill="#080e0b" />
          <circle cx="-1.4" cy="6.6" r="0.5" fill="#ffffff" />
          {/* Beak */}
          <polygon points="-8,7 -15,9 -8,11" fill="#1b2a22" />
        </g>

        {/* Decorative corner leaves */}
        <g transform="translate(10, 8)" opacity="0.75">
          <path d="M0 0 C25 5, 45 30, 35 55 C20 40, 10 20, 0 0 Z" fill="#699f57" />
          <path d="M20 20 C40 15, 60 30, 55 50 C40 45, 30 35, 20 20 Z" fill="#8bc370" />
          <path d="M0 15 C15 30, 15 50, 0 60 C-5 45, -5 30, 0 15 Z" fill="#588e49" />
        </g>
        <g transform="translate(480, 10) scale(-1, 1)" opacity="0.75">
          <path d="M0 0 C25 5, 45 30, 35 55 C20 40, 10 20, 0 0 Z" fill="#699f57" />
          <path d="M20 20 C40 15, 60 30, 55 50 C40 45, 30 35, 20 20 Z" fill="#8bc370" />
        </g>

        {/* Script Callout Text */}
        <g transform="translate(425, 255) rotate(-4)">
          <text
            x="0"
            y="0"
            fontFamily="'Caveat', 'Brush Script MT', 'Segoe Script', cursive, sans-serif"
            fontSize="18"
            fontStyle="italic"
            fontWeight="bold"
            fill="#1e4e37"
            textAnchor="middle"
          >
            Glass that gives
          </text>
          <text
            x="0"
            y="20"
            fontFamily="'Caveat', 'Brush Script MT', 'Segoe Script', cursive, sans-serif"
            fontSize="18"
            fontStyle="italic"
            fontWeight="bold"
            fill="#1e4e37"
            textAnchor="middle"
          >
            birds a chance.
          </text>
          <path d="M-40 28 Q 0 32, 40 28" stroke="#3d825f" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}

export function BirdSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
      <path
        d="M2 18 C7 15, 12 10, 17 4 C18 9, 21 11, 26 10 C24 13, 21 15, 18 16 C16 17, 15 19, 14 22 C13 19, 10 18, 2 18 Z"
        fill="#235c43"
        opacity="0.85"
      />
      <path
        d="M17 4 C20 2, 23 2, 25 3 C22 5, 19 6, 17 4 Z"
        fill="#184230"
      />
    </svg>
  );
}

export function ForestSilhouette() {
  return (
    <div className="forest-silhouette-wrapper" aria-hidden="true">
      <svg viewBox="0 0 400 90" fill="none" preserveAspectRatio="none" className="forest-silhouette-svg">
        <defs>
          <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60%" stopColor="#d8ede2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c5e3d2" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Soft mountain hills in mist */}
        <path d="M0 70 Q 100 40, 200 55 T 400 50 L 400 90 L 0 90 Z" fill="#cbe3d4" opacity="0.4" />
        {/* Distant trees */}
        <path d="M0 90 L10 65 L20 90 L35 60 L50 90 L70 55 L90 90 L120 50 L145 90 L180 52 L210 90 L240 58 L270 90 L300 48 L330 90 L360 55 L385 90 L400 62 L400 90 Z" fill="#9ecdb3" opacity="0.35" />
        {/* Foreground tree silhouettes */}
        <path d="M0 90 L15 72 L30 90 L60 68 L85 90 L130 65 L160 90 L205 62 L235 90 L280 64 L310 90 L345 66 L375 90 L400 70 L400 90 Z" fill="#66a37f" opacity="0.3" />
        {/* Subtle flying birds */}
        <path d="M70 25 Q 74 20, 78 24 Q 82 20, 86 25" stroke="#3d6c54" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M120 18 Q 123 14, 126 17 Q 129 14, 132 18" stroke="#3d6c54" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
        {/* Mist overlay */}
        <rect width="400" height="90" fill="url(#mistGrad)" />
      </svg>
    </div>
  );
}

export function MaterialSampleThumbnail({ materialId }: { materialId?: string }) {
  const isClear = materialId === 'premium-clear-film';
  const isFrosted = materialId === 'die-cut-frosted';

  return (
    <div className={`material-photo-thumb material-thumb-${materialId ?? 'standard'}`} aria-hidden="true">
      <svg viewBox="0 0 160 160" fill="none" className="material-sample-svg">
        <defs>
          <linearGradient id="filmShine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e3f0ea" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#b6d8ca" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="rollCore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#557564" />
            <stop offset="100%" stopColor="#2c4b3c" />
          </linearGradient>
        </defs>

        {/* Background sheet */}
        <rect width="160" height="160" rx="12" fill={isClear ? '#ebf5fb' : isFrosted ? '#f0f4f1' : '#eaf4ee'} />

        {/* Film curl / sheet with perspective */}
        <path
          d="M15 130 C30 70, 70 30, 145 20 L155 90 C95 105, 55 140, 30 155 Z"
          fill="url(#filmShine)"
          stroke="#bcdfd0"
          strokeWidth="1"
        />

        {/* Regular 50mm white dot grid across film */}
        <g fill="#ffffff" fillOpacity={isFrosted ? '0.75' : '0.95'}>
          {[
            [35, 115], [55, 95], [75, 75], [95, 58], [118, 42], [140, 28],
            [48, 128], [68, 108], [88, 88], [108, 70], [130, 54],
            [62, 140], [82, 120], [102, 100], [122, 82], [144, 66],
            [95, 132], [115, 112], [135, 95]
          ].map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={isFrosted ? 3.8 : 3.2}
              stroke={isFrosted ? '#a8bfae' : 'rgba(0,0,0,0.06)'}
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Film roll cylinder on left edge */}
        <path
          d="M10 148 C5 140, 8 60, 28 25 C35 15, 45 22, 40 35 C25 65, 20 135, 25 155 Z"
          fill="url(#rollCore)"
          opacity="0.85"
        />
        {/* Core circle */}
        <ellipse cx="28" cy="25" rx="8" ry="12" fill="#759684" stroke="#ffffff" strokeWidth="1" />
        <ellipse cx="28" cy="25" rx="4" ry="6" fill="#1e382b" />
      </svg>
    </div>
  );
}
