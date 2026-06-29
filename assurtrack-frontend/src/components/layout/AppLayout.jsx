import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './AppLayout.module.css';

/** Coquille de l'application : sidebar + topbar + contenu (Outlet). */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>

      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={styles.main}>
        <TopBar onMenu={() => setMenuOpen(true)} />
        <Outlet />
      </div>
    </div>
  );
}
