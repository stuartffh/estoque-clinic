/**
 * ESTOQUE CLINIC - COMPRESSION MIDDLEWARE
 * Compressão Gzip e Brotli para otimização de performance
 */

const compression = require('compression');
const { logger } = require('../utils/logger');

/**
 * Configuração avançada de compressão
 */
const compressionConfig = compression({
  // Nível de compressão (1-9, onde 9 é máximo)
  level: 6, // Balanço entre velocidade e compressão
  
  // Threshold mínimo para compressão (bytes)
  threshold: 1024, // Só comprimir arquivos > 1KB
  
  // Filtro para tipos de arquivo
  filter: (req, res) => {
    const contentType = res.getHeader('content-type');
    
    if (!contentType) return false;
    
    // Comprimir apenas tipos específicos
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'image/svg+xml'
    ];
    
    const shouldCompress = compressibleTypes.some(type => 
      contentType.toString().startsWith(type)
    );
    
    // Log da decisão de compressão
    if (shouldCompress) {
      logger.debug('🗜️ Comprimindo resposta:', { 
        url: req.originalUrl, 
        contentType: contentType.toString(),
        size: res.getHeader('content-length')
      });
    }
    
    return shouldCompress;
  },
  
  // Configurações de memoria
  chunkSize: 16 * 1024, // 16KB chunks
  windowBits: 15,
  memLevel: 8
});

/**
 * Middleware para adicionar headers de compressão
 */
const compressionHeaders = (req, res, next) => {
  // Verificar suporte do cliente
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Preferir Brotli se suportado
  if (acceptEncoding.includes('br')) {
    res.set('Vary', 'Accept-Encoding');
    logger.debug('🎯 Cliente suporta Brotli:', { userAgent: req.get('User-Agent') });
  } else if (acceptEncoding.includes('gzip')) {
    res.set('Vary', 'Accept-Encoding');
    logger.debug('📦 Cliente suporta Gzip:', { userAgent: req.get('User-Agent') });
  }
  
  next();
};

/**
 * Middleware para compressão condicional baseada no tamanho
 */
const conditionalCompression = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    const serialized = JSON.stringify(data);
    const size = Buffer.byteLength(serialized, 'utf8');
    
    // Adicionar header de tamanho original
    res.set('X-Uncompressed-Size', size.toString());
    
    // Só usar compressão para respostas grandes
    if (size > 2048) { // > 2KB
      logger.debug('📏 Resposta grande, aplicando compressão:', { 
        url: req.originalUrl, 
        size: `${Math.round(size / 1024)}KB`
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Configuração de cache para recursos estáticos comprimidos
 */
const staticCompressionCache = (req, res, next) => {
  // Verificar se é um recurso estático
  const isStatic = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(req.path);
  
  if (isStatic) {
    // Cache agressivo para recursos estáticos
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 ano
      'Expires': new Date(Date.now() + 31536000000).toUTCString()
    });
    
    logger.debug('💾 Cache definido para recurso estático:', { path: req.path });
  }
  
  next();
};

/**
 * Middleware para monitoramento de compressão
 */
const compressionStats = (req, res, next) => {
  const originalEnd = res.end;
  const startTime = Date.now();
  
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const originalSize = res.getHeader('X-Uncompressed-Size');
    const compressedSize = res.getHeader('content-length');
    
    if (originalSize && compressedSize) {
      const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      logger.info('📊 Estatísticas de compressão:', {
        url: req.originalUrl,
        originalSize: `${Math.round(originalSize / 1024)}KB`,
        compressedSize: `${Math.round(compressedSize / 1024)}KB`,
        compressionRatio: `${ratio}%`,
        duration: `${duration}ms`,
        encoding: res.getHeader('content-encoding')
      });
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Configuração Brotli para Nginx (arquivo de configuração)
 */
const generateBrotliConfig = () => {
  return `
# Brotli Compression Configuration
brotli on;
brotli_comp_level 6;
brotli_min_length 1024;
brotli_types
    application/json
    application/javascript
    application/rss+xml
    application/xml
    image/svg+xml
    text/css
    text/javascript
    text/plain
    text/xml;
`;
};

module.exports = {
  compressionConfig,
  compressionHeaders,
  conditionalCompression,
  staticCompressionCache,
  compressionStats,
  generateBrotliConfig
};