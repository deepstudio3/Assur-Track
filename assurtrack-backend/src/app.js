import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import contratsRoutes from './modules/contrats/contrats.routes.js';
import operationsRoutes from './modules/operations/operations.routes.js';
import relancesRoutes from './modules/relances/relances.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import produitsRoutes from './modules/produits/produits.routes.js';
import ventesRoutes from './modules/ventes/ventes.routes.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'assurtrack-api' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/contrats', contratsRoutes);
  app.use('/api/operations', operationsRoutes);
  app.use('/api/relances', relancesRoutes);
  app.use('/api/produits', produitsRoutes);
  app.use('/api/ventes', ventesRoutes);
  app.use('/api/whatsapp', whatsappRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
