const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    useMultiFileAuthState,
    fetchLatestWaWebVersion,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function start() {
    console.log('Démarrage test minimal Baileys...');

    const { version } = await fetchLatestWaWebVersion();
    console.log('Version:', version);

    const { state, saveCreds } = await useMultiFileAuthState('./auth-test');

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: require('pino')({ level: 'debug' }),
        browser: ['Ubuntu', 'Chrome', '120.0.6099.109'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        console.log('Update complet:', JSON.stringify(update, null, 2));

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 SCANNE CE QR CODE :\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('\n✅ CONNECTÉ !', sock.user);

            // Test envoi
            const numero = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            console.log('Envoi message à:', numero);

            try {
                const msg = await sock.sendMessage(numero, {
                    text: 'Test WhatsFlow ✅'
                });
                console.log('✅ MESSAGE ENVOYÉ:', msg.key.id);
            } catch (e) {
                console.error('❌ ERREUR ENVOI:', e.message);
            }

            setTimeout(() => process.exit(0), 3000);
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message;
            console.log(`⚠️ Connexion fermée - Code: ${code} - Raison: ${reason}`);

            if (code === DisconnectReason.loggedOut) {
                console.log('❌ Logged out — supprime auth-test et relance');
                process.exit(1);
                return;
            }

            if (code === 515) {
                // 515 = restart required après pairing réussi — comportement NORMAL
                console.log('🔄 Code 515 = restart requis après pairing. Reconnexion...');
                setTimeout(() => start(), 2000);
                return;
            }

            if (code === 401) {
                console.log('❌ Session expirée — supprime auth-test et relance');
                process.exit(1);
                return;
            }

            // Autres erreurs — on reconnecte aussi
            console.log('🔄 Reconnexion dans 3 secondes...');
            setTimeout(() => start(), 3000);
        }
    });
}

start().catch(console.error);