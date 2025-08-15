/**
 * Sistema de Auditoria Completo
 * Rastreamento de todas as ações críticas do sistema
 */

const { getDatabase } = require('../config/database');
const { logger, logDataAccess } = require('../utils/logger');

/**
 * Enum de ações auditadas
 */
const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ', 
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  BACKUP: 'BACKUP',
  RESTORE: 'RESTORE'
};

/**
 * Enum de recursos auditados
 */
const AUDIT_RESOURCES = {
  USER: 'users',
  PRODUCT: 'products',
  INVENTORY: 'inventory',
  MOVEMENT: 'movements',
  CLINIC: 'clinics',
  AUTH: 'authentication',
  SYSTEM: 'system'
};

/**
 * Enum de níveis de criticidade
 */
const AUDIT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Classe para gerenciar auditoria
 */
class AuditManager {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Inicializar conexão com banco (lazy initialization)
   */
  init() {
    if (!this.initialized) {
      try {
        this.db = getDatabase();
        this.ensureAuditTable();
        this.initialized = true;
        logger.info('✅ Sistema de auditoria inicializado');
      } catch (error) {
        logger.error('❌ Erro ao inicializar sistema de auditoria', { error: error.message });
        throw error;
      }
    }
  }

  /**
   * Garantir que a tabela de auditoria existe
   */
  ensureAuditTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100),
        user_id INTEGER,
        username VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        level VARCHAR(20) DEFAULT 'medium',
        details TEXT,
        old_values TEXT,
        new_values TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        session_id VARCHAR(100),
        clinic_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    this.db.query(createTableSQL)
      .then(() => {
        logger.info('Tabela de auditoria verificada/criada com sucesso');
      })
      .catch((err) => {
        logger.error('Erro ao criar tabela de auditoria', { error: err.message });
      });

    // Criar índices para performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);',
      'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);',
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);',
      'CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_logs(level);'
    ];

    indexes.forEach(indexSQL => {
      this.db.query(indexSQL)
        .catch((err) => {
          logger.warn('Erro ao criar índice de auditoria', { error: err.message, sql: indexSQL });
        });
    });
  }

  /**
   * Registrar evento de auditoria
   */
  log({
    action,
    resource,
    resourceId = null,
    user = null,
    req = null,
    level = AUDIT_LEVELS.MEDIUM,
    details = {},
    oldValues = null,
    newValues = null,
    success = true,
    errorMessage = null
  }) {
    return new Promise((resolve, reject) => {
      // Garantir que o sistema está inicializado
      if (!this.initialized) {
        this.init();
      }
      const auditEntry = {
        action,
        resource,
        resource_id: resourceId ? String(resourceId) : null,
        user_id: user?.id || null,
        username: user?.username || null,
        ip_address: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.get('User-Agent') || null,
        level,
        details: JSON.stringify(details),
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        success: success ? 1 : 0,
        error_message: errorMessage,
        session_id: req?.sessionID || null,
        clinic_id: user?.clinic_id || req?.user?.clinic_id || null,
        timestamp: new Date().toISOString()
      };

      const insertSQL = `
        INSERT INTO audit_logs (
          action, resource, resource_id, user_id, username, 
          ip_address, user_agent, level, details, old_values, 
          new_values, success, error_message, session_id, clinic_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      const values = [
        auditEntry.action,
        auditEntry.resource,
        auditEntry.resource_id,
        auditEntry.user_id,
        auditEntry.username,
        auditEntry.ip_address,
        auditEntry.user_agent,
        auditEntry.level,
        auditEntry.details,
        auditEntry.old_values,
        auditEntry.new_values,
        auditEntry.success,
        auditEntry.error_message,
        auditEntry.session_id,
        auditEntry.clinic_id,
        auditEntry.timestamp
      ];

      this.db.query(insertSQL, values)
        .then((result) => {
          const auditId = result.rows[0]?.id;
          
          // Log também no sistema de logs
          logDataAccess(action, resource, user, req, {
            auditId,
            level,
            resourceId,
            success
          });
          
          resolve(auditId);
        })
        .catch((err) => {
          logger.error('Erro ao salvar log de auditoria', { 
            error: err.message, 
            auditEntry 
          });
          reject(err);
        });
    });
  }

  /**
   * Buscar logs de auditoria com filtros
   */
  search({
    userId = null,
    action = null,
    resource = null,
    level = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
  }) {
    return new Promise((resolve, reject) => {
      // Garantir que o sistema está inicializado
      if (!this.initialized) {
        this.init();
      }
      const conditions = [];
      const params = [];

      let paramIndex = 1;
      if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }

      if (action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(action);
      }

      if (resource) {
        conditions.push(`resource = $${paramIndex++}`);
        params.push(resource);
      }

      if (level) {
        conditions.push(`level = $${paramIndex++}`);
        params.push(level);
      }

      if (startDate) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (page - 1) * limit;
      
      const selectSQL = `
        SELECT * FROM audit_logs 
        ${whereClause}
        ORDER BY timestamp DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const countSQL = `
        SELECT COUNT(*) as total FROM audit_logs 
        ${whereClause}
      `;

      const selectParams = [...params, limit, offset];
      
      Promise.all([
        this.db.query(selectSQL, selectParams),
        this.db.query(countSQL, params)
      ])
        .then(([selectResult, countResult]) => {
          const formattedRows = selectResult.rows.map(row => ({
            ...row,
            details: row.details ? JSON.parse(row.details) : null,
            old_values: row.old_values ? JSON.parse(row.old_values) : null,
            new_values: row.new_values ? JSON.parse(row.new_values) : null,
            success: Boolean(row.success)
          }));

          resolve({
            logs: formattedRows,
            pagination: {
              page,
              limit,
              total: parseInt(countResult.rows[0].total),
              totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
            }
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * Limpar logs antigos (para compliance e performance)
   */
  cleanup(daysToKeep = 365) {
    return new Promise((resolve, reject) => {
      // Garantir que o sistema está inicializado
      if (!this.initialized) {
        this.init();
      }
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const deleteSQL = 'DELETE FROM audit_logs WHERE timestamp < $1';
      
      this.db.query(deleteSQL, [cutoffDate.toISOString()])
        .then((result) => {
          logger.info('Limpeza de logs de auditoria concluída', {
            deletedRows: result.rowCount,
            cutoffDate: cutoffDate.toISOString()
          });
          resolve(result.rowCount);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

// Instância singleton do audit manager
const auditManager = new AuditManager();

/**
 * Middleware para auditoria automática baseada na rota
 */
const auditMiddleware = (options = {}) => {
  const {
    resource,
    action = null,
    level = AUDIT_LEVELS.MEDIUM,
    captureBody = false,
    captureParams = true
  } = options;

  return async (req, res, next) => {
    // Garantir que o sistema está inicializado
    if (!auditManager.initialized) {
      try {
        auditManager.init();
      } catch (error) {
        logger.error('Erro ao inicializar auditoria no middleware', { error: error.message });
      }
    }
    
    const originalJson = res.json;
    const startTime = Date.now();
    
    // Capturar dados originais antes da modificação
    let oldValues = null;
    if (captureParams && req.params.id) {
      // Aqui você pode buscar os valores originais do banco
      // Implementar conforme necessário
    }

    // Override do res.json para capturar resposta
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Determinar ação baseada no método HTTP se não especificada
      let auditAction = action;
      if (!auditAction) {
        switch (req.method) {
          case 'POST': auditAction = AUDIT_ACTIONS.CREATE; break;
          case 'GET': auditAction = AUDIT_ACTIONS.READ; break;
          case 'PUT':
          case 'PATCH': auditAction = AUDIT_ACTIONS.UPDATE; break;
          case 'DELETE': auditAction = AUDIT_ACTIONS.DELETE; break;
          default: auditAction = 'UNKNOWN';
        }
      }

      // Preparar dados para auditoria
      const auditData = {
        action: auditAction,
        resource,
        resourceId: req.params.id || null,
        user: req.user,
        req,
        level,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          ...(captureParams && { params: req.params }),
          ...(captureBody && { body: req.body })
        },
        oldValues,
        newValues: success && req.method !== 'GET' ? data : null,
        success,
        errorMessage: !success ? data?.error || 'Unknown error' : null
      };

      // Registrar auditoria de forma assíncrona para não afetar performance
      auditManager.log(auditData).catch(err => {
        logger.error('Erro ao registrar auditoria', { error: err.message });
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Funções de conveniência para ações específicas
 */
const auditLogin = (user, req, success, details = {}) => {
  if (!auditManager.initialized) {
    auditManager.init();
  }
  return auditManager.log({
    action: AUDIT_ACTIONS.LOGIN,
    resource: AUDIT_RESOURCES.AUTH,
    user,
    req,
    level: success ? AUDIT_LEVELS.LOW : AUDIT_LEVELS.HIGH,
    details: {
      loginAttempt: true,
      ...details
    },
    success,
    errorMessage: success ? null : 'Login failed'
  });
};

const auditLogout = (user, req) => {
  if (!auditManager.initialized) {
    auditManager.init();
  }
  return auditManager.log({
    action: AUDIT_ACTIONS.LOGOUT,
    resource: AUDIT_RESOURCES.AUTH,
    user,
    req,
    level: AUDIT_LEVELS.LOW,
    details: { logoutTime: new Date().toISOString() },
    success: true
  });
};

const auditPasswordChange = (user, req, success, details = {}) => {
  if (!auditManager.initialized) {
    auditManager.init();
  }
  return auditManager.log({
    action: AUDIT_ACTIONS.PASSWORD_CHANGE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user.id,
    user,
    req,
    level: AUDIT_LEVELS.HIGH,
    details,
    success,
    errorMessage: success ? null : 'Password change failed'
  });
};

const auditDataExport = (user, req, exportType, recordCount) => {
  if (!auditManager.initialized) {
    auditManager.init();
  }
  return auditManager.log({
    action: AUDIT_ACTIONS.DATA_EXPORT,
    resource: AUDIT_RESOURCES.SYSTEM,
    user,
    req,
    level: AUDIT_LEVELS.HIGH,
    details: {
      exportType,
      recordCount,
      exportTime: new Date().toISOString()
    },
    success: true
  });
};

module.exports = {
  auditManager,
  auditMiddleware,
  auditLogin,
  auditLogout,
  auditPasswordChange,
  auditDataExport,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  AUDIT_LEVELS
};