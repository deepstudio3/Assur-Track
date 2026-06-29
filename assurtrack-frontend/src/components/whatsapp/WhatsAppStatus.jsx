import styles from './WhatsAppStatus.module.css';

/** Indicateur de connexion WhatsApp (mock : toujours connecté en démo). */
export default function WhatsAppStatus({ connected = true, compact = false }) {
  return (
    <div className={`${styles.status} ${compact ? styles.compact : ''}`} data-on={connected}>
      <span className={styles.dot} aria-hidden />
      <span className={styles.text}>
        {connected ? 'WhatsApp connecté' : 'WhatsApp hors ligne'}
      </span>
    </div>
  );
}
