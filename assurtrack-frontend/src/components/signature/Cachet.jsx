import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';
import styles from './Cachet.module.css';

/**
 * SIGNATURE (Caisse) — « Le Cachet ».
 * Tampon officiel apposé sur une opération remboursée. Quand la patronne
 * valide, le cachet s'abat (slam). C'est l'acte de validation rendu physique.
 *
 * justApplied : joue l'animation d'apposition (au moment de la validation).
 */
export default function Cachet({ date, by, justApplied = false, size = 'md' }) {
  const reduce = useReducedMotion();

  const slam = justApplied && !reduce
    ? {
        initial: { scale: 2.1, rotate: -26, opacity: 0 },
        animate: { scale: 1, rotate: -9, opacity: 1 },
        transition: { type: 'spring', stiffness: 520, damping: 16, mass: 0.7 },
      }
    : {
        initial: false,
        animate: { scale: 1, rotate: -9, opacity: 1 },
      };

  return (
    <motion.span className={styles.cachet} data-size={size} {...slam} aria-hidden>
      <span className={styles.inner}>
        <span className={styles.row}>
          <Check size={size === 'sm' ? 12 : 14} strokeWidth={3} />
          <span className={styles.word}>REMBOURSÉ</span>
        </span>
        {date && <span className={`${styles.date} tabular`}>{formatDateTime(date)}</span>}
        {by && <span className={styles.by}>par {by}</span>}
      </span>
    </motion.span>
  );
}
