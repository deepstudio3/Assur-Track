import { Router } from 'express';
import * as ctrl from './templates.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.list));
router.put('/', requireRole('patronne'), asyncHandler(ctrl.save));

export default router;
