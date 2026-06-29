import { Router } from 'express';
import * as ctrl from './produits.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.list));
router.post('/', requireRole('patronne'), asyncHandler(ctrl.create));
router.patch('/:id', requireRole('patronne'), asyncHandler(ctrl.update));

export default router;
