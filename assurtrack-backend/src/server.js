import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { startRelancesCron } from './jobs/relancesCron.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`AssurTrack API → http://localhost:${env.port} (${env.nodeEnv})`);
  startRelancesCron();
});

async function shutdown(signal) {
  console.log(`\n${signal} reçu — arrêt en cours…`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
