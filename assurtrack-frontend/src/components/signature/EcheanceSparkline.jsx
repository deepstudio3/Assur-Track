import { daysUntil, echeanceLevel, jLabel } from '../../utils/formatDate';
import styles from './EcheanceSparkline.module.css';

/**
 * Déclinaison inline de l'Horizon pour les lignes de la liste Relance :
 * une mini-piste avec un point positionné selon l'échéance + le compteur J-X.
 */
export default function EcheanceSparkline({ date, windowDays = 30 }) {
  const d = daysUntil(date);
  const level = echeanceLevel(date);
  const clamped = d == null ? 0 : Math.min(Math.max(d, 0), windowDays);
  const x = d != null && d < 0 ? 100 : 2 + (1 - clamped / windowDays) * 96;

  return (
    <span className={styles.wrap} data-level={level}>
      <span className={styles.track}>
        <span className={styles.dot} style={{ left: `${x}%` }} />
        <span className={styles.wall} />
      </span>
      <span className={`${styles.j} tabular`}>{jLabel(date)}</span>
    </span>
  );
}
