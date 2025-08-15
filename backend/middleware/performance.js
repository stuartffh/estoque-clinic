/**
 * ESTOQUE CLINIC - PERFORMANCE MONITORING
 * Monitoramento avançado de performance da aplicação
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const { logger } = require('../utils/logger');
const { redisManager } = require('../config/redis');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = process.env.PERFORMANCE_MONITORING !== 'false';
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // 1s
    this.alertThresholds = {
      responseTime: 5000, // 5s
      memoryUsage: 0.85,  // 85%
      cpuUsage: 0.80      // 80%
    };
    
    if (this.isEnabled) {
      this.setupObservers();
      this.startSystemMonitoring();
    }
  }

  /**
   * Configurar observadores de performance
   */
  setupObservers() {
    // Observer para requisições HTTP
    const httpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.startsWith('http-')) {
          this.recordHttpMetric(entry);
        }
      });
    });
    httpObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(httpObserver);

    // Observer para queries de banco
    const dbObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.startsWith('db-')) {
          this.recordDbMetric(entry);
        }
      });
    });
    dbObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(dbObserver);
  }

  /**
   * Middleware para monitoramento de requisições HTTP
   */
  httpMonitoringMiddleware() {
    return (req, res, next) => {
      if (!this.isEnabled) return next();

      const startTime = performance.now();
      const requestId = `http-${req.method}-${req.path}-${Date.now()}`;
      
      // Marcar início da requisição
      performance.mark(`${requestId}-start`);

      // Interceptar resposta
      const originalJson = res.json;
      const originalSend = res.send;

      const finishRequest = (data) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Marcar fim da requisição
        performance.mark(`${requestId}-end`);
        performance.measure(requestId, `${requestId}-start`, `${requestId}-end`);

        // Coletar métricas
        const metrics = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Math.round(duration),
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          bodySize: typeof data === 'string' ? data.length : JSON.stringify(data || {}).length,
          memoryUsage: process.memoryUsage()
        };

        // Registrar métricas
        this.recordMetric('http_request', metrics);

        // Alertar para requisições lentas
        if (duration > this.slowQueryThreshold) {
          this.alertSlowRequest(metrics);
        }

        // Limpar marks para economizar memória
        performance.clearMarks(`${requestId}-start`);
        performance.clearMarks(`${requestId}-end`);
        performance.clearMeasures(requestId);

        return data;
      };

      res.json = function(data) {
        data = finishRequest(data);
        return originalJson.call(this, data);
      };

      res.send = function(data) {
        data = finishRequest(data);
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Monitoramento de queries do banco
   */
  dbQueryMonitor(queryText, duration) {
    if (!this.isEnabled) return;

    const metrics = {
      query: queryText,
      duration: Math.round(duration),
      timestamp: new Date().toISOString(),
      slow: duration > this.slowQueryThreshold
    };

    this.recordMetric('db_query', metrics);

    if (metrics.slow) {
      this.alertSlowQuery(metrics);
    }
  }

  /**
   * Registrar métrica
   */
  recordMetric(type, data) {
    const key = `${type}:${new Date().toISOString().split('T')[0]}`; // Agrupar por dia
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const dayMetrics = this.metrics.get(key);
    dayMetrics.push(data);

    // Limitar número de métricas em memória (últimas 1000 por dia)
    if (dayMetrics.length > 1000) {
      dayMetrics.shift();
    }

    // Salvar no Redis se disponível
    this.saveMetricToRedis(key, data);

    // Log da métrica
    if (data.duration > 100) { // Log apenas operações > 100ms
      logger.info(`⚡ ${type.toUpperCase()}`, data);
    }
  }

  /**
   * Salvar métrica no Redis
   */
  async saveMetricToRedis(key, data) {
    try {
      const redisKey = `metrics:${key}`;
      await redisManager.set(redisKey, data, 86400); // 24 horas
    } catch (error) {
      logger.debug('Erro ao salvar métrica no Redis:', error.message);
    }
  }

  /**
   * Registrar métrica HTTP
   */
  recordHttpMetric(entry) {
    const metrics = {
      name: entry.name,
      duration: Math.round(entry.duration),
      startTime: entry.startTime,
      timestamp: new Date().toISOString()
    };

    logger.debug('📊 HTTP Metric:', metrics);
  }

  /**
   * Registrar métrica de banco
   */
  recordDbMetric(entry) {
    const metrics = {
      name: entry.name,
      duration: Math.round(entry.duration),
      startTime: entry.startTime,
      timestamp: new Date().toISOString()
    };

    logger.debug('🗄️ DB Metric:', metrics);
  }

  /**
   * Alertar requisição lenta
   */
  alertSlowRequest(metrics) {
    logger.warn('🐌 Requisição lenta detectada:', {
      path: metrics.path,
      method: metrics.method,
      duration: `${metrics.duration}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      ip: metrics.ip
    });
  }

  /**
   * Alertar query lenta
   */
  alertSlowQuery(metrics) {
    logger.warn('🗄️ Query lenta detectada:', {
      query: metrics.query.substring(0, 100) + '...',
      duration: `${metrics.duration}ms`,
      threshold: `${this.slowQueryThreshold}ms`
    });
  }

  /**
   * Monitoramento do sistema
   */
  startSystemMonitoring() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // A cada 30 segundos
  }

  /**
   * Coletar métricas do sistema
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemMetrics = {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    this.recordMetric('system', systemMetrics);

    // Alertas para alto uso de recursos
    if (systemMetrics.memory.heapUsagePercent > this.alertThresholds.memoryUsage * 100) {
      logger.warn('⚠️ Alto uso de memória:', {
        usage: `${systemMetrics.memory.heapUsagePercent}%`,
        threshold: `${this.alertThresholds.memoryUsage * 100}%`
      });
    }
  }

  /**
   * Obter estatísticas de performance
   */
  getStatistics(type = null, days = 1) {
    const stats = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    for (const [key, metrics] of this.metrics.entries()) {
      if (type && !key.startsWith(type)) continue;

      const recentMetrics = metrics.filter(metric => 
        new Date(metric.timestamp) >= cutoffDate
      );

      if (recentMetrics.length === 0) continue;

      const durations = recentMetrics
        .map(m => m.duration)
        .filter(d => d !== undefined);

      if (durations.length > 0) {
        stats[key] = {
          count: recentMetrics.length,
          avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          slowQueries: durations.filter(d => d > this.slowQueryThreshold).length
        };
      } else {
        stats[key] = {
          count: recentMetrics.length
        };
      }
    }

    return stats;
  }

  /**
   * Endpoint de métricas para Prometheus/Grafana
   */
  getPrometheusMetrics() {
    const stats = this.getStatistics();
    const systemMetrics = this.getLatestSystemMetrics();
    
    let metrics = '';
    
    // Métricas HTTP
    for (const [key, data] of Object.entries(stats)) {
      if (key.startsWith('http_request')) {
        metrics += `# HELP http_requests_total Total HTTP requests\n`;
        metrics += `# TYPE http_requests_total counter\n`;
        metrics += `http_requests_total{day="${key.split(':')[1]}"} ${data.count}\n`;
        
        if (data.avgDuration) {
          metrics += `# HELP http_request_duration_ms Average HTTP request duration\n`;
          metrics += `# TYPE http_request_duration_ms gauge\n`;
          metrics += `http_request_duration_ms{day="${key.split(':')[1]}"} ${data.avgDuration}\n`;
        }
      }
    }
    
    // Métricas do sistema
    if (systemMetrics) {
      metrics += `# HELP memory_usage_bytes Memory usage in bytes\n`;
      metrics += `# TYPE memory_usage_bytes gauge\n`;
      metrics += `memory_usage_bytes{type="rss"} ${systemMetrics.memory.rss * 1024 * 1024}\n`;
      metrics += `memory_usage_bytes{type="heap_used"} ${systemMetrics.memory.heapUsed * 1024 * 1024}\n`;
      
      metrics += `# HELP process_uptime_seconds Process uptime\n`;
      metrics += `# TYPE process_uptime_seconds gauge\n`;
      metrics += `process_uptime_seconds ${systemMetrics.uptime}\n`;
    }
    
    return metrics;
  }

  /**
   * Obter métricas mais recentes do sistema
   */
  getLatestSystemMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const systemMetrics = this.metrics.get(`system:${today}`);
    
    if (systemMetrics && systemMetrics.length > 0) {
      return systemMetrics[systemMetrics.length - 1];
    }
    
    return null;
  }

  /**
   * Limpar métricas antigas
   */
  cleanupOldMetrics(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(metric => 
        new Date(metric.timestamp) >= cutoffDate
      );
      
      if (filteredMetrics.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filteredMetrics);
      }
    }
    
    logger.info('🧹 Métricas antigas limpas:', { 
      daysKept: daysToKeep, 
      keysRemaining: this.metrics.size 
    });
  }

  /**
   * Parar monitoramento
   */
  stop() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    logger.info('📊 Performance monitoring parado');
  }
}

// Instância singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  performanceMonitor
};