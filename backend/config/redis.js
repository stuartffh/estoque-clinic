/**
 * ESTOQUE CLINIC - REDIS CONFIGURATION
 * Sistema de cache distribuído para alta performance
 */

const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Inicializar conexão Redis
   */
  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        // Configurações de performance
        maxLoadingTimeout: 5000,
        commandTimeout: 5000,
        // Pool de conexões
        family: 4,
        enableOfflineQueue: false
      };

      this.client = new Redis(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('✅ Redis conectado com sucesso');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('🚀 Redis pronto para uso');
      });

      this.client.on('error', (error) => {
        logger.error('❌ Erro no Redis:', { 
          error: error.message,
          code: error.code 
        });
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('⚠️ Conexão Redis fechada');
        this.isConnected = false;
      });

      this.client.on('reconnecting', (delay) => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          logger.info(`🔄 Reconectando ao Redis (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${delay}ms`);
        }
      });

      // Tentar conectar
      await this.client.connect();

    } catch (error) {
      logger.error('❌ Falha ao conectar no Redis:', { 
        error: error.message,
        fallback: 'Usando cache em memória'
      });
      
      // Fallback para cache em memória se Redis não estiver disponível
      this.client = new MemoryCache();
      this.isConnected = false;
    }
  }

  /**
   * Obter cliente Redis
   */
  getClient() {
    if (!this.client) {
      logger.warn('⚠️ Redis não inicializado, usando fallback');
      return new MemoryCache();
    }
    return this.client;
  }

  /**
   * Verificar se está conectado
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * Cache com TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (this.isReady()) {
        await this.client.setex(key, ttlSeconds, serializedValue);
      } else {
        // Fallback para cache em memória
        this.client.set(key, serializedValue, ttlSeconds);
      }
      
      logger.debug('📝 Cache SET:', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.error('❌ Erro ao definir cache:', { key, error: error.message });
    }
  }

  /**
   * Obter do cache
   */
  async get(key) {
    try {
      let value;
      
      if (this.isReady()) {
        value = await this.client.get(key);
      } else {
        value = this.client.get(key);
      }
      
      if (value) {
        logger.debug('📖 Cache HIT:', { key });
        return JSON.parse(value);
      }
      
      logger.debug('📭 Cache MISS:', { key });
      return null;
    } catch (error) {
      logger.error('❌ Erro ao obter cache:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Deletar do cache
   */
  async del(key) {
    try {
      if (this.isReady()) {
        await this.client.del(key);
      } else {
        this.client.del(key);
      }
      
      logger.debug('🗑️ Cache DEL:', { key });
    } catch (error) {
      logger.error('❌ Erro ao deletar cache:', { key, error: error.message });
    }
  }

  /**
   * Limpar cache por padrão
   */
  async clear(pattern = '*') {
    try {
      if (this.isReady()) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        this.client.clear();
      }
      
      logger.info('🧹 Cache limpo:', { pattern });
    } catch (error) {
      logger.error('❌ Erro ao limpar cache:', { pattern, error: error.message });
    }
  }

  /**
   * Fechar conexão
   */
  async disconnect() {
    if (this.client && this.isReady()) {
      await this.client.quit();
      logger.info('👋 Redis desconectado');
    }
  }
}

/**
 * Cache em memória como fallback
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttlSeconds) {
    // Limpar timer anterior se existir
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, value);

    // Definir expiração
    if (ttlSeconds > 0) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttlSeconds * 1000);
      
      this.timers.set(key, timer);
    }
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  clear() {
    // Limpar todos os timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }
}

// Instância singleton
const redisManager = new RedisManager();

module.exports = {
  RedisManager,
  redisManager,
  MemoryCache
};