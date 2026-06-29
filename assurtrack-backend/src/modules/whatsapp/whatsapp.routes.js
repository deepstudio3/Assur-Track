import { Router } from 'express';
import * as ctrl from './whatsapp.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// La connexion WhatsApp se pilote depuis le compte patronne uniquement.
router.use(authenticate, requireRole('patronne'));

router.get('/status', asyncHandler(ctrl.status));
router.get('/qr', asyncHandler(ctrl.qr));
router.post('/connect', asyncHandler(ctrl.connect));
router.post('/restart', asyncHandler(ctrl.restart));
router.delete('/session', asyncHandler(ctrl.disconnect));

export default router;
