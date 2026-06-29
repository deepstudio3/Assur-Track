/**
 * Applique les migrations SQL puis (option --seed) insère des données de démo.
 * Usage : node src/scripts/migrate.js [--seed]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../migrations');

async function runMigrations() {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    process.stdout.write(`→ migration ${file} ... `);
    await pool.query(sql);
    console.log('ok');
  }
}

async function seed() {
  const { rows } = await pool.query(`SELECT 1 FROM users WHERE email = 'patronne@assurtrack.cm'`);
  if (rows.length) {
    console.log('↷ seed ignoré (données déjà présentes)');
    return;
  }
  console.log('→ seed des données de démonstration ...');
  const hash = bcrypt.hashSync('demo', 10);

  const ent = await pool.query(
    `INSERT INTO entreprises (nom, telephone_gerant, telephone_responsable)
     VALUES ('Assurances du Mfoundi', '+237677445500', '+237699112200') RETURNING id`,
  );
  const entId = ent.rows[0].id;

  const patronne = await pool.query(
    `INSERT INTO users (nom, prenom, email, password_hash, role, telephone_wa, entreprise_id)
     VALUES ('Ndongo','Henriette','patronne@assurtrack.cm',$1,'patronne','+237699112233',$2)
     RETURNING id`,
    [hash, entId],
  );
  const patronneId = patronne.rows[0].id;

  const marie = await pool.query(
    `INSERT INTO users (nom, prenom, email, password_hash, role, telephone_wa, entreprise_id)
     VALUES ('Nkoa','Marie','marie@assurtrack.cm',$1,'secretaire','+237677445566',$2)
     RETURNING id`,
    [hash, entId],
  );
  const marieId = marie.rows[0].id;

  const aicha = await pool.query(
    `INSERT INTO users (nom, prenom, email, password_hash, role, telephone_wa, entreprise_id)
     VALUES ('Bello','Aïcha','aicha@assurtrack.cm',$1,'secretaire','+237671882200',$2)
     RETURNING id`,
    [hash, entId],
  );
  const aichaId = aicha.rows[0].id;

  // Clients
  const clientsData = [
    ['Mballa', 'Étienne', '+237699001122', 'e.mballa@gmail.com'],
    ['Nguema', 'Clarisse', '+237677220011', 'clarisse.n@yahoo.fr'],
    ['Fotso', 'Bernard', '+237655334455', null],
    ['Atangana', 'Solange', '+237698776655', 's.atangana@gmail.com'],
  ];
  const clientIds = [];
  for (const [nom, prenom, tel, email] of clientsData) {
    const r = await pool.query(
      `INSERT INTO clients (entreprise_id, nom, prenom, telephone_wa, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [entId, nom, prenom, tel, email],
    );
    clientIds.push(r.rows[0].id);
  }

  // Contrats — échéances relatives à aujourd'hui
  const contratsData = [
    [0, 'POL-2291', 'Automobile', 185000, 0],
    [1, 'POL-2188', 'Habitation', 95000, 3],
    [2, 'POL-2402', 'Santé', 240000, 6],
    [3, 'POL-1999', 'Automobile', 175000, 12],
    [0, 'POL-2310', 'Voyage', 60000, 24],
    [1, 'POL-1840', 'Voyage', 55000, -4],
  ];
  for (const [ci, police, type, prime, jExp] of contratsData) {
    await pool.query(
      `INSERT INTO contrats
         (entreprise_id, client_id, numero_police, type_assurance,
          date_souscription, date_expiration, montant_prime, statut, created_by)
       VALUES ($1,$2,$3,$4,
          CURRENT_DATE - INTERVAL '365 days',
          CURRENT_DATE + ($5 || ' days')::interval,
          $6, $7, $8)`,
      [entId, clientIds[ci], police, type, jExp, prime, jExp < 0 ? 'expire' : 'actif', patronneId],
    );
  }

  // Dettes caisse (la patronne a pris de l'argent dans la caisse des secrétaires).
  // Le statut est dérivé via FIFO à partir des remboursements ci-dessous.
  const opsData = [
    [marieId, 25000, 'Achat fournitures de bureau', 0],
    [aichaId, 40000, 'Avance carburant déplacement Douala', 0],
    [marieId, 15000, 'Frais de connexion internet', 1],
    [marieId, 8000, 'Taxi course urgente banque', 3],
    [aichaId, 32000, 'Cartouches imprimante', 5],
  ];
  for (const [secId, montant, motif, jAgo] of opsData) {
    await pool.query(
      `INSERT INTO operations_caisse (entreprise_id, secretaire_id, montant, motif, created_at)
       VALUES ($1,$2,$3,$4, NOW() - ($5 || ' days')::interval)`,
      [entId, secId, montant, motif, jAgo],
    );
  }

  // Remboursements (tranches versées par la patronne, par secrétaire)
  const rembData = [
    [marieId, 23000, 1],
    [aichaId, 32000, 2],
  ];
  for (const [secId, montant, jAgo] of rembData) {
    await pool.query(
      `INSERT INTO remboursements (entreprise_id, secretaire_id, montant, par, created_at)
       VALUES ($1,$2,$3,$4, NOW() - ($5 || ' days')::interval)`,
      [entId, secId, montant, patronneId, jAgo],
    );
  }

  // --- Module Comptabilité : produits ---
  const produitsData = [
    ['Jus orange', 700, 'boisson'],
    ['Jus ananas', 700, 'boisson'],
    ['Eau minérale 1.5L', 500, 'boisson'],
    ['Eau 0.5L', 300, 'boisson'],
    ['Soda', 600, 'boisson'],
    ['Photocopie N&B', 50, 'service'],
    ['Photocopie couleur', 150, 'service'],
  ];
  const prodIds = {};
  for (const [nom, prix, cat] of produitsData) {
    const r = await pool.query(
      `INSERT INTO produits (entreprise_id, nom, prix_unitaire, categorie)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [entId, nom, prix, cat],
    );
    prodIds[nom] = { id: r.rows[0].id, prix };
  }

  // --- Ventes + lignes ---
  async function creerVente(secId, items, mode, hAgo, client, statut) {
    const lignes = items.map(([nom, qte]) => ({
      ...prodIds[nom],
      nom,
      qte,
      sous_total: prodIds[nom].prix * qte,
    }));
    const total = lignes.reduce((s, l) => s + l.sous_total, 0);
    const v = await pool.query(
      `INSERT INTO ventes
         (entreprise_id, secretaire_id, montant_total, mode_paiement, statut, client_nom, client_prenom, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() - ($8 || ' hours')::interval) RETURNING id`,
      [entId, secId, total, mode, statut || (mode === 'credit' ? 'en_attente' : 'payee'),
       client?.nom || null, client?.prenom || null, hAgo],
    );
    const venteId = v.rows[0].id;
    for (const l of lignes) {
      await pool.query(
        `INSERT INTO ventes_lignes (vente_id, produit_id, produit_nom, quantite, prix_unitaire, sous_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [venteId, l.id, l.nom, l.qte, l.prix, l.sous_total],
      );
    }
    return { venteId, total };
  }

  await creerVente(marieId, [['Jus orange', 2], ['Eau minérale 1.5L', 1]], 'comptant', 1);
  await creerVente(marieId, [['Jus orange', 3], ['Eau 0.5L', 2]], 'credit', 2, { nom: 'Mballa', prenom: 'Jean' });
  await creerVente(aichaId, [['Photocopie N&B', 40]], 'comptant', 3);
  await creerVente(marieId, [['Jus orange', 10]], 'credit', 26, { nom: 'Mballa', prenom: 'Jean' });
  await creerVente(aichaId, [['Jus ananas', 1], ['Photocopie couleur', 5]], 'credit', 28, { nom: 'Nguema', prenom: 'Pierre' });
  await creerVente(marieId, [['Eau minérale 1.5L', 4]], 'comptant', 50);
  await creerVente(aichaId, [['Soda', 5], ['Jus orange', 5]], 'credit', 52, { nom: 'Fotso', prenom: 'Awa' });

  // Une vente à crédit déjà soldée (reste à l'historique, plus dans les dettes)
  const soldee = await creerVente(marieId, [['Jus orange', 1]], 'credit', 72, { nom: 'Fotso', prenom: 'Awa' }, 'payee');
  await pool.query(
    `INSERT INTO paiements_dette (vente_id, montant, paye_par) VALUES ($1,$2,$3)`,
    [soldee.venteId, soldee.total, marieId],
  );

  console.log('✓ seed terminé — comptes : patronne@assurtrack.cm / marie@assurtrack.cm (mot de passe : demo)');
}

async function main() {
  try {
    await runMigrations();
    if (process.argv.includes('--seed')) await seed();
    console.log('Migrations terminées.');
  } catch (err) {
    console.error('Échec des migrations :', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
