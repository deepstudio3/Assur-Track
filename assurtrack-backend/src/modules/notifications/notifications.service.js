import { query } from '../../config/database.js';

/**
 * Crée une notification in-app. Best-effort : ne lève jamais (ne doit pas
 * casser l'opération métier qui la déclenche). userId NULL = diffusion entreprise.
 */
export async function notify(entrepriseId, userId, type, titre, detail) {
  try {
    await query(
      `INSERT INTO notifications (entreprise_id, user_id, type, titre, detail)
       VALUES ($1,$2,$3,$4,$5)`,
      [entrepriseId, userId || null, type, titre, detail || null],
    );
  } catch (err) {
    console.error('[notif] création échouée :', err.message);
  }
}

/** Notifications visibles par un utilisateur (les siennes + diffusions entreprise). */
export async function list(entrepriseId, userId) {
  const { rows } = await query(
    `SELECT id, type, titre, detail, lu, created_at
       FROM notifications
      WHERE entreprise_id = $1 AND (user_id = $2 OR user_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 50`,
    [entrepriseId, userId],
  );
  return rows;
}

/** Marque comme lues toutes les notifications visibles par l'utilisateur. */
export async function markAllRead(entrepriseId, userId) {
  await query(
    `UPDATE notifications SET lu = TRUE
      WHERE entreprise_id = $1 AND (user_id = $2 OR user_id IS NULL) AND lu = FALSE`,
    [entrepriseId, userId],
  );
  return { ok: true };
}
