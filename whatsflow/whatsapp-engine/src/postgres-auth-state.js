// ============================================================
// postgres-auth-state.js
// Remplace useMultiFileAuthState par une version PostgreSQL
// ============================================================

const { proto, initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');

/**
 * Crée un auth-state qui stocke les credentials dans PostgreSQL.
 * 
 * @param {object} pool  - Le client PostgreSQL (pg.Pool)
 * @param {string} sessionId - Identifiant unique de la session (ex: numéro de tel)
 */
async function usePostgresAuthState(pool, sessionId) {

    // ----------------------------------------------------------------
    // FONCTION INTERNE : lire UNE clé depuis PostgreSQL
    // ----------------------------------------------------------------
    async function readData(keyType) {
        try {
            const result = await pool.query(
                `SELECT key_data FROM whatsapp_auth_state 
                 WHERE session_id = $1 AND key_type = $2`,
                [sessionId, keyType]
            );

            if (result.rows.length === 0) return null;

            // BufferJSON.reviver reconstitue les Buffers/Uint8Array
            // que Baileys utilise pour la cryptographie
            return JSON.parse(
                JSON.stringify(result.rows[0].key_data), 
                BufferJSON.reviver
            );
        } catch (error) {
            console.error(`[AuthState] Erreur lecture ${keyType}:`, error.message);
            return null;
        }
    }

    // ----------------------------------------------------------------
    // FONCTION INTERNE : écrire UNE clé dans PostgreSQL
    // ----------------------------------------------------------------
    async function writeData(keyType, data) {
        try {
            const serialized = JSON.parse(
                JSON.stringify(data, BufferJSON.replacer)
            );

            // UPSERT = INSERT ou UPDATE si la clé existe déjà
            await pool.query(
                `INSERT INTO whatsapp_auth_state (session_id, key_type, key_data, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (session_id, key_type) 
                 DO UPDATE SET key_data = $3, updated_at = NOW()`,
                [sessionId, keyType, serialized]
            );
        } catch (error) {
            console.error(`[AuthState] Erreur écriture ${keyType}:`, error.message);
            throw error; // On remonte l'erreur — critique !
        }
    }

    // ----------------------------------------------------------------
    // FONCTION INTERNE : supprimer des clés (pour déconnexion propre)
    // ----------------------------------------------------------------
    async function removeData(keyTypes) {
        if (!keyTypes || keyTypes.length === 0) return;
        try {
            await pool.query(
                `DELETE FROM whatsapp_auth_state 
                 WHERE session_id = $1 AND key_type = ANY($2)`,
                [sessionId, keyTypes]
            );
        } catch (error) {
            console.error(`[AuthState] Erreur suppression:`, error.message);
        }
    }

    // ----------------------------------------------------------------
    // CHARGER les credentials existants (ou en créer de nouveaux)
    // ----------------------------------------------------------------
    let creds = await readData('creds');
    
    if (!creds) {
        // Première fois : on initialise des credentials vierges
        creds = initAuthCreds();
        console.log(`[AuthState] Nouveaux credentials créés pour: ${sessionId}`);
    } else {
        console.log(`[AuthState] Credentials chargés depuis PostgreSQL: ${sessionId}`);
    }

    // ----------------------------------------------------------------
    // RETOURNER l'objet state que Baileys attend
    // ----------------------------------------------------------------
    return {
        state: {
            creds,
            
            // keys = toutes les clés cryptographiques (pre-keys, sessions, etc.)
            keys: {
                
                // Baileys appelle get() pour lire plusieurs clés d'un coup
                get: async (type, ids) => {
                    const data = {};
                    
                    // Lecture en parallèle pour la performance
                    await Promise.all(
                        ids.map(async (id) => {
                            const keyType = `${type}:${id}`;
                            const value = await readData(keyType);
                            if (value) data[id] = value;
                        })
                    );
                    
                    return data;
                },

                // Baileys appelle set() pour écrire/supprimer des clés
                set: async (data) => {
                    const tasks = [];
                    
                    for (const [type, ids] of Object.entries(data)) {
                        for (const [id, value] of Object.entries(ids || {})) {
                            const keyType = `${type}:${id}`;
                            
                            if (value) {
                                // Écrire ou mettre à jour
                                tasks.push(writeData(keyType, value));
                            } else {
                                // null = supprimer cette clé
                                tasks.push(removeData([keyType]));
                            }
                        }
                    }
                    
                    // Tout en parallèle pour la rapidité
                    await Promise.all(tasks);
                }
            }
        },

        // saveCreds() = appelé par Baileys quand les credentials changent
        // (ex: après le scan du QR code)
        saveCreds: async () => {
            await writeData('creds', creds);
            console.log(`[AuthState] Credentials sauvegardés: ${sessionId}`);
        }
    };
}

module.exports = { usePostgresAuthState };