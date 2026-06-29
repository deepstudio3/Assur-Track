import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, RefreshCw, AlertTriangle, ShoppingCart, BellOff } from 'lucide-react';
import { useNotifications, useMarkNotificationsRead } from '../../hooks/useNotifications';
import { fromNow } from '../../utils/formatDate';
import styles from './NotificationPanel.module.css';

const ICONS = {
  caisse: Wallet,
  relance: RefreshCw,
  vente: ShoppingCart,
  dette: AlertTriangle,
  default: AlertTriangle,
};

export default function NotificationPanel({ open, onClose, anchorRef }) {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
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
            {notifications.some((n) => !n.lu) && (
              <button className={styles.markAll} onClick={() => markRead.mutate()}>
                Tout marquer comme lu
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <BellOff size={22} />
              <p>Aucune notification</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => {
                const Icon = ICONS[n.type] || ICONS.default;
                return (
                  <li key={n.id} className={styles.item} data-unread={!n.lu}>
                    <span className={styles.icon} data-type={n.type}>
                      <Icon size={16} />
                    </span>
                    <div className={styles.body}>
                      <p className={styles.itemTitle}>{n.titre}</p>
                      {n.detail && <p className={styles.detail}>{n.detail}</p>}
                      <span className={styles.time}>{fromNow(n.created_at)}</span>
                    </div>
                    {!n.lu && <span className={styles.unreadDot} aria-label="Non lu" />}
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
