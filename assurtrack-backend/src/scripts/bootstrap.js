/**
 * Bootstrap PRODUCTION : crée l'entreprise et le compte patronne initial
 * à partir de variables d'environnement, SANS aucune donnée de démonstration.
 *
 * Idempotent : si le compte existe déjà, ne fait rien.
 *
 * Variables utilisées :
 *   ADMIN_EMAIL              (requis)  e-mail de connexion de la patronne
 *   ADMIN_PASSWORD           (requis)  mot de passe initial
 *   ADMIN_NOM                (def: Admin)
 *   ADMIN_PRENOM             (def: Patronne)
 *   ADMIN_TEL_WA             (def: vide) n° WhatsApp de la patronne
 *   ENTREPRISE_NOM           (def: Mon Entreprise)
 *   ENTREPRISE_TEL_GERANT    (def: vide)
 *   ENTREPRISE_TEL_RESPONSABLE (def: vide)
 *
 * Usage : node src/scripts/bootstrap.js
 */
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

function req(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Variable manquante : ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const email = req('ADMIN_EMAIL');
  const password = req('ADMIN_PASSWORD');
  const nom = process.env.ADMIN_NOM || 'Admin';
  const prenom = process.env.ADMIN_PRENOM || 'Patronne';
  const telWa = process.env.ADMIN_TEL_WA || null;
  const entNom = process.env.ENTREPRISE_NOM || 'Mon Entreprise';
  const telGerant = process.env.ENTREPRISE_TEL_GERANT || null;
  const telResp = process.env.ENTREPRISE_TEL_RESPONSABLE || null;

  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      console.log(`↷ bootstrap ignoré : le compte ${email} existe déjà.`);
      return;
    }

    const ent = await pool.query(
      `INSERT INTO entreprises (nom, telephone_gerant, telephone_responsable)
       VALUES ($1,$2,$3) RETURNING id`,
      [entNom, telGerant, telResp],
    );
    const entId = ent.rows[0].id;

    const hash = bcrypt.hashSync(password, 10);
    await pool.query(
      `INSERT INTO users (nom, prenom, email, password_hash, role, telephone_wa, entreprise_id)
       VALUES ($1,$2,$3,$4,'patronne',$5,$6)`,
      [nom, prenom, email, hash, telWa, entId],
    );

    console.log(`✓ bootstrap terminé — entreprise « ${entNom} », compte patronne : ${email}`);
  } catch (err) {
    console.error('Échec du bootstrap :', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
