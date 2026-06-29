/**
 * Logo AssurTrack — bouclier (protection/assurance) traversé par la ligne
 * d'horizon des échéances avec un tick d'or. La marque cite la signature.
 *
 * variant : "light" (sur fond sombre) | "dark" (sur fond clair)
 * showWordmark : afficher le mot AssurTrack à côté du symbole
 */
export default function Logo({
  variant = 'light',
  showWordmark = true,
  size = 32,
  className = '',
}) {
  const ink = variant === 'light' ? '#FFFFFF' : 'var(--primary-900)';
  const muted = variant === 'light' ? 'rgba(255,255,255,0.45)' : 'var(--gray-400)';

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        role="img"
        aria-label="AssurTrack"
      >
        {/* Bouclier */}
        <path
          d="M16 2.5 27 6.2v8.6c0 7-4.7 12.3-11 14.7C9.7 27.1 5 21.8 5 14.8V6.2L16 2.5Z"
          stroke={ink}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Ligne d'horizon des échéances */}
        <line x1="8.5" y1="16.5" x2="23.5" y2="16.5" stroke={muted} strokeWidth="1.4" />
        {/* Ticks d'échéance approchant */}
        <line x1="11" y1="14.6" x2="11" y2="18.4" stroke={muted} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="15" y1="13.8" x2="15" y2="19.2" stroke={muted} strokeWidth="1.4" strokeLinecap="round" />
        {/* Tick critique : or */}
        <line x1="19.4" y1="12.6" x2="19.4" y2="20.4" stroke="#E89A0A" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="19.4" cy="10.6" r="1.7" fill="#E89A0A" />
      </svg>

      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: size * 0.66,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: ink,
          }}
        >
          AssurTrack
        </span>
      )}
    </span>
  );
}
