import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

/**
 * Bouton — variants ancrés sur la hiérarchie d'action :
 *  primary  → CTA, accent or
 *  navy     → action principale sobre (fond bleu nuit)
 *  outline  → action secondaire
 *  ghost    → action tertiaire / discrète
 *  danger   → action destructrice (rare ici : la caisse est immuable)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  full = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      className={`${styles.btn} ${full ? styles.full : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 15 : 17} className={styles.spin} aria-hidden />
      ) : (
        Icon && <Icon size={size === 'sm' ? 15 : 17} aria-hidden />
      )}
      {children && <span className={styles.label}>{children}</span>}
      {!loading && IconRight && <IconRight size={size === 'sm' ? 15 : 17} aria-hidden />}
    </button>
  );
}
