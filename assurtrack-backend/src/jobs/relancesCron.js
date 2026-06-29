import cron from 'node-cron';
import { env } from '../config/env.js';
import { verifierEcheances } from '../modules/relances/relances.service.js';

/** Planifie la vérification quotidienne des échéances (heure de Douala). */
export function startRelancesCron() {
  if (!cron.validate(env.relances.cron)) {
    console.warn(`[cron] expression invalide "${env.relances.cron}" — cron désactivé`);
    return;
  }
  cron.schedule(
    env.relances.cron,
    async () => {
      console.log('[cron] vérification des échéances en cours…');
      try {
        await verifierEcheances();
      } catch (err) {
        console.error('[cron] erreur lors des relances :', err.message);
      }
    },
    { timezone: env.relances.tz },
  );
  console.log(`[cron] relances planifiées (${env.relances.cron}, ${env.relances.tz})`);
}
