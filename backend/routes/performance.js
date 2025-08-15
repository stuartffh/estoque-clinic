/**
 * ESTOQUE CLINIC - PERFORMANCE ROUTES
 * Endpoints para monitoramento de performance
 */

const express = require('express');
const { performanceMonitor } = require('../middleware/performance');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /performance/stats
 * Obter estatísticas de performance
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const { type, days } = req.query;
    const stats = performanceMonitor.getStatistics(type, parseInt(days) || 1);
    
    res.json({
      status: 'success',
      data: stats,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de performance:', { error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'PERFORMANCE_STATS_ERROR'
    });
  }
});

/**
 * GET /performance/metrics
 * Endpoint para Prometheus
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = performanceMonitor.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Erro ao gerar métricas Prometheus:', { error: error.message });
    res.status(500).send('# Error generating metrics');
  }
});

/**
 * GET /performance/system
 * Métricas do sistema em tempo real
 */
router.get('/system', authenticateToken, (req, res) => {
  try {
    const systemMetrics = performanceMonitor.getLatestSystemMetrics();
    const processInfo = {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: require('os').loadavg(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      status: 'success',
      data: {
        current: processInfo,
        latest: systemMetrics
      }
    });
  } catch (error) {
    logger.error('Erro ao obter métricas do sistema:', { error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'SYSTEM_METRICS_ERROR'
    });
  }
});

/**
 * POST /performance/cleanup
 * Limpar métricas antigas
 */
router.post('/cleanup', authenticateToken, (req, res) => {
  try {
    const { days } = req.body;
    const daysToKeep = parseInt(days) || 7;
    
    performanceMonitor.cleanupOldMetrics(daysToKeep);
    
    res.json({
      status: 'success',
      message: `Métricas antigas limpas (mantidos ${daysToKeep} dias)`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao limpar métricas:', { error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'CLEANUP_ERROR'
    });
  }
});

/**
 * GET /performance/slow-queries
 * Obter queries lentas recentes
 */
router.get('/slow-queries', authenticateToken, (req, res) => {
  try {
    const { days } = req.query;
    const stats = performanceMonitor.getStatistics('db_query', parseInt(days) || 1);
    
    // Filtrar apenas queries lentas
    const slowQueries = {};
    for (const [key, data] of Object.entries(stats)) {
      if (data.slowQueries && data.slowQueries > 0) {
        slowQueries[key] = data;
      }
    }
    
    res.json({
      status: 'success',
      data: slowQueries,
      threshold: performanceMonitor.slowQueryThreshold,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao obter queries lentas:', { error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'SLOW_QUERIES_ERROR'
    });
  }
});

/**
 * GET /performance/summary
 * Resumo geral de performance
 */
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const httpStats = performanceMonitor.getStatistics('http_request', 1);
    const dbStats = performanceMonitor.getStatistics('db_query', 1);
    const systemMetrics = performanceMonitor.getLatestSystemMetrics();
    
    // Calcular resumo
    let totalRequests = 0;
    let totalSlowRequests = 0;
    let avgResponseTime = 0;
    
    for (const data of Object.values(httpStats)) {
      totalRequests += data.count;
      totalSlowRequests += data.slowQueries || 0;
      avgResponseTime += data.avgDuration || 0;
    }
    
    if (Object.keys(httpStats).length > 0) {
      avgResponseTime = Math.round(avgResponseTime / Object.keys(httpStats).length);
    }
    
    let totalQueries = 0;
    let totalSlowQueries = 0;
    
    for (const data of Object.values(dbStats)) {
      totalQueries += data.count;
      totalSlowQueries += data.slowQueries || 0;
    }
    
    const summary = {
      http: {
        totalRequests,
        slowRequests: totalSlowRequests,
        avgResponseTime: `${avgResponseTime}ms`,
        slowRequestRate: totalRequests > 0 ? `${((totalSlowRequests / totalRequests) * 100).toFixed(2)}%` : '0%'
      },
      database: {
        totalQueries,
        slowQueries: totalSlowQueries,
        slowQueryRate: totalQueries > 0 ? `${((totalSlowQueries / totalQueries) * 100).toFixed(2)}%` : '0%'
      },
      system: systemMetrics ? {
        memoryUsage: `${systemMetrics.memory.heapUsagePercent}%`,
        heapUsed: `${systemMetrics.memory.heapUsed}MB`,
        uptime: `${Math.round(systemMetrics.uptime / 60)}min`
      } : null,
      thresholds: {
        slowQuery: `${performanceMonitor.slowQueryThreshold}ms`,
        memoryAlert: `${performanceMonitor.alertThresholds.memoryUsage * 100}%`
      },
      period: 'Últimas 24h',
      generated_at: new Date().toISOString()
    };
    
    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    logger.error('Erro ao gerar resumo de performance:', { error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'SUMMARY_ERROR'
    });
  }
});

module.exports = router;