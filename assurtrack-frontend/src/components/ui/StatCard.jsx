import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import styles from './StatCard.module.css';

/**
 * Carte métrique. accent : default | gold | success | danger
 * trend : { value: '+12%', dir: 'up' | 'down' }
 */
export default function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = 'default',
  trend,
  hint,
  index = 0,
}) {
  return (
    <motion.div
      className={styles.card}
      data-accent={accent}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {Icon && (
          <span className={styles.icon}>
            <Icon size={17} aria-hidden />
          </span>
        )}
      </div>

      <div className={styles.valueRow}>
        <span className={`${styles.value} tabular`}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      {(trend || hint) && (
        <div className={styles.foot}>
          {trend && (
            <span className={styles.trend} data-dir={trend.dir}>
              {trend.dir === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
              {trend.value}
            </span>
          )}
          {hint && <span className={styles.hint}>{hint}</span>}
        </div>
      )}
    </motion.div>
  );
}
