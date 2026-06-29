import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNotifStore } from '../../store/notifStore';
import { fromNow } from '../../utils/formatDate';
import styles from './NotificationPanel.module.css';

const ICONS = { caisse: Wallet, relance: RefreshCw, default: AlertTriangle };

export default function NotificationPanel({ open, onClose, anchorRef }) {
  const notifications = useNotifStore((s) => s.notifications);
  const markAllRead = useNotifStore((s) => s.markAllRead);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        !anchorRef?.current?.contains(e.target)
      ) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onClose, anchorRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className={styles.panel}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label="Notifications"
        >
          <div className={styles.head}>
            <h3 className={styles.title}>Notifications</h3>
            <button className={styles.markAll} onClick={markAllRead}>
              Tout marquer comme lu
            </button>
          </div>
          <ul className={styles.list}>
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || ICONS.default;
              return (
                <li key={n.id} className={styles.item} data-unread={!n.read}>
                  <span className={styles.icon} data-type={n.type}>
                    <Icon size={16} />
                  </span>
                  <div className={styles.body}>
                    <p className={styles.itemTitle}>{n.titre}</p>
                    <p className={styles.detail}>{n.detail}</p>
                    <span className={styles.time}>{fromNow(n.at)}</span>
                  </div>
                  {!n.read && <span className={styles.unreadDot} aria-label="Non lu" />}
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
