import { Inbox } from 'lucide-react';
import styles from './EmptyState.module.css';

/** État vide : invitation à agir, jamais un cul-de-sac. */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`${styles.empty} ${className}`}>
      <span className={styles.illo} aria-hidden>
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
