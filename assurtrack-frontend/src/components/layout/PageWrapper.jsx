import { motion } from 'framer-motion';
import styles from './PageWrapper.module.css';

/** Conteneur de page : largeur max, padding, animation d'entrée discrète. */
export default function PageWrapper({ title, eyebrow, actions, children }) {
  return (
    <motion.main
      id="main"
      className={styles.page}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      {(title || actions) && (
        <header className={styles.header}>
          <div>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            {title && <h1 className={styles.title}>{title}</h1>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </motion.main>
  );
}
