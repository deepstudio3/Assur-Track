import { forwardRef, useId } from 'react';
import styles from './Input.module.css';

/** Champ texte/numérique avec label, icône, suffixe et erreur inline. */
export const Input = forwardRef(function Input(
  { label, hint, error, icon: Icon, suffix, className = '', id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.wrap} data-error={!!error} data-icon={!!Icon}>
        {Icon && <Icon size={17} className={styles.icon} aria-hidden />}
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className={styles.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
});

/** Zone de texte multiligne, même habillage. */
export const Textarea = forwardRef(function Textarea(
  { label, hint, error, rows = 4, className = '', id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.wrap} data-error={!!error}>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`${styles.input} ${styles.textarea}`}
          aria-invalid={!!error}
          {...props}
        />
      </div>
      {error ? <p className={styles.error}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
});

/** Select stylisé cohérent avec l'Input. */
export const Select = forwardRef(function Select(
  { label, hint, error, children, className = '', id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.wrap} data-error={!!error}>
        <select ref={ref} id={inputId} className={`${styles.input} ${styles.select}`} {...props}>
          {children}
        </select>
      </div>
      {error ? <p className={styles.error}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
});
