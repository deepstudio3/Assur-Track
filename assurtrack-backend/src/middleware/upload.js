import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

// Documents liés aux contrats d'assurance : images + PDF, stockés sur disque
// (volume Docker) avec un nom aléatoire ; les métadonnées vont en base.
const UPLOAD_DIR = env.uploadDir;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10 Mo / fichier, 10 max
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new BadRequestError('Format non autorisé (images ou PDF uniquement)'));
    }
    cb(null, true);
  },
}).array('files', 10);

/** Middleware d'upload qui mappe proprement les erreurs multer vers 400. */
export function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Fichier trop volumineux (10 Mo maximum)'
          : err.message || 'Téléversement invalide';
      return next(new BadRequestError(message));
    }
    next();
  });
}
