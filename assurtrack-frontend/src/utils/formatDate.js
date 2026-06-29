import {
  format,
  formatDistanceToNowStrict,
  differenceInCalendarDays,
  parseISO,
  isValid,
} from 'date-fns';
import { fr } from 'date-fns/locale';

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return parseISO(value);
  return new Date(value);
}

/** 2026-06-24 → "24 juin 2026" */
export function formatDate(value, pattern = 'd MMMM yyyy') {
  const d = toDate(value);
  if (!isValid(d)) return '—';
  return format(d, pattern, { locale: fr });
}

/** 2026-06-24T14:32 → "24 juin · 14:32" */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!isValid(d)) return '—';
  return format(d, "d MMM · HH:mm", { locale: fr });
}

/** "il y a 3 jours" */
export function fromNow(value) {
  const d = toDate(value);
  if (!isValid(d)) return '—';
  return formatDistanceToNowStrict(d, { locale: fr, addSuffix: true });
}

/**
 * Nombre de jours calendaires jusqu'à une échéance (positif = à venir).
 * Aujourd'hui = 0, hier = -1, demain = +1.
 */
export function daysUntil(value, from = new Date()) {
  const d = toDate(value);
  if (!isValid(d)) return null;
  return differenceInCalendarDays(d, from);
}

/** Niveau d'urgence d'une échéance, sert à colorer l'horizon. */
export function echeanceLevel(value, from = new Date()) {
  const days = daysUntil(value, from);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'soon';
  return 'safe';
}

/** Libellé court d'un compteur J-X : J-7, J-0, J+2 (expiré). */
export function jLabel(value, from = new Date()) {
  const days = daysUntil(value, from);
  if (days === null) return '—';
  if (days === 0) return 'J0';
  return days > 0 ? `J−${days}` : `J+${Math.abs(days)}`;
}
