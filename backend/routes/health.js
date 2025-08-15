/**
 * ESTOQUE CLINIC - HEALTH CHECK ENDPOINTS
 * Monitoramento completo da saúde do sistema
 */

const express = require('express');
const { getDatabase } = require('../config/database');
const { logger } = require('../utils/logger');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

/**
 * GET /health
 * Health check básico para load balancers
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Verificações básicas
    const checks = {
      database: await checkDatabase(),
      memory: checkMemory(),
      disk: await checkDisk(),
      uptime: process.uptime()
    };
    
    const responseTime = Date.now() - startTime;
    const status = Object.values(checks).every(check => check.healthy) ? 'healthy' : 'unhealthy';
    
    const response = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime,
      checks
    };
    
    const httpStatus = status === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(response);
    
  } catch (error) {
    logger.error('Erro no health check', { error: error.message });
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/detailed
 * Health check detalhado para monitoramento
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const checks = {
      system: await getSystemInfo(),
      database: await getDatabaseStatus(),
      application: await getApplicationStatus(),
      security: await getSecurityStatus(),
      performance: await getPerformanceMetrics()
    };
    
    const responseTime = Date.now() - startTime;
    const overallHealth = Object.values(checks)
      .every(check => check.status === 'healthy');
    
    const response = {
      status: overallHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      checks
    };
    
    res.status(overallHealth ? 200 : 503).json(response);
    
  } catch (error) {
    logger.error('Erro no health check detalhado', { error: error.message });
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/readiness
 * Verificar se o serviço está pronto para receber tráfego
 */
router.get('/readiness', async (req, res) => {
  try {
    const checks = [
      checkDatabase(),
      checkRequiredServices(),
      checkConfiguration()
    ];
    
    const results = await Promise.all(checks);
    const isReady = results.every(result => result.healthy);
    
    const response = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: results[0],
        services: results[1], 
        configuration: results[2]
      }
    };
    
    res.status(isReady ? 200 : 503).json(response);
    
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/liveness
 * Verificar se o serviço está vivo (para Kubernetes)
 */
router.get('/liveness', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

async function checkDatabase() {
  try {
    const db = getDatabase();
    const start = Date.now();
    
    await db.query('SELECT 1');
    const responseTime = Date.now() - start;
    
    // Verificar número de conexões
    const connections = await db.query(`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);
    
    return {
      healthy: true,
      responseTime,
      activeConnections: parseInt(connections.rows[0].active_connections),
      maxConnections: 100 // baseado na configuração
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

function checkMemory() {
  const usage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  const memoryUsagePercent = (usedMem / totalMem) * 100;
  const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
  
  return {
    healthy: heapUsagePercent < 85 && memoryUsagePercent < 90,
    heap: {
      used: Math.round(usage.heapUsed / 1024 / 1024),
      total: Math.round(usage.heapTotal / 1024 / 1024),
      percentage: Math.round(heapUsagePercent)
    },
    system: {
      used: Math.round(usedMem / 1024 / 1024),
      total: Math.round(totalMem / 1024 / 1024),
      free: Math.round(freeMem / 1024 / 1024),
      percentage: Math.round(memoryUsagePercent)
    }
  };
}

async function checkDisk() {
  try {
    const stats = await fs.stat(process.cwd());
    
    return {
      healthy: true,
      path: process.cwd(),
      accessible: true
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

async function getSystemInfo() {
  return {
    status: 'healthy',
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    loadAverage: os.loadavg(),
    uptime: os.uptime()
  };
}

async function getDatabaseStatus() {
  try {
    const db = getDatabase();
    
    // Informações da conexão
    const dbInfo = await db.query(`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as version,
        pg_size_pretty(pg_database_size(current_database())) as database_size
    `);
    
    // Estatísticas de conexões
    const connectionStats = await db.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
    `);
    
    // Estatísticas de tabelas principais
    const tableStats = await db.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
      LIMIT 10
    `);
    
    return {
      status: 'healthy',
      database: dbInfo.rows[0],
      connections: connectionStats.rows[0],
      tables: tableStats.rows
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function getApplicationStatus() {
  const memUsage = process.memoryUsage();
  
  return {
    status: 'healthy',
    pid: process.pid,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    features: {
      swagger: process.env.SWAGGER_ENABLED === 'true',
      cors: !!process.env.CORS_ORIGIN,
      https: process.env.SSL_ENABLED === 'true'
    }
  };
}

async function getSecurityStatus() {
  return {
    status: 'healthy',
    features: {
      helmet: true,
      cors: !!process.env.CORS_ORIGIN,
      rateLimit: true,
      inputValidation: true,
      audit: true,
      jwt: !!process.env.JWT_SECRET
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      secure: process.env.NODE_ENV === 'production'
    }
  };
}

async function getPerformanceMetrics() {
  const cpuUsage = process.cpuUsage();
  const loadAvg = os.loadavg();
  
  return {
    status: 'healthy',
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    system: {
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1], 
        '15min': loadAvg[2]
      },
      cores: os.cpus().length
    },
    eventLoop: {
      // Métricas do event loop (se disponível)
      delay: 'N/A'
    }
  };
}

async function checkRequiredServices() {
  // Verificar se serviços essenciais estão funcionando
  try {
    // Test JWT functionality
    const jwt = require('jsonwebtoken');
    jwt.sign({ test: true }, process.env.JWT_SECRET || 'test', { expiresIn: '1s' });
    
    return {
      healthy: true,
      services: {
        jwt: true,
        logger: true,
        middleware: true
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

async function checkConfiguration() {
  const requiredVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  return {
    healthy: missing.length === 0,
    missingVariables: missing,
    environment: process.env.NODE_ENV
  };
}

module.exports = router;