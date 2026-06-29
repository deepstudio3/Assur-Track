import pg from 'pg';
import { env, isProd } from './env.js';

const { Pool } = pg;

/**
 * Pool PostgreSQL partagé. Les montants DECIMAL sont renvoyés en nombres
 * (le type 1700 = numeric) pour éviter de manipuler des chaînes côté API.
 */
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] erreur inattendue du pool PostgreSQL', err);
});

/** Helper de requête. Retourne directement le résultat pg. */
export function query(text, params) {
  return pool.query(text, params);
}

/** Exécute une fonction dans une transaction (BEGIN/COMMIT/ROLLBACK). */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
