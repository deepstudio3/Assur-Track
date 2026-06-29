import { useRef, useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import NotificationPanel from '../notifications/NotificationPanel';
import { useAuthStore } from '../../store/authStore';
import { useNotifStore } from '../../store/notifStore';
import { formatDate } from '../../utils/formatDate';
import styles from './TopBar.module.css';

export default function TopBar({ onMenu }) {
  const user = useAuthStore((s) => s.user);
  const unread = useNotifStore((s) => s.notifications.filter((n) => !n.read).length);
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef(null);
  const initials = user ? `${user.prenom[0]}${user.nom[0]}` : '··';
  const heure = new Date().getHours();
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <header className={styles.topbar}>
      <button className={styles.menu} onClick={onMenu} aria-label="Ouvrir le menu">
        <Menu size={20} />
      </button>

      <div className={styles.greeting}>
        <h1 className={styles.hello}>
          {salut}, {user?.prenom}
        </h1>
        <p className={styles.date}>{formatDate(new Date(), 'EEEE d MMMM yyyy')}</p>
      </div>

      <div className={styles.actions}>
        <div className={styles.notifWrap}>
          <button
            ref={bellRef}
            className={styles.bell}
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`Notifications${unread ? `, ${unread} non lues` : ''}`}
            aria-expanded={notifOpen}
          >
            <Bell size={19} />
            {unread > 0 && <span className={styles.badge}>{unread}</span>}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} anchorRef={bellRef} />
        </div>

        <span className={styles.avatar} title={`${user?.prenom} ${user?.nom}`}>
          {initials}
        </span>
      </div>
    </header>
  );
}
