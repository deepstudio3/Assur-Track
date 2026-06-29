import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { daysUntil, echeanceLevel, jLabel } from '../../utils/formatDate';
import styles from './EcheanceHorizon.module.css';

/**
 * SIGNATURE — « L'Horizon des échéances ».
 * Chaque contrat est un tick glissant vers le mur « Aujourd'hui ».
 * Plus l'échéance est proche du mur, plus la couleur vire au rouge.
 * Métaphore directe du module Relance : des échéances qui arrivent.
 *
 * windowDays : fenêtre de l'horizon (par défaut 30 jours).
 */
export default function EcheanceHorizon({ contrats = [], windowDays = 30, onSelect }) {
  const [hover, setHover] = useState(null);

  const { ticks, beyond, overdue } = useMemo(() => {
    const ticks = [];
    let beyond = 0;
    let overdue = 0;
    for (const c of contrats) {
      const d = daysUntil(c.date_expiration);
      if (d === null) continue;
      if (d < 0) {
        overdue += 1;
        continue;
      }
      if (d > windowDays) {
        beyond += 1;
        continue;
      }
      // 2% (loin, J-windowDays) → 94% (au mur, J-0)
      const x = 2 + (1 - d / windowDays) * 92;
      ticks.push({ contrat: c, days: d, x, level: echeanceLevel(c.date_expiration) });
    }
    ticks.sort((a, b) => a.days - b.days);
    return { ticks, beyond, overdue };
  }, [contrats, windowDays]);

  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <i className={styles.dotSafe} /> {`> 7 jours`}
        </span>
        <span className={styles.legendItem}>
          <i className={styles.dotSoon} /> ≤ 30 jours
        </span>
        <span className={styles.legendItem}>
          <i className={styles.dotCrit} /> ≤ 7 jours
        </span>
      </div>

      <div className={styles.track}>
        {/* Zones colorées de fond (sûr → bientôt → critique) */}
        <div className={styles.zones} aria-hidden />

        {/* Au-delà de la fenêtre, à gauche */}
        {beyond > 0 && (
          <span className={styles.beyond} aria-hidden>
            +{beyond} au-delà
          </span>
        )}

        {/* Mur « Aujourd'hui » */}
        <div className={styles.wall} aria-hidden>
          <span className={styles.wallLabel}>AUJOURD’HUI</span>
        </div>

        {/* Ticks */}
        {ticks.map((t, i) => (
          <motion.button
            key={t.contrat.id}
            type="button"
            className={styles.tick}
            data-level={t.level}
            style={{ left: `${t.x}%` }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setHover(t)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(t)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect?.(t.contrat)}
            aria-label={`${t.contrat.client.prenom} ${t.contrat.client.nom} — ${t.contrat.type_assurance}, expire ${jLabel(t.contrat.date_expiration)}`}
          >
            <span className={styles.tickDot} />
          </motion.button>
        ))}

        {/* Infobulle */}
        {hover && (
          <div
            className={styles.tip}
            data-level={hover.level}
            style={{ left: `${hover.x}%` }}
            role="tooltip"
          >
            <span className={styles.tipName}>
              {hover.contrat.client.prenom} {hover.contrat.client.nom}
            </span>
            <span className={styles.tipMeta}>
              {hover.contrat.type_assurance} · {hover.contrat.numero_police}
            </span>
            <span className={`${styles.tipJ} tabular`}>{jLabel(hover.contrat.date_expiration)}</span>
          </div>
        )}
      </div>

      <div className={styles.scale}>
        <span>J−{windowDays}</span>
        <span className={styles.scaleMid}>J−{Math.round(windowDays / 2)}</span>
        <span>J−7</span>
        <span className={styles.scaleNow}>J0</span>
      </div>

      {overdue > 0 && (
        <p className={styles.overdue}>
          <strong className="tabular">{overdue}</strong> contrat{overdue > 1 ? 's' : ''} déjà
          expiré{overdue > 1 ? 's' : ''} — à traiter en priorité
        </p>
      )}
    </div>
  );
}
