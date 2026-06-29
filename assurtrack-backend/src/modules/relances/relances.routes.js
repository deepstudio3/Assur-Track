import { Router } from 'express';
import * as service from './relances.service.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await service.list({
      entrepriseId: req.user.entreprise_id,
      contratId: req.query.contrat_id,
    });
    res.json({ data });
  }),
);

router.post(
  '/manuel/:contrat_id',
  asyncHandler(async (req, res) => {
    const result = await service.envoyerManuelle(req.params.contrat_id, req.user.entreprise_id);
    res.json(result);
  }),
);

export default router;
