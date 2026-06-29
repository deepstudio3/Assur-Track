import { Router } from 'express';
import * as ctrl from './ventes.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

// Routes spécifiques avant /:id
router.get('/', asyncHandler(ctrl.list));
router.get('/dettes', asyncHandler(ctrl.dettes));
router.get('/stats', asyncHandler(ctrl.stats));
router.post('/', asyncHandler(ctrl.create));
router.get('/:id', asyncHandler(ctrl.getOne));
router.post('/:id/payer', asyncHandler(ctrl.payer));

// Aucune route DELETE : les ventes sont immuables.

export default router;
