const redis = require('redis');

class RedisClient {
  constructor(redisUrl, logger) {
    this.redisUrl = redisUrl;
    this.logger = logger;
    this.client = null;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('❌ Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        this.logger.error('❌ Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.info('✅ Redis Client Connected');
      });

      this.client.on('reconnecting', () => {
        this.logger.info('🔄 Redis Client Reconnecting...');
      });

      await this.client.connect();
      this.logger.info('✅ Redis connection established');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('🚪 Redis connection closed');
    }
  }

  // Session Status
  async setSessionStatus(sessionId, status) {
    try {
      await this.client.set(`session:${sessionId}:status`, status);
      await this.client.expire(`session:${sessionId}:status`, 86400); // 24 heures
    } catch (error) {
      this.logger.error(`❌ Error setting session status: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId) {
    try {
      return await this.client.get(`session:${sessionId}:status`);
    } catch (error) {
      this.logger.error(`❌ Error getting session status: ${error.message}`);
      return null;
    }
  }

  // QR Code
  async setQRCode(sessionId, qrCode) {
    try {
      if (qrCode) {
        await this.client.set(`session:${sessionId}:qr`, qrCode);
        await this.client.expire(`session:${sessionId}:qr`, 120); // 2 minutes
      } else {
        await this.client.del(`session:${sessionId}:qr`);
      }
    } catch (error) {
      this.logger.error(`❌ Error setting QR code: ${error.message}`);
    }
  }

  async getQRCode(sessionId) {
    try {
      return await this.client.get(`session:${sessionId}:qr`);
    } catch (error) {
      this.logger.error(`❌ Error getting QR code: ${error.message}`);
      return null;
    }
  }

  // Messages
  async storeMessage(sessionId, message) {
    try {
      const key = `session:${sessionId}:messages`;
      await this.client.rPush(key, JSON.stringify(message));
      await this.client.lTrim(key, -100, -1); // Garder seulement les 100 derniers messages
      await this.client.expire(key, 86400); // 24 heures
    } catch (error) {
      this.logger.error(`❌ Error storing message: ${error.message}`);
    }
  }

  async getMessages(sessionId, count = 10) {
    try {
      const key = `session:${sessionId}:messages`;
      const messages = await this.client.lRange(key, -count, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      this.logger.error(`❌ Error getting messages: ${error.message}`);
      return [];
    }
  }

  // Session Data
  async setSessionData(sessionId, data) {
    try {
      await this.client.set(`session:${sessionId}:data`, JSON.stringify(data));
      await this.client.expire(`session:${sessionId}:data`, 86400);
    } catch (error) {
      this.logger.error(`❌ Error setting session data: ${error.message}`);
    }
  }

  async getSessionData(sessionId) {
    try {
      const data = await this.client.get(`session:${sessionId}:data`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`❌ Error getting session data: ${error.message}`);
      return null;
    }
  }

  // Health Check
  async ping() {
    try {
      return await this.client.ping();
    } catch (error) {
      this.logger.error(`❌ Redis ping failed: ${error.message}`);
      return null;
    }
  }
}

module.exports = { RedisClient };
