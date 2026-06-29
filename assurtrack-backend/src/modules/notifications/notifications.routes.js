import { Router } from 'express';
import * as ctrl from './notifications.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.list));
router.post('/read', asyncHandler(ctrl.markRead));

export default router;
