/**
 * Sistema de Rate Limiting Avançado
 * Controle de taxa de requisições por usuário, IP e endpoint
 */

const rateLimit = require('express-rate-limit');
const { ApiError } = require('./errorHandler');

/**
 * Store customizado para rate limiting (em produção usar Redis)
 */
class MemoryStore {
  constructor() {
    this.hits = new Map();
    this.resetTime = new Map();
  }

  incr(key, cb) {
    const now = Date.now();
    
    if (!this.hits.has(key)) {
      this.hits.set(key, 0);
      this.resetTime.set(key, now + 15 * 60 * 1000); // 15 minutos
    }

    // Reset se passou do tempo
    if (now > this.resetTime.get(key)) {
      this.hits.set(key, 0);
      this.resetTime.set(key, now + 15 * 60 * 1000);
    }

    const hits = this.hits.get(key) + 1;
    this.hits.set(key, hits);
    
    // Retornar no formato esperado pelo express-rate-limit
    cb(null, hits, new Date(this.resetTime.get(key)));
  }

  decrement(key) {
    const current = this.hits.get(key) || 0;
    if (current > 0) {
      this.hits.set(key, current - 1);
    }
  }

  resetKey(key) {
    this.hits.delete(key);
    this.resetTime.delete(key);
  }
}

const store = new MemoryStore();

/**
 * Gerador de chave personalizado baseado em usuário e IP
 */
const generateKey = (req) => {
  // Priorizar usuário autenticado, senão usar IP
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  
  // Obter IP real considerando proxies
  const ip = req.ip || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);
             
  return `ip:${ip}`;
};

/**
 * Handler customizado para quando rate limit é excedido
 */
const rateLimitHandler = (req, res) => {
  const error = new ApiError(
    429, 
    'Muitas requisições. Tente novamente em alguns minutos.', 
    'RATE_LIMIT_EXCEEDED',
    {
      retryAfter: req.rateLimit?.resetTime ? Math.round((req.rateLimit.resetTime - Date.now()) / 1000) : 900,
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining
    }
  );

  // Log da tentativa de rate limiting
  console.warn(`⚠️  Rate limit excedido: ${generateKey(req)} - ${req.method} ${req.path}`);

  res.status(429).json({
    error: error.message,
    code: error.code,
    details: error.details
  });
};

/**
 * Rate limit geral (mais permissivo)
 */
const generalRateLimit = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Máximo 1000 requisições por 15 minutos
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para health checks
    return req.path === '/health' || req.path === '/ping';
  }
});

/**
 * Rate limit para autenticação (mais restritivo)
 */
const authRateLimit = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 tentativas de login por 15 minutos
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Não conta requisições bem-sucedidas
});

/**
 * Rate limit para criação de recursos
 */
const createResourceRateLimit = rateLimit({
  store: store,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // Máximo 20 criações por 5 minutos
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limit para APIs públicas
 */
const publicApiRateLimit = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requisições por 15 minutos
  keyGenerator: (req) => `public:${req.ip}`,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limit dinâmico baseado no papel do usuário
 */
const dynamicRateLimit = (req, res, next) => {
  let maxRequests = 100; // Padrão para usuários não autenticados
  
  if (req.user) {
    switch (req.user.role) {
      case 'super_admin':
        maxRequests = 10000; // Super admins tem limite muito alto
        break;
      case 'admin':
        maxRequests = 5000;
        break;
      case 'manager':
        maxRequests = 2000;
        break;
      case 'user':
        maxRequests = 500;
        break;
      default:
        maxRequests = 100;
    }
  }

  const dynamicLimit = rateLimit({
    store: store,
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: maxRequests,
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false
  });

  return dynamicLimit(req, res, next);
};

/**
 * Rate limit para upload de arquivos
 */
const uploadRateLimit = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // Máximo 50 uploads por hora
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Middleware para detectar e penalizar comportamento suspeito
 */
const suspiciousActivityDetector = (req, res, next) => {
  const key = generateKey(req);
  const now = Date.now();
  
  // Detectar muitas requisições 4xx em pouco tempo
  if (res.statusCode >= 400 && res.statusCode < 500) {
    const errorKey = `errors:${key}`;
    
    if (!store.hits.has(errorKey)) {
      store.hits.set(errorKey, 0);
      store.resetTime.set(errorKey, now + 5 * 60 * 1000); // 5 minutos
    }
    
    const errorCount = store.hits.get(errorKey) + 1;
    store.hits.set(errorKey, errorCount);
    
    // Se mais de 20 erros em 5 minutos, aplicar penalidade
    if (errorCount > 20) {
      console.warn(`⚠️  Atividade suspeita detectada: ${key} - ${errorCount} erros em 5 minutos`);
      
      // Aumentar rate limiting temporariamente
      const penaltyKey = `penalty:${key}`;
      store.hits.set(penaltyKey, 1);
      store.resetTime.set(penaltyKey, now + 30 * 60 * 1000); // 30 minutos de penalidade
      
      return res.status(429).json({
        error: 'Atividade suspeita detectada. Acesso temporariamente restrito.',
        code: 'SUSPICIOUS_ACTIVITY'
      });
    }
  }
  
  next();
};

/**
 * Middleware para whitelist de IPs confiáveis
 */
const trustedIpWhitelist = [
  '127.0.0.1',
  '::1',
  // Adicionar IPs de monitoramento, load balancers, etc.
];

const ipWhitelistMiddleware = (req, res, next) => {
  const ip = req.ip;
  
  if (trustedIpWhitelist.includes(ip)) {
    // Pular rate limiting para IPs confiáveis
    req.skipRateLimit = true;
  }
  
  next();
};

/**
 * Função para limpar dados antigos do store (garbage collection)
 */
const cleanupStore = () => {
  const now = Date.now();
  
  for (const [key, resetTime] of store.resetTime.entries()) {
    if (now > resetTime) {
      store.hits.delete(key);
      store.resetTime.delete(key);
    }
  }
};

// Executar limpeza a cada 10 minutos
setInterval(cleanupStore, 10 * 60 * 1000);

module.exports = {
  generalRateLimit,
  authRateLimit,
  createResourceRateLimit,
  publicApiRateLimit,
  dynamicRateLimit,
  uploadRateLimit,
  suspiciousActivityDetector,
  ipWhitelistMiddleware,
  store,
  cleanupStore
};