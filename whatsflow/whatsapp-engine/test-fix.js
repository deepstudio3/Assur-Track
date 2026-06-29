const { Pool } = require('pg');

async function runTests() {
    console.log('\n==================================');
    console.log('   WHATSFLOW — TESTS MANUELS');
    console.log('==================================\n');

    // ─── TEST 1 ───
    console.log('🧪 TEST 1 : Connexion PostgreSQL...');
    const pool = new Pool({ 
        connectionString: 'postgresql://whatsflow:whatsflow_secure_password@localhost:5433/whatsflow'
    });
    try {
        const res = await pool.query('SELECT NOW() as heure');
        console.log('✅ PostgreSQL OK — Heure:', res.rows[0].heure);
    } catch (e) {
        console.error('❌ PostgreSQL KO:', e.message);
        process.exit(1);
    }

    // ─── TEST 2 ───
    console.log('\n🧪 TEST 2 : Table whatsapp_auth_state...');
    try {
        const res = await pool.query('SELECT COUNT(*) as total FROM whatsapp_auth_state');
        console.log('✅ Table OK — Lignes:', res.rows[0].total);
    } catch (e) {
        console.error('❌ Table manquante:', e.message);
        process.exit(1);
    }

    // ─── TEST 3 ───
    console.log('\n🧪 TEST 3 : Auth-state PostgreSQL...');
    try {
        const { usePostgresAuthState } = require('./src/postgres-auth-state');
        const { saveCreds } = await usePostgresAuthState(pool, 'test-session');
        await saveCreds();
        const res = await pool.query(
            'SELECT key_type FROM whatsapp_auth_state WHERE session_id = $1',
            ['test-session']
        );
        console.log('✅ Auth-state OK — Clés:', res.rows.map(r => r.key_type));
    } catch (e) {
        console.error('❌ Auth-state KO:', e.message);
        process.exit(1);
    }

    // ─── TEST 4 + 5 ───
    console.log('\n🧪 TEST 4 : Connexion WhatsApp...');
    console.log('   📱 Prépare ton téléphone !\n');
    await lancerWhatsApp(pool);
}

async function lancerWhatsApp(pool) {
    const makeWASocket = require('@whiskeysockets/baileys').default;
    const { 
        DisconnectReason,
        fetchLatestWaWebVersion,
        makeCacheableSignalKeyStore
    } = require('@whiskeysockets/baileys');
    const qrcode = require('qrcode-terminal');
    const { usePostgresAuthState } = require('./src/postgres-auth-state');

    // Nettoyer l'ancienne session
    const { Pool } = require('pg');
    
    const { version } = await fetchLatestWaWebVersion();
    console.log('   Version WhatsApp:', version.join('.'));

    const { state, saveCreds } = await usePostgresAuthState(pool, 'test-session');

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, {
                level: () => {}, trace: () => {}, debug: () => {},
                info: () => {}, warn: console.warn, error: console.error,
                child: () => ({
                    level: () => {}, trace: () => {}, debug: () => {},
                    info: () => {}, warn: console.warn, error: console.error,
                })
            }),
        },
        connectTimeoutMs:      60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs:   25000,
        markOnlineOnConnect:   true,
        syncFullHistory:       false,
        browser: ['Ubuntu', 'Chrome', '120.0.6099.109'],
        logger: require('pino')({ level: 'silent' }),
        printQRInTerminal: false,
        getMessage: async () => undefined,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const code = lastDisconnect?.error?.output?.statusCode;

        if (qr) {
            console.log('📱 SCANNE CE QR CODE :\n');
            qrcode.generate(qr, { small: true });
            console.log('\n   → WhatsApp → Appareils connectés → Connecter un appareil');
        }

        if (connection === 'open') {
            console.log('\n✅ TEST 4 OK — Connecté !', sock.user?.id);
            await testEnvoi(sock);
        }

        if (connection === 'close') {
            console.log(`   Connexion fermée, code: ${code}`);

            // 515 = restart normal après scan QR — reconnecter !
            if (code === 515) {
                console.log('🔄 Restart requis (515) — reconnexion automatique...\n');
                setTimeout(() => lancerWhatsApp(pool), 1500);
                return;
            }

            // 401 = logged out
            if (code === 401 || code === DisconnectReason.loggedOut) {
                console.log('❌ Session expirée — relance le script');
                process.exit(1);
                return;
            }

            // Autre erreur
            console.log('❌ Erreur inattendue, code:', code);
            process.exit(1);
        }
    });
}

async function testEnvoi(sock) {
    console.log('\n🧪 TEST 5 : Envoi de message...');
    
    // ⚠️ Ton numéro WhatsApp (format international sans +)
    const monNumero = '237694954113@s.whatsapp.net';
    
    try {
        const result = await sock.sendMessage(monNumero, {
            text: '✅ WhatsFlow corrigé ! Auth-state PostgreSQL fonctionne parfaitement.'
        });
        console.log('✅ TEST 5 OK — Message envoyé ! ID:', result.key.id);
        console.log('\n🎉 TOUS LES TESTS PASSENT ! Le bug est corrigé.\n');
    } catch (e) {
        console.error('❌ TEST 5 ÉCHOUÉ:', e.message);
    }

    setTimeout(() => process.exit(0), 3000);
}

runTests().catch(e => {
    console.error('Erreur fatale:', e);
    process.exit(1);
});