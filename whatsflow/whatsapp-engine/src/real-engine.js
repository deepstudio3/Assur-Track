const express = require('express');
const { create, Client } = require('@open-wa/wa-automate');
const Redis = require('redis');

class WhatsAppRealEngine {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.port = process.env.PORT || 3010;
        this.sessionId = process.env.SESSION_ID || 'default';
        this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        this.client = null;
        this.isConnected = false;
        this.redisClient = null;
        
        this.setupRoutes();
        this.initRedis();
    }
    
    async initRedis() {
        try {
            this.redisClient = Redis.createClient({ url: this.redisUrl });
            await this.redisClient.connect();
            console.log('✅ Redis connecté');
        } catch (error) {
            console.error('❌ Erreur Redis:', error);
        }
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                port: this.port,
                session_id: this.sessionId,
                connected: this.isConnected
            });
        });
        
        // QR Code endpoint
        this.app.get('/qr', async (req, res) => {
            try {
                // Si déjà connecté, retourner le statut
                if (this.isConnected) {
                    return res.json({
                        status: 'already_connected',
                        connected: true,
                        session_id: this.sessionId
                    });
                }
                
                // Récupérer le QR code depuis Redis
                const qrData = await this.redisClient.get(`qr:${this.sessionId}`);
                
                if (qrData) {
                    res.json({ qr: qrData });
                } else {
                    // Démarrer WhatsApp si pas déjà fait
                    if (!this.client) {
                        await this.startWhatsApp();
                    }
                    
                    // Attendre un peu et réessayer
                    setTimeout(async () => {
                        const qrData = await this.redisClient.get(`qr:${this.sessionId}`);
                        if (qrData) {
                            res.json({ qr: qrData });
                        } else {
                            res.json({ 
                                error: 'QR code pas encore disponible',
                                status: 'generating'
                            });
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('❌ Erreur QR:', error);
                res.status(500).json({ error: 'Erreur génération QR' });
            }
        });
        
        // Status endpoint
        this.app.get('/status', (req, res) => {
            res.json({
                status: this.isConnected ? 'connected' : 'awaiting_login',
                connected: this.isConnected,
                session_id: this.sessionId,
                phone_number: this.client ? this.client.info.wid : null
            });
        });
    }
    
    async startWhatsApp() {
        try {
            console.log(`🚀 Démarrage WhatsApp pour session ${this.sessionId}`);
            
            this.client = await create({
                sessionId: this.sessionId,
                qrTimeout: 60000, // 60 secondes
                authTimeout: 60000,
                restartOnCrash: true,
                headless: true,
                logConsole: false,
                qrMaxRetries: 5,
                disableSpins: true,
                chromiumArgs: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            });
            
            // Événement QR code
            this.client.on('qr', async (qrCode) => {
                console.log('📱 QR code reçu');
                
                // Convertir en base64
                const qrBase64 = `data:image/png;base64,${qrCode}`;
                
                // Stocker dans Redis pour 5 minutes
                await this.redisClient.setEx(`qr:${this.sessionId}`, 300, qrBase64);
                
                console.log('✅ QR code stocké dans Redis');
            });
            
            // Événement connexion réussie
            this.client.on('ready', async () => {
                console.log('✅ WhatsApp connecté!');
                this.isConnected = true;
                
                // Stocker le statut
                await this.redisClient.setEx(`status:${this.sessionId}`, 86400, 'CONNECTED');
                
                // Supprimer le QR code
                await this.redisClient.del(`qr:${this.sessionId}`);
                
                console.log(`📱 Session ${this.sessionId} connectée avec succès`);
            });
            
            // Événement déconnexion
            this.client.on('disconnected', (reason) => {
                console.log('❌ WhatsApp déconnecté:', reason);
                this.isConnected = false;
                this.client = null;
            });
            
        } catch (error) {
            console.error('❌ Erreur démarrage WhatsApp:', error);
        }
    }
    
    async start() {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 WhatsApp Engine démarré sur port ${this.port}`);
            console.log(`📱 Session ID: ${this.sessionId}`);
            console.log(`🔗 Redis: ${this.redisUrl}`);
        });
    }
}

// Démarrer le moteur
const engine = new WhatsAppRealEngine();
engine.start();
