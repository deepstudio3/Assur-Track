/**
 * Données mockées AssurTrack — étape 1 (frontend seul).
 * Les dates d'échéance sont calculées par rapport à aujourd'hui pour que
 * l'« Horizon des échéances » soit toujours vivant en démo.
 */
import { addDays, subDays, formatISO } from 'date-fns';

const today = new Date();
const iso = (d) => formatISO(d, { representation: 'date' });
const isoT = (d) => d.toISOString();

/* --- Utilisateurs de démonstration --- */
export const USERS = {
  patronne: {
    id: 'u-patronne',
    nom: 'Ndongo',
    prenom: 'Henriette',
    email: 'patronne@assurtrack.cm',
    role: 'patronne',
    telephone_wa: '+237699112233',
  },
  secretaire: {
    id: 'u-marie',
    nom: 'Nkoa',
    prenom: 'Marie',
    email: 'marie@assurtrack.cm',
    role: 'secretaire',
    telephone_wa: '+237677445566',
  },
};

/* Comptes acceptés par l'écran de connexion mocké. */
export const DEMO_ACCOUNTS = [
  { email: 'patronne@assurtrack.cm', password: 'demo', user: USERS.patronne },
  { email: 'marie@assurtrack.cm', password: 'demo', user: USERS.secretaire },
];

/* --- Clients assurés --- */
export const CLIENTS = [
  { id: 'c1', nom: 'Mballa', prenom: 'Étienne', telephone_wa: '+237699001122', email: 'e.mballa@gmail.com', contrats: 2 },
  { id: 'c2', nom: 'Nguema', prenom: 'Clarisse', telephone_wa: '+237677220011', email: 'clarisse.n@yahoo.fr', contrats: 1 },
  { id: 'c3', nom: 'Fotso', prenom: 'Bernard', telephone_wa: '+237655334455', email: '', contrats: 1 },
  { id: 'c4', nom: 'Atangana', prenom: 'Solange', telephone_wa: '+237698776655', email: 's.atangana@gmail.com', contrats: 3 },
  { id: 'c5', nom: 'Kamga', prenom: 'Pascal', telephone_wa: '+237671882299', email: '', contrats: 1 },
  { id: 'c6', nom: 'Eyenga', prenom: 'Rose', telephone_wa: '+237694556677', email: 'rose.eyenga@gmail.com', contrats: 1 },
];

const clientById = Object.fromEntries(CLIENTS.map((c) => [c.id, c]));

/* --- Contrats — échéances réparties sur l'horizon --- */
function contrat(id, clientId, police, type, jExpiration, prime, statut = 'actif') {
  const c = clientById[clientId];
  return {
    id,
    client_id: clientId,
    client: c,
    numero_police: police,
    type_assurance: type,
    date_souscription: iso(subDays(today, 365 - jExpiration)),
    date_expiration: iso(addDays(today, jExpiration)),
    montant_prime: prime,
    statut,
  };
}

export const CONTRATS = [
  contrat('k1', 'c1', 'POL-2291', 'Automobile', 0, 185000),
  contrat('k2', 'c2', 'POL-2188', 'Habitation', 3, 95000),
  contrat('k3', 'c3', 'POL-2402', 'Santé', 6, 240000),
  contrat('k4', 'c4', 'POL-1999', 'Automobile', 12, 175000),
  contrat('k5', 'c1', 'POL-2310', 'Voyage', 19, 60000),
  contrat('k6', 'c5', 'POL-2455', 'Responsabilité civile', 24, 120000),
  contrat('k7', 'c4', 'POL-2061', 'Habitation', 28, 88000),
  contrat('k8', 'c6', 'POL-2500', 'Santé', 45, 210000),
  contrat('k9', 'c4', 'POL-2120', 'Automobile', 62, 195000),
  contrat('k10', 'c2', 'POL-1840', 'Voyage', -4, 55000, 'expire'),
];

/* --- Relances envoyées (historique) --- */
export const RELANCES = [
  { id: 'r1', contrat_id: 'k4', client: clientById.c4, type_relance: 'J-30', destinataire: '+237698776655', statut: 'envoye', envoye_at: isoT(subDays(today, 1)) },
  { id: 'r2', contrat_id: 'k2', client: clientById.c2, type_relance: 'J-7', destinataire: '+237677220011', statut: 'envoye', envoye_at: isoT(subDays(today, 2)) },
  { id: 'r3', contrat_id: 'k1', client: clientById.c1, type_relance: 'J-7', destinataire: '+237699001122', statut: 'envoye', envoye_at: isoT(subDays(today, 7)) },
  { id: 'r4', contrat_id: 'k3', client: clientById.c3, type_relance: 'J-30', destinataire: '+237655334455', statut: 'echec', envoye_at: isoT(subDays(today, 3)) },
  { id: 'r5', contrat_id: 'k10', client: clientById.c2, type_relance: 'J-0', destinataire: '+237677220011', statut: 'envoye', envoye_at: isoT(subDays(today, 4)) },
];

/* Série « relances envoyées sur 30 jours » pour le graphique du dashboard. */
export const RELANCES_SERIE = Array.from({ length: 30 }, (_, i) => {
  const d = subDays(today, 29 - i);
  const base = 2 + Math.round(3 * Math.abs(Math.sin(i / 3)));
  return { date: iso(d), label: iso(d).slice(8), envoyees: base, echecs: i % 7 === 0 ? 1 : 0 };
});

/* --- Caisse : dettes (argent que la patronne a pris dans la caisse d'une
   secrétaire). Le statut est dérivé via l'allocation FIFO (voir utils/caisse.js) :
   on ne stocke PAS de statut/remboursement sur la dette → immuabilité. --- */
function dette(id, secretaire, montant, motif, jAgo) {
  return { id, secretaire, montant, motif, created_at: isoT(subDays(today, jAgo)) };
}

export const OPERATIONS = [
  dette('o1', 'Marie N.', 25000, 'Achat fournitures de bureau', 0),
  dette('o2', 'Aïcha B.', 40000, 'Avance carburant déplacement Douala', 0),
  dette('o3', 'Marie N.', 15000, 'Frais de connexion internet', 1),
  dette('o4', 'Sandrine K.', 60000, 'Réception client — restauration', 2),
  dette('o5', 'Marie N.', 8000, 'Taxi course urgente banque', 3),
  dette('o6', 'Aïcha B.', 32000, 'Cartouches imprimante', 5),
  dette('o7', 'Sandrine K.', 12500, 'Eau et boissons bureau', 6),
];

/* Journal des remboursements (tranches versées par la patronne, par secrétaire).
   Append-only — une tranche ne se modifie ni ne s'efface. */
function remb(id, secretaire, montant, jAgo, par = 'Henriette N.') {
  return { id, secretaire, montant, par, created_at: isoT(subDays(today, jAgo)) };
}

export const REMBOURSEMENTS = [
  // Marie : 28 000 versés → solde o5 (8 000) + o3 (15 000), o1 partiel (5 000/25 000)
  remb('p1', 'Marie N.', 8000, 2),
  remb('p2', 'Marie N.', 20000, 0),
  // Aïcha : 32 000 → solde o6 (32 000), o2 (40 000) encore dû
  remb('p3', 'Aïcha B.', 32000, 3),
  // Sandrine : 20 000 → solde o7 (12 500) + o4 partiel (7 500/60 000)
  remb('p4', 'Sandrine K.', 20000, 1),
];

/* Vues filtrées pour une secrétaire (ici Marie) — uniquement les siennes. */
export const OPERATIONS_MARIE = OPERATIONS.filter((o) => o.secretaire === 'Marie N.');
export const REMBOURSEMENTS_MARIE = REMBOURSEMENTS.filter((r) => r.secretaire === 'Marie N.');

/* --- Templates WhatsApp (aperçu Settings + prévisualisation contrat) --- */
export const WA_TEMPLATES = {
  'J-30': "Bonjour {prenom} 👋\n\nVotre contrat d'assurance *{type}* (N° {police}) expire dans *30 jours*, le {date}.\n\nContactez-nous pour renouveler votre couverture.\n\n_AssurTrack_",
  'J-7': "⚠️ Rappel urgent — Bonjour {prenom}\n\nVotre contrat *{type}* expire dans *7 jours*.\n\nRenouvelez dès aujourd'hui pour éviter toute interruption.\n\n_AssurTrack_",
  'J-0': "🔴 *EXPIRATION AUJOURD'HUI*\n\nBonjour {prenom}, votre contrat *{type}* (N° {police}) expire ce jour.\n\nContactez immédiatement votre agence.\n\n_AssurTrack_",
  operation: "💰 *Nouvelle dette enregistrée*\n\n{secretaire} déclare que vous avez pris *{montant}* dans sa caisse.\nMotif : {motif}\nHeure : {heure}\n\nConnectez-vous pour suivre et rembourser.\n_AssurTrack_",
};

export function fillTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}
