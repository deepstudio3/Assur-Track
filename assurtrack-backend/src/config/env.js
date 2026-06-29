import dotenv from 'dotenv';

dotenv.config();

/** Lit une variable d'environnement requise, lève une erreur si absente. */
function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  whatsflow: {
    url: process.env.WHATSFLOW_URL || '', // vide = envois désactivés
    token: process.env.WHATSFLOW_TOKEN || '',
    client: process.env.WHATSFLOW_CLIENT || '',
  },

  relances: {
    cron: process.env.RELANCES_CRON || '0 7 * * *',
    tz: process.env.RELANCES_TZ || 'Africa/Douala',
  },
};

export const isProd = env.nodeEnv === 'production';
