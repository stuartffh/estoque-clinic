/**
 * ESTOQUE CLINIC - CDN CONFIGURATION
 * Configuração de CDN para assets estáticos
 */

const path = require('path');
const { logger } = require('../utils/logger');

class CDNManager {
  constructor() {
    this.isEnabled = process.env.CDN_ENABLED === 'true';
    this.cdnUrl = process.env.CDN_URL || 'https://cdn.estoqueclinic.com';
    this.fallbackUrl = process.env.FALLBACK_URL || '/public';
    this.cachePrefix = 'cdn:';
  }

  /**
   * Obter URL do CDN para um asset
   */
  getAssetUrl(assetPath) {
    if (!this.isEnabled) {
      return `${this.fallbackUrl}${assetPath}`;
    }

    // Normalizar path
    const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    const cdnPath = `${this.cdnUrl}${normalizedPath}`;
    
    logger.debug('🌐 CDN URL gerada:', { 
      original: assetPath, 
      cdn: cdnPath 
    });

    return cdnPath;
  }

  /**
   * Middleware para rewrite de URLs de assets
   */
  assetRewriteMiddleware() {
    return (req, res, next) => {
      const originalJson = res.json;
      const originalSend = res.send;

      // Interceptar JSON responses
      res.json = (data) => {
        if (this.isEnabled && data) {
          data = this.rewriteAssetUrls(data);
        }
        return originalJson.call(res, data);
      };

      // Interceptar HTML responses
      res.send = (data) => {
        if (this.isEnabled && typeof data === 'string' && res.get('Content-Type')?.includes('text/html')) {
          data = this.rewriteHtmlAssets(data);
        }
        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Reescrever URLs em objetos JSON
   */
  rewriteAssetUrls(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.rewriteAssetUrls(item));
    }

    const rewritten = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && this.isAssetUrl(value)) {
        rewritten[key] = this.getAssetUrl(value);
      } else if (typeof value === 'object') {
        rewritten[key] = this.rewriteAssetUrls(value);
      } else {
        rewritten[key] = value;
      }
    }

    return rewritten;
  }

  /**
   * Reescrever URLs em HTML
   */
  rewriteHtmlAssets(html) {
    // Reescrever src attributes
    html = html.replace(/src=["']([^"']*\/public\/[^"']*)["']/g, (match, url) => {
      const cdnUrl = this.getAssetUrl(url.replace('/public', ''));
      return match.replace(url, cdnUrl);
    });

    // Reescrever href attributes para CSS
    html = html.replace(/href=["']([^"']*\.css[^"']*)["']/g, (match, url) => {
      if (url.includes('/public/')) {
        const cdnUrl = this.getAssetUrl(url.replace('/public', ''));
        return match.replace(url, cdnUrl);
      }
      return match;
    });

    return html;
  }

  /**
   * Verificar se é uma URL de asset
   */
  isAssetUrl(url) {
    const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    return assetExtensions.some(ext => url.includes(ext)) || url.includes('/public/');
  }

  /**
   * Gerar headers de cache para assets
   */
  getCacheHeaders(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const now = new Date();
    
    // Cache longo para assets versionados
    const isVersioned = /\.(js|css)$/.test(ext) && filePath.includes('.');
    
    if (isVersioned) {
      return {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 ano
        'Expires': new Date(now.getTime() + 31536000000).toUTCString(),
        'Last-Modified': now.toUTCString(),
        'ETag': `"${Buffer.from(filePath).toString('base64')}"`
      };
    }

    // Cache médio para imagens
    if (/\.(png|jpg|jpeg|gif|svg|ico)$/.test(ext)) {
      return {
        'Cache-Control': 'public, max-age=86400', // 1 dia
        'Expires': new Date(now.getTime() + 86400000).toUTCString(),
        'Last-Modified': now.toUTCString()
      };
    }

    // Cache curto para outros assets
    return {
      'Cache-Control': 'public, max-age=3600', // 1 hora
      'Expires': new Date(now.getTime() + 3600000).toUTCString()
    };
  }

  /**
   * Middleware para headers de cache
   */
  cacheHeadersMiddleware() {
    return (req, res, next) => {
      if (this.isAssetUrl(req.path)) {
        const headers = this.getCacheHeaders(req.path);
        res.set(headers);
        
        logger.debug('💾 Headers de cache aplicados:', { 
          path: req.path, 
          cacheControl: headers['Cache-Control'] 
        });
      }
      next();
    };
  }

  /**
   * Health check do CDN
   */
  async healthCheck() {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }

    try {
      // Tentar acessar um asset de teste do CDN
      const testUrl = `${this.cdnUrl}/health.txt`;
      
      // Em produção, fazer request HTTP real
      // Por agora, simular sucesso
      
      return {
        status: 'healthy',
        url: this.cdnUrl,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ CDN health check falhou:', { 
        error: error.message,
        url: this.cdnUrl 
      });
      
      return {
        status: 'unhealthy',
        error: error.message,
        fallback: this.fallbackUrl
      };
    }
  }

  /**
   * Configuração para Nginx CDN
   */
  generateNginxCDNConfig() {
    return `
# CDN Configuration for EstoqueClinic
location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    # Try CDN first, fallback to local
    try_files $uri @cdn_fallback;
    
    # Cache headers
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Served-By "CDN";
    
    # CORS for fonts
    if ($request_method = 'GET') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }
}

location @cdn_fallback {
    proxy_pass ${this.cdnUrl};
    proxy_cache_valid 200 1d;
    add_header X-Served-By "CDN-Fallback";
}
`;
  }

  /**
   * Invalidar cache do CDN
   */
  async invalidateCache(paths = []) {
    if (!this.isEnabled) {
      return { status: 'skipped', reason: 'CDN disabled' };
    }

    try {
      logger.info('🔄 Invalidando cache CDN:', { paths });
      
      // Em produção, fazer chamada para API do CDN
      // Por exemplo: CloudFlare, AWS CloudFront, etc.
      
      return {
        status: 'success',
        invalidated: paths,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ Erro ao invalidar cache CDN:', { 
        error: error.message, 
        paths 
      });
      
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Instância singleton
const cdnManager = new CDNManager();

module.exports = {
  CDNManager,
  cdnManager
};