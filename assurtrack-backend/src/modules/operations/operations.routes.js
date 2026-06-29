import { Router } from 'express';
import * as ctrl from './operations.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

// Dettes + remboursements (le service restreint une secrétaire à elle-même).
router.get('/', asyncHandler(ctrl.list));

// Déclarer une dette : secrétaire uniquement.
router.post('/', requireRole('secretaire'), asyncHandler(ctrl.create));

// Rembourser une tranche : patronne uniquement.
router.post('/remboursements', requireRole('patronne'), asyncHandler(ctrl.rembourser));
router.get('/remboursements', asyncHandler(ctrl.historiqueRemboursements));

// Aucune route DELETE : dettes et remboursements sont immuables.

export default router;
