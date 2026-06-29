import { Router } from 'express';
import * as ctrl from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.post('/login', asyncHandler(ctrl.login));
router.post('/logout', authenticate, asyncHandler(ctrl.logout));
router.get('/me', authenticate, asyncHandler(ctrl.me));

export default router;
