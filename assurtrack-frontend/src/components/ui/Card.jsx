import styles from './Card.module.css';

/** Card de base — surface blanche, ombre subtile, padding généreux. */
export default function Card({
  children,
  as: Tag = 'div',
  pad = true,
  className = '',
  ...props
}) {
  return (
    <Tag className={`${styles.card} ${pad ? styles.pad : ''} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, eyebrow, action, className = '' }) {
  return (
    <div className={`${styles.header} ${className}`}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        {title && <h3 className={styles.title}>{title}</h3>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
