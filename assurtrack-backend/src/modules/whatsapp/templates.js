/**
 * Templates WhatsApp NON personnalisables (remboursements caisse + ventes).
 * Les relances (J-30/J-7/J-0) et la notification de dette ('operation') sont,
 * elles, personnalisables par l'entreprise — voir src/modules/templates/.
 */

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const fmtMontant = (n) => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`;

export const TEMPLATES = {
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
