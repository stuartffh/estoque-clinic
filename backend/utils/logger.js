/**
 * Sistema de Logs Estruturados com Winston
 * Logging completo com diferentes níveis e formatos
 */

const winston = require('winston');
const path = require('path');

// Criar diretório de logs se não existir
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Formatter customizado para logs estruturados
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(info => {
    const { timestamp, level, message, service, userId, ip, userAgent, method, url, statusCode, responseTime, ...meta } = info;
    
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      service: service || 'estoque-clinic-api',
      context: {
        userId: userId || null,
        ip: ip || null,
        userAgent: userAgent || null,
        method: method || null,
        url: url || null,
        statusCode: statusCode || null,
        responseTime: responseTime || null
      },
      metadata: Object.keys(meta).length > 0 ? meta : undefined
    });
  })
);

/**
 * Configuração do logger principal
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: 'estoque-clinic-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Log de erros em arquivo separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    }),
    
    // Log de atividade geral
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      handleExceptions: true,
      handleRejections: true
    }),
    
    // Log de auditoria (apenas info e warning)
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 20,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Em desenvolvimento, adicionar console com cores
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(info => {
        const { timestamp, level, message, userId, ip, method, url, statusCode, responseTime } = info;
        let output = `${timestamp} [${level}]: ${message}`;
        
        if (method && url) {
          output += ` | ${method} ${url}`;
        }
        
        if (statusCode) {
          output += ` | Status: ${statusCode}`;
        }
        
        if (responseTime) {
          output += ` | ${responseTime}ms`;
        }
        
        if (userId) {
          output += ` | User: ${userId}`;
        }
        
        if (ip) {
          output += ` | IP: ${ip}`;
        }
        
        return output;
      })
    )
  }));
}

/**
 * Logger específico para segurança
 */
const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10
    })
  ]
});

/**
 * Logger específico para performance
 */
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

/**
 * Middleware para logging automático de requisições
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar informações da requisição
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    username: req.user ? req.user.username : null
  };
  
  // Override do res.end para capturar tempo de resposta
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log da requisição
    const logData = {
      ...requestInfo,
      statusCode,
      responseTime
    };
    
    // Determinar nível do log baseado no status
    if (statusCode >= 500) {
      logger.error('Erro interno do servidor', logData);
    } else if (statusCode >= 400) {
      logger.warn('Erro na requisição', logData);
    } else {
      logger.info('Requisição processada', logData);
    }
    
    // Log de performance para requisições lentas
    if (responseTime > 1000) {
      performanceLogger.warn('Requisição lenta detectada', {
        ...logData,
        threshold: '1000ms'
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Funções de conveniência para diferentes tipos de log
 */
const logAuth = (action, user, req, success = true, details = {}) => {
  const logData = {
    action,
    userId: user?.id || null,
    username: user?.username || null,
    ip: req?.ip || null,
    userAgent: req?.get('User-Agent') || null,
    success,
    ...details
  };
  
  if (success) {
    logger.info(`Ação de autenticação: ${action}`, logData);
  } else {
    securityLogger.warn(`Falha na autenticação: ${action}`, logData);
  }
};

const logSecurity = (event, req, details = {}) => {
  const logData = {
    event,
    ip: req?.ip || null,
    userAgent: req?.get('User-Agent') || null,
    userId: req?.user?.id || null,
    url: req?.url || null,
    method: req?.method || null,
    ...details
  };
  
  securityLogger.warn(`Evento de segurança: ${event}`, logData);
};

const logDataAccess = (action, resource, user, req, details = {}) => {
  const logData = {
    action, // CREATE, READ, UPDATE, DELETE
    resource, // users, products, inventory, etc.
    userId: user?.id || null,
    username: user?.username || null,
    ip: req?.ip || null,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  logger.info(`Acesso aos dados: ${action} ${resource}`, logData);
};

const logError = (error, req, context = {}) => {
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    request: {
      method: req?.method || null,
      url: req?.url || null,
      ip: req?.ip || null,
      userAgent: req?.get('User-Agent') || null,
      userId: req?.user?.id || null
    },
    context
  };
  
  logger.error('Erro na aplicação', logData);
};

const logInventoryMovement = (movement, user, req) => {
  const logData = {
    movementType: movement.type,
    productId: movement.product_id,
    quantity: movement.quantity,
    clinicId: movement.clinic_id,
    userId: user.id,
    username: user.username,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    batchNumber: movement.batch_number || null,
    supplier: movement.supplier || null
  };
  
  logger.info('Movimentação de estoque', logData);
};

/**
 * Middleware para capturar erros não tratados
 */
const errorLogger = (error, req, res, next) => {
  logError(error, req, {
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(error);
};

/**
 * Configurar handlers para erros não capturados
 */
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  });
  
  // Em produção, deve fazer shutdown graceful
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
});

module.exports = {
  logger,
  securityLogger,
  performanceLogger,
  requestLogger,
  errorLogger,
  logAuth,
  logSecurity,
  logDataAccess,
  logError,
  logInventoryMovement
};