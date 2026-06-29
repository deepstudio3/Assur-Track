/** Templates de messages WhatsApp (relances + caisse). */

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtMontant = (n) => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`;

export const TEMPLATES = {
  relance_J30: (client, contrat) =>
    `Bonjour ${client.prenom} 👋\n\nVotre contrat d'assurance *${contrat.type_assurance}* (N° ${contrat.numero_police}) expire dans *30 jours*, le ${fmtDate(contrat.date_expiration)}.\n\nContactez-nous maintenant pour renouveler votre couverture.\n\n_AssurTrack_`,

  relance_J7: (client, contrat) =>
    `⚠️ Rappel urgent — Bonjour ${client.prenom}\n\nVotre contrat *${contrat.type_assurance}* expire dans *7 jours*.\n\nRenouvelez dès aujourd'hui pour éviter toute interruption de couverture.\n\n_AssurTrack_`,

  relance_J0: (client, contrat) =>
    `🔴 *EXPIRATION AUJOURD'HUI*\n\nBonjour ${client.prenom}, votre contrat *${contrat.type_assurance}* (N° ${contrat.numero_police}) expire ce jour.\n\nContactez immédiatement votre agence.\n\n_AssurTrack_`,

  nouvelle_operation: (secretaire, montant, motif, heure) =>
    `💰 *Nouvelle dette enregistrée*\n\n` +
    `${secretaire.prenom} ${secretaire.nom} déclare que vous avez pris *${fmtMontant(montant)}* dans sa caisse.\n` +
    `Motif : ${motif || '—'}\n` +
    `Heure : ${heure}\n\n` +
    `Connectez-vous à AssurTrack pour suivre et rembourser.\n_AssurTrack_`,

  // Remboursement d'une tranche — message à la secrétaire
  remboursement_secretaire: (montant, reste) =>
    `✅ *Remboursement reçu*\n\n` +
    `La patronne vous a remboursé *${fmtMontant(montant)}*.\n` +
    `Reste dû : *${fmtMontant(reste)}*\n\n_AssurTrack_`,

  // Remboursement d'une tranche — accusé à la patronne
  remboursement_patronne: (secretaire, montant, reste) =>
    `✅ *Remboursement enregistré*\n\n` +
    `Versé à ${secretaire.prenom} ${secretaire.nom} : *${fmtMontant(montant)}*\n` +
    `Reste à rembourser : *${fmtMontant(reste)}*\n\n_AssurTrack_`,

  // --- Module Comptabilité ---
  vente_comptant: (secretaire, montant, produits, heure) =>
    `🛒 *Nouvelle vente enregistrée*\n\n` +
    `Secrétaire : ${secretaire.prenom} ${secretaire.nom}\n` +
    `Produits : ${produits}\n` +
    `Montant : *${fmtMontant(montant)}*\n` +
    `Paiement : Comptant ✅\n` +
    `Heure : ${heure}\n\n_AssurTrack_`,

  vente_credit: (secretaire, montant, produits, client, heure) =>
    `⚠️ *Vente à crédit enregistrée*\n\n` +
    `Secrétaire : ${secretaire.prenom} ${secretaire.nom}\n` +
    `Client : ${client.prenom} ${client.nom}\n` +
    `Produits : ${produits}\n` +
    `Montant dû : *${fmtMontant(montant)}*\n` +
    `Heure : ${heure}\n\n` +
    `Connectez-vous à AssurTrack pour suivre cette dette.\n_AssurTrack_`,

  dette_payee: (client, montant, payePar, heure) =>
    `✅ *Dette client remboursée*\n\n` +
    `Client : ${client.prenom} ${client.nom}\n` +
    `Montant encaissé : *${fmtMontant(montant)}*\n` +
    `Enregistré par : ${payePar.prenom} ${payePar.nom}\n` +
    `Heure : ${heure}\n\n_AssurTrack_`,
};

/** Associe un type de relance (J-30/J-7/J-0) au bon template. */
export function templateRelance(type, client, contrat) {
  if (type === 'J-30') return TEMPLATES.relance_J30(client, contrat);
  if (type === 'J-7') return TEMPLATES.relance_J7(client, contrat);
  return TEMPLATES.relance_J0(client, contrat);
}
