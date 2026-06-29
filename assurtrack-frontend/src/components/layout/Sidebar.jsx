import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  RefreshCw,
  Users,
  Wallet,
  Settings,
  LogOut,
  ShoppingCart,
  AlertCircle,
  Package,
} from 'lucide-react';
import Logo from '../ui/Logo';
import WhatsAppStatus from '../whatsapp/WhatsAppStatus';
import { useAuthStore } from '../../store/authStore';
import { canAccess } from '../../utils/roleGuard';
import styles from './Sidebar.module.css';

const NAV = [
  {
    items: [{ icon: LayoutDashboard, label: 'Tableau de bord', path: '/' }],
  },
  {
    title: 'Assurance',
    items: [
      { icon: RefreshCw, label: 'Relances', path: '/relance' },
      { icon: Users, label: 'Clients', path: '/clients' },
      { icon: Wallet, label: 'Caisse', path: '/caisse', roles: ['patronne', 'secretaire'] },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { icon: ShoppingCart, label: 'Caisse ventes', path: '/ventes', end: true },
      { icon: AlertCircle, label: 'Dettes clients', path: '/ventes/dettes' },
      { icon: Package, label: 'Produits', path: '/produits', roles: ['patronne'] },
    ],
  },
  {
    items: [{ icon: Settings, label: 'Paramètres', path: '/settings', roles: ['patronne'] }],
  },
];

export default function Sidebar({ open, onNavigate }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const initials = user ? `${user.prenom[0]}${user.nom[0]}` : '··';

  return (
    <aside className={`${styles.sidebar} on-dark ${open ? styles.open : ''}`}>
      <div className={styles.brand}>
        <Logo variant="light" size={30} />
      </div>

      <nav className={styles.nav} aria-label="Navigation principale">
        {NAV.map((group, gi) => {
          const items = group.items.filter((item) => canAccess(user?.role, item.roles));
          if (!items.length) return null;
          return (
            <div key={group.title || gi} className={styles.group}>
              {group.title && <p className={styles.groupTitle}>{group.title}</p>}
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end || item.path === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                >
                  <item.icon size={19} aria-hidden />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className={styles.foot}>
        <div className={styles.wa}>
          <WhatsAppStatus compact />
        </div>

        <div className={styles.user}>
          <span className={styles.avatar}>{initials}</span>
          <div className={styles.userMeta}>
            <span className={styles.userName}>
              {user?.prenom} {user?.nom}
            </span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
          <button className={styles.logout} onClick={logout} aria-label="Se déconnecter">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
