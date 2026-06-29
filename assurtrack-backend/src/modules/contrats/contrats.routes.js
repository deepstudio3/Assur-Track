import { Router } from 'express';
import * as ctrl from './contrats.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { handleUpload } from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.list));
router.post('/', asyncHandler(ctrl.create));

// Documents (images / PDF) — placés avant /:id pour éviter toute ambiguïté
router.get('/documents/:docId', asyncHandler(ctrl.viewDoc));
router.delete('/documents/:docId', asyncHandler(ctrl.deleteDoc));
router.get('/:id/documents', asyncHandler(ctrl.listDocs));
router.post('/:id/documents', handleUpload, asyncHandler(ctrl.uploadDocs));

router.get('/:id', asyncHandler(ctrl.getOne));
router.put('/:id', asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.remove));

export default router;
