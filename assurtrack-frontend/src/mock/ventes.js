/**
 * Données mockées — module Comptabilité (ventes boissons & photocopies).
 * Ventes immuables ; les dettes (ventes à crédit) peuvent être soldées.
 */
import { subDays, subHours } from 'date-fns';

const now = new Date();
const at = (d) => d.toISOString();

/* --- Catalogue produits (configurable par la patronne) --- */
export const PRODUITS = [
  { id: 'pr1', nom: 'Jus orange', prix_unitaire: 700, categorie: 'boisson', actif: true },
  { id: 'pr2', nom: 'Jus ananas', prix_unitaire: 700, categorie: 'boisson', actif: true },
  { id: 'pr3', nom: 'Eau minérale 1.5L', prix_unitaire: 500, categorie: 'boisson', actif: true },
  { id: 'pr4', nom: 'Eau 0.5L', prix_unitaire: 300, categorie: 'boisson', actif: true },
  { id: 'pr5', nom: 'Soda', prix_unitaire: 600, categorie: 'boisson', actif: true },
  { id: 'pr6', nom: 'Photocopie N&B', prix_unitaire: 50, categorie: 'service', actif: true },
  { id: 'pr7', nom: 'Photocopie couleur', prix_unitaire: 150, categorie: 'service', actif: true },
  { id: 'pr8', nom: 'Café', prix_unitaire: 400, categorie: 'boisson', actif: false },
];

const P = Object.fromEntries(PRODUITS.map((p) => [p.id, p]));

function ligne(produitId, quantite) {
  const p = P[produitId];
  return {
    produit_id: produitId,
    produit_nom: p.nom,
    quantite,
    prix_unitaire: p.prix_unitaire,
    sous_total: p.prix_unitaire * quantite,
  };
}

function vente(id, secretaire, lignes, mode, when, { statut, client, note } = {}) {
  const montant_total = lignes.reduce((s, l) => s + l.sous_total, 0);
  return {
    id,
    secretaire,
    lignes,
    montant_total,
    mode_paiement: mode,
    statut: statut || (mode === 'credit' ? 'en_attente' : 'payee'),
    client_nom: client?.nom || null,
    client_prenom: client?.prenom || null,
    note: note || null,
    created_at: when,
    paye_at: statut === 'payee' && mode === 'credit' ? at(subHours(now, 1)) : null,
    paye_par: statut === 'payee' && mode === 'credit' ? 'Marie Nkoa' : null,
  };
}

/* Résumé produits lisible pour les tables : "Jus orange ×2 · Eau 1.5L ×1" */
export function resumeProduits(lignes) {
  return lignes.map((l) => `${l.produit_nom} ×${l.quantite}`).join(' · ');
}

/* --- Ventes (aujourd'hui + jours précédents) --- */
export const VENTES = [
  vente('v1', 'Marie Nkoa', [ligne('pr1', 2), ligne('pr3', 1)], 'comptant', at(subHours(now, 1))),
  vente('v2', 'Marie Nkoa', [ligne('pr1', 3), ligne('pr4', 2)], 'credit', at(subHours(now, 2)), {
    client: { nom: 'Mballa', prenom: 'Jean' },
  }),
  vente('v3', 'Aïcha Bello', [ligne('pr6', 40)], 'comptant', at(subHours(now, 3))),
  vente('v4', 'Marie Nkoa', [ligne('pr1', 10)], 'credit', at(subDays(now, 1)), {
    client: { nom: 'Mballa', prenom: 'Jean' },
  }),
  vente('v5', 'Aïcha Bello', [ligne('pr2', 1), ligne('pr7', 5)], 'credit', at(subDays(now, 1)), {
    client: { nom: 'Nguema', prenom: 'Pierre' },
  }),
  vente('v6', 'Marie Nkoa', [ligne('pr3', 4)], 'comptant', at(subDays(now, 2))),
  vente('v7', 'Aïcha Bello', [ligne('pr5', 5), ligne('pr1', 5)], 'credit', at(subDays(now, 2)), {
    client: { nom: 'Fotso', prenom: 'Awa' },
  }),
  vente('v8', 'Marie Nkoa', [ligne('pr1', 1)], 'credit', at(subDays(now, 3)), {
    client: { nom: 'Fotso', prenom: 'Awa' },
    statut: 'payee', // déjà soldée → reste dans l'historique, plus dans les dettes
  }),
  vente('v9', 'Aïcha Bello', [ligne('pr4', 6), ligne('pr6', 20)], 'comptant', at(subDays(now, 4))),
];

/* --- Helpers comptables --- */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function caJour(ventes = VENTES) {
  const t0 = startOfToday();
  return ventes
    .filter((v) => v.mode_paiement === 'comptant' && new Date(v.created_at) >= t0)
    .reduce((s, v) => s + v.montant_total, 0);
}

export function caMois(ventes = VENTES) {
  const d = new Date();
  const m0 = new Date(d.getFullYear(), d.getMonth(), 1);
  return ventes
    .filter((v) => v.mode_paiement === 'comptant' && new Date(v.created_at) >= m0)
    .reduce((s, v) => s + v.montant_total, 0);
}

export function totalDettes(ventes = VENTES) {
  return ventes
    .filter((v) => v.mode_paiement === 'credit' && v.statut === 'en_attente')
    .reduce((s, v) => s + v.montant_total, 0);
}

export function nbVentesJour(ventes = VENTES) {
  const t0 = startOfToday();
  return ventes.filter((v) => new Date(v.created_at) >= t0).length;
}

/** Regroupe les dettes en attente par client (nom + prénom). */
export function dettesParClient(ventes = VENTES) {
  const map = new Map();
  for (const v of ventes) {
    if (v.mode_paiement !== 'credit' || v.statut !== 'en_attente') continue;
    const key = `${v.client_prenom} ${v.client_nom}`;
    if (!map.has(key)) {
      map.set(key, { client: key, nom: v.client_nom, prenom: v.client_prenom, total: 0, ventes: [] });
    }
    const g = map.get(key);
    g.total += v.montant_total;
    g.ventes.push(v);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
