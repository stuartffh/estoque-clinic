/**
 * ESTOQUE CLINIC - CACHE MIDDLEWARE
 * Middleware para cache de requisições HTTP
 */

const { redisManager } = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Middleware de cache genérico
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutos por padrão
    keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`,
    condition = () => true,
    skipCache = false
  } = options;

  return async (req, res, next) => {
    // Skip cache se especificado
    if (skipCache || !condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Tentar obter do cache
      const cachedData = await redisManager.get(cacheKey);
      
      if (cachedData) {
        logger.debug('🎯 Cache HIT:', { 
          method: req.method, 
          url: req.originalUrl, 
          key: cacheKey 
        });
        
        // Adicionar headers de cache
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey
        });
        
        return res.json(cachedData);
      }

      // Cache miss - interceptar resposta
      logger.debug('📭 Cache MISS:', { 
        method: req.method, 
        url: req.originalUrl, 
        key: cacheKey 
      });

      const originalJson = res.json;
      res.json = function(data) {
        // Salvar no cache apenas se for sucesso (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisManager.set(cacheKey, data, ttl).catch(error => {
            logger.error('❌ Erro ao salvar no cache:', { 
              key: cacheKey, 
              error: error.message 
            });
          });
        }

        // Adicionar headers de cache
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': ttl
        });

        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      logger.error('❌ Erro no middleware de cache:', { 
        error: error.message,
        key: cacheKey 
      });
      next(); // Continuar mesmo com erro de cache
    }
  };
};

/**
 * Cache específico para produtos
 */
const productCache = cacheMiddleware({
  ttl: 600, // 10 minutos
  keyGenerator: (req) => `products:${req.method}:${req.originalUrl}`,
  condition: (req) => req.method === 'GET'
});

/**
 * Cache específico para usuários
 */
const userCache = cacheMiddleware({
  ttl: 300, // 5 minutos
  keyGenerator: (req) => `users:${req.method}:${req.originalUrl}:${req.user?.id || 'anon'}`,
  condition: (req) => req.method === 'GET'
});

/**
 * Cache específico para dashboard
 */
const dashboardCache = cacheMiddleware({
  ttl: 120, // 2 minutos (dados mais dinâmicos)
  keyGenerator: (req) => `dashboard:${req.user?.id}:${req.originalUrl}`,
  condition: (req) => req.method === 'GET'
});

/**
 * Cache específico para relatórios
 */
const reportCache = cacheMiddleware({
  ttl: 1800, // 30 minutos (relatórios são mais estáveis)
  keyGenerator: (req) => `reports:${req.user?.clinicId}:${req.originalUrl}`,
  condition: (req) => req.method === 'GET'
});

/**
 * Invalidar cache por padrão
 */
const invalidateCache = async (pattern) => {
  try {
    await redisManager.clear(pattern);
    logger.info('🧹 Cache invalidado:', { pattern });
  } catch (error) {
    logger.error('❌ Erro ao invalidar cache:', { pattern, error: error.message });
  }
};

/**
 * Middleware para invalidar cache após operações de escrita
 */
const cacheInvalidation = (patterns = []) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = async function(data) {
      // Só invalidar se a operação foi bem sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          const resolvedPattern = typeof pattern === 'function' 
            ? pattern(req) 
            : pattern;
          
          await invalidateCache(resolvedPattern);
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Cache warming - pré-carregar dados importantes
 */
const warmupCache = async () => {
  try {
    logger.info('🔥 Iniciando cache warming...');
    
    // TODO: Implementar pre-loading de dados críticos
    // Exemplo: produtos mais acessados, estatísticas do dashboard, etc.
    
    logger.info('✅ Cache warming concluído');
  } catch (error) {
    logger.error('❌ Erro no cache warming:', { error: error.message });
  }
};

/**
 * Middleware para adicionar headers de performance
 */
const performanceHeaders = (req, res, next) => {
  const startTime = Date.now();
  
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    res.set({
      'X-Response-Time': `${responseTime}ms`,
      'X-Powered-By': 'EstoqueClinic',
      'Cache-Control': 'private, must-revalidate'
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  cacheMiddleware,
  productCache,
  userCache,
  dashboardCache,
  reportCache,
  invalidateCache,
  cacheInvalidation,
  warmupCache,
  performanceHeaders
};