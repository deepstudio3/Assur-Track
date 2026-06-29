import { Router } from 'express';
import { query } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as operations from '../operations/operations.service.js';
import * as ventes from '../ventes/ventes.service.js';

const router = Router();

router.use(authenticate);

// Stats ventes (CA jour/mois, dettes clients, nb ventes du jour)
router.get(
  '/stats-ventes',
  asyncHandler(async (req, res) => {
    const data = await ventes.stats(req.user.entreprise_id);
    res.json(data);
  }),
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const entrepriseId = req.user.entreprise_id;

    const contratRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE statut = 'actif')::int AS contrats_actifs,
         COUNT(*) FILTER (WHERE statut = 'actif'
           AND date_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::int AS echeances_7j,
         COUNT(*) FILTER (WHERE statut = 'actif'
           AND date_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::int AS echeances_30j
       FROM contrats WHERE entreprise_id = $1`,
      [entrepriseId],
    );

    const relances30 = await query(
      `SELECT COUNT(*)::int AS total
       FROM relances r JOIN contrats c ON c.id = r.contrat_id
       WHERE c.entreprise_id = $1 AND r.envoye_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [entrepriseId],
    );

    const serie = await query(
      `SELECT to_char(d.jour, 'YYYY-MM-DD') AS date,
              COUNT(r.id) FILTER (WHERE r.statut = 'envoye')::int AS envoyees,
              COUNT(r.id) FILTER (WHERE r.statut = 'echec')::int  AS echecs
       FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d(jour)
       LEFT JOIN relances r ON date_trunc('day', r.envoye_at) = d.jour
       LEFT JOIN contrats c ON c.id = r.contrat_id AND c.entreprise_id = $1
       GROUP BY d.jour ORDER BY d.jour`,
      [entrepriseId],
    );

    const payload = {
      contrats_actifs: contratRes.rows[0].contrats_actifs,
      echeances_7j: contratRes.rows[0].echeances_7j,
      echeances_30j: contratRes.rows[0].echeances_30j,
      relances_30j: relances30.rows[0].total,
      relances_serie: serie.rows,
    };

    // Stats caisse : patronne = toute l'entreprise ; secrétaire = ses propres dettes.
    if (req.user.role === 'patronne') {
      payload.caisse = await operations.stats(entrepriseId);
    } else if (req.user.role === 'secretaire') {
      payload.caisse = await operations.stats(entrepriseId, { secretaireId: req.user.id });
    }

    res.json(payload);
  }),
);

export default router;
