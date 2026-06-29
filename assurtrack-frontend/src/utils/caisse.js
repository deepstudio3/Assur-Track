/**
 * Allocation FIFO des remboursements aux dettes (par secrétaire).
 *
 * Modèle : la patronne emprunte dans la caisse des secrétaires (dettes) et
 * rembourse par tranches, globalement par secrétaire. Chaque tranche solde les
 * dettes les plus anciennes d'abord. Le statut d'une dette est DÉRIVÉ
 * (jamais stocké) → immuabilité : on n'écrit que des enregistrements en plus.
 *
 * @param {Array} dettes        [{ id, secretaire, montant, motif, created_at }]
 * @param {Array} remboursements[{ id, secretaire, montant, par, created_at }]
 * @returns {{ groups: Object, allDebts: Array, totals: Object }}
 */
export function allocateCaisse(dettes = [], remboursements = []) {
  const groups = {};
  const ensure = (s) => {
    if (!groups[s]) {
      groups[s] = { secretaire: s, secretaire_id: null, total: 0, rembourse: 0, reste: 0, debts: [], remboursements: [] };
    }
    return groups[s];
  };

  const byDette = {};
  for (const d of dettes) {
    const g = ensure(d.secretaire);
    if (d.secretaire_id) g.secretaire_id = d.secretaire_id;
    const enriched = {
      ...d,
      montant_rembourse: 0,
      reste: d.montant,
      statut: 'du', // 'du' | 'partiel' | 'rembourse'
      solde_at: null,
      solde_par: null,
    };
    (byDette[d.secretaire] ||= []).push(enriched);
    g.total += d.montant;
  }

  const byRemb = {};
  for (const r of remboursements) {
    ensure(r.secretaire);
    (byRemb[r.secretaire] ||= []).push(r);
    groups[r.secretaire].rembourse += r.montant;
    groups[r.secretaire].remboursements.push(r);
  }

  const asc = (a, b) => new Date(a.created_at) - new Date(b.created_at);

  for (const s of Object.keys(groups)) {
    const ds = (byDette[s] || []).sort(asc);
    const rs = (byRemb[s] || []).sort(asc);

    for (const r of rs) {
      let amount = r.montant;
      for (const d of ds) {
        if (amount <= 0) break;
        if (d.reste <= 0) continue;
        const take = Math.min(amount, d.reste);
        d.montant_rembourse += take;
        d.reste -= take;
        amount -= take;
        if (d.reste <= 0) {
          d.statut = 'rembourse';
          d.solde_at = r.created_at;
          d.solde_par = r.par;
        } else {
          d.statut = 'partiel';
        }
      }
    }

    const g = groups[s];
    g.debts = ds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // récent d'abord à l'affichage
    g.reste = Math.max(0, g.total - g.rembourse);
  }

  const allDebts = Object.values(groups).flatMap((g) => g.debts);
  const totals = Object.values(groups).reduce(
    (acc, g) => {
      acc.total += g.total;
      acc.rembourse += g.rembourse;
      acc.reste += g.reste;
      acc.nbDettes += g.debts.length;
      return acc;
    },
    { total: 0, rembourse: 0, reste: 0, nbDettes: 0 },
  );

  return { groups, allDebts, totals };
}

/** Liste des ids de dettes au statut 'rembourse' (pour diff d'animation cachet). */
export function settledIds(dettes, remboursements) {
  return allocateCaisse(dettes, remboursements)
    .allDebts.filter((d) => d.statut === 'rembourse')
    .map((d) => d.id);
}
