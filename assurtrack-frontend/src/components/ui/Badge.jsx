import styles from './Badge.module.css';

/**
 * Badge / pill statut. tone : neutral | success | danger | warning | gold | info
 * dot : pastille colorée en tête.
 */
export default function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`${styles.badge} ${className}`} data-tone={tone}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}
