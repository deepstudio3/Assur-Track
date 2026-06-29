/**
 * Formate un montant en francs CFA, séparateurs par espace insécable fine.
 * 25000 → "25 000 FCFA"
 */
export function formatCurrency(value, { suffix = 'FCFA' } = {}) {
  const n = Number(value) || 0;
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(n);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

/** Variante compacte pour les grands nombres : 1 250 000 → "1,25 M FCFA" */
export function formatCurrencyShort(value, { suffix = 'FCFA' } = {}) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M ${suffix}`;
  }
  if (Math.abs(n) >= 10_000) {
    return `${(n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} k ${suffix}`;
  }
  return formatCurrency(n, { suffix });
}
