import styles from './Loader.module.css';

/** Spinner premium : anneau bleu nuit + arc or qui tourne. */
export default function Loader({ size = 28, label = 'Chargement…', center = false }) {
  const ring = (
    <span
      className={styles.ring}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
  if (!center) return ring;
  return (
    <div className={styles.center}>
      {ring}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

/** Bloc squelette pour les états de chargement de contenu. */
export function Skeleton({ width = '100%', height = 16, radius = 6, className = '' }) {
  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}
