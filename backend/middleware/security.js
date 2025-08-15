/**
 * Middleware de Segurança
 * Configurações de segurança robustas usando Helmet e outras proteções
 */

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

/**
 * Configuração do Helmet para máxima segurança
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // Frameguard - previne clickjacking
  frameguard: {
    action: 'deny'
  },
  
  // Hide Powered By header
  hidePoweredBy: true,
  
  // HSTS - force HTTPS
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff - previne MIME sniffing
  noSniff: true,
  
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin']
  },
  
  // XSS Filter
  xssFilter: true
});

/**
 * Middleware para sanitização contra NoSQL injection
 */
const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️  Tentativa de NoSQL injection detectada: ${key} em ${req.path}`);
  }
});

/**
 * Middleware para proteção XSS avançada
 */
const xssProtection = (req, res, next) => {
  if (req.body) {
    // Sanitizar recursivamente todos os campos de string
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Função para sanitizar objetos recursivamente
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // Remove todas as tags HTML
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizar também as chaves do objeto
      const sanitizedKey = xss(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware para headers de segurança customizados
 */
const customSecurityHeaders = (req, res, next) => {
  // Remover headers que podem expor informações sensíveis
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Headers de segurança customizados
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Feature Policy (para navegadores mais antigos)
  res.setHeader('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'");
  
  next();
};

/**
 * Middleware para proteção contra HTTP Parameter Pollution
 */
const protectAgainstHPP = (req, res, next) => {
  // Verificar parâmetros duplicados em query string
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      console.warn(`⚠️  Possível HTTP Parameter Pollution detectado: ${key} em ${req.path}`);
      // Manter apenas o último valor
      req.query[key] = value[value.length - 1];
    }
  }
  
  next();
};

/**
 * Middleware para validação de Content-Type
 */
const validateContentType = (req, res, next) => {
  // Permitir apenas application/json para POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Content-Type deve ser application/json',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
  }
  
  next();
};

/**
 * Middleware para limitar tamanho do body
 */
const limitBodySize = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const limitInMB = parseInt(limit);
      
      if (sizeInMB > limitInMB) {
        return res.status(413).json({
          error: `Tamanho do body excede o limite de ${limit}`,
          code: 'PAYLOAD_TOO_LARGE'
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware para detectar e bloquear user agents suspeitos
 */
const blockSuspiciousUserAgents = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Lista de user agents suspeitos (bots maliciosos, scanners, etc.)
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /nessus/i,
    /openvas/i,
    /nuclei/i,
    /burpsuite/i,
    /acunetix/i,
    /w3af/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      console.warn(`⚠️  User-Agent suspeito bloqueado: ${userAgent} de IP ${req.ip}`);
      return res.status(403).json({
        error: 'Acesso negado',
        code: 'SUSPICIOUS_USER_AGENT'
      });
    }
  }
  
  next();
};

module.exports = {
  helmetConfig,
  sanitizeInput,
  xssProtection,
  customSecurityHeaders,
  protectAgainstHPP,
  validateContentType,
  limitBodySize,
  blockSuspiciousUserAgents
};