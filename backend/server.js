/**
 * ESTOQUE CLINIC - Servidor Principal da API
 * Sistema de gestão de estoque com segurança avançada
 * Inclui validação, auditoria, rate limiting e proteções robustas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// =====================================
// MIDDLEWARE DE SEGURANÇA
// =====================================
const { 
  helmetConfig, 
  sanitizeInput, 
  xssProtection, 
  customSecurityHeaders,
  protectAgainstHPP,
  validateContentType,
  limitBodySize,
  blockSuspiciousUserAgents
} = require('./middleware/security');

const { 
  generalRateLimit, 
  authRateLimit, 
  publicApiRateLimit,
  dynamicRateLimit,
  suspiciousActivityDetector,
  ipWhitelistMiddleware
} = require('./middleware/rateLimiting');

const { validate, authSchemas, userSchemas, productSchemas, querySchemas } = require('./middleware/validation');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { auditMiddleware } = require('./middleware/audit');
const { ApiError, errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const { initDatabase } = require('./config/database');

// =====================================
// ROTAS
// =====================================
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');
const clinicGroupsRoutes = require('./routes/clinic-groups');
const clinicsRoutes = require('./routes/clinics');
const aestheticProductsRoutes = require('./routes/aesthetic-products');
const inventoryRoutes = require('./routes/inventory');

// Legacy routes (manter para compatibilidade)
const restaurantesRoutes = require('./routes/restaurantes');
const eventosRoutes = require('./routes/eventos');
const reservasRoutes = require('./routes/reservas');
const eventosReservasRoutes = require('./routes/eventos_reservas');
const diretrizesRoutes = require('./routes/diretrizes');
const configuracoesRoutes = require('./routes/configuracoes');

const app = express();
const PORT = process.env.PORT || 3001;

// =====================================
// CONFIGURAÇÕES INICIAIS
// =====================================

// Logs de inicialização
logger.info('🚀 Iniciando EstoqueClinic API', {
  port: PORT,
  nodeEnv: process.env.NODE_ENV,
  version: process.env.npm_package_version || '1.0.0'
});

// Trust proxy para rate limiting correto
app.set('trust proxy', 1);

// =====================================
// MIDDLEWARE DE SEGURANÇA (ORDEM IMPORTANTE)
// =====================================

// 1. Headers de segurança
app.use(helmetConfig);
app.use(customSecurityHeaders);

// 2. Proteção contra ataques básicos
app.use(blockSuspiciousUserAgents);
app.use(protectAgainstHPP);

// 3. Sanitização de entrada
app.use(sanitizeInput);
app.use(xssProtection);

// 4. Rate limiting
app.use(ipWhitelistMiddleware);
app.use(generalRateLimit);

// 5. Logging de requisições
app.use(requestLogger);

// 6. Validação de content-type e tamanho
app.use(validateContentType);
app.use(limitBodySize('10mb'));

// =====================================
// CONFIGURAÇÃO CORS ROBUSTA
// =====================================

const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens permitidas
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:4200',
      'http://localhost:3000', // Para desenvolvimento
      'https://estoqueclinic.com', // Produção
      'https://app.estoqueclinic.com' // App em produção
    ];

    // Permitir requisições sem origin (Postman, apps mobile)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('Origem CORS bloqueada', { origin, ip: '' });
      callback(new Error('Acesso negado por política CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// =====================================
// PARSERS E MIDDLEWARE BÁSICO
// =====================================

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Verificar se o JSON é válido antes de tentar fazer parse
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new ApiError(400, 'JSON inválido', 'INVALID_JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Servir arquivos estáticos com cache
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// =====================================
// HEALTH CHECKS E MONITORAMENTO
// =====================================

// Health checks detalhados
app.use('/health', healthRoutes);

// Ping simples para load balancers
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    message: 'pong',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// Métricas básicas para monitoramento
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  };
  
  res.status(200).json(metrics);
});

// =====================================
// DOCUMENTAÇÃO DA API
// =====================================

if (process.env.SWAGGER_ENABLED !== 'false') {
  app.use('/api-docs', 
    publicApiRateLimit,
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "EstoqueClinic API Documentation",
      customfavIcon: "/public/favicon.ico"
    })
  );
}

// =====================================
// ROTAS DA API
// =====================================

// Rota de autenticação com rate limiting específico
app.use('/auth', 
  authRateLimit,
  auditMiddleware({ resource: 'auth', level: 'high' }),
  authRoutes
);

// Rotas públicas (com rate limiting mais restritivo)
app.use('/public', 
  publicApiRateLimit,
  auditMiddleware({ resource: 'public', level: 'low' })
  // Adicionar rotas públicas aqui se necessário
);

// Middleware de autenticação para rotas protegidas
app.use('/api', authenticateToken);

// Rate limiting dinâmico baseado no usuário
app.use('/api', dynamicRateLimit);

// Rotas protegidas com auditoria
app.use('/api/dashboard', 
  auditMiddleware({ resource: 'dashboard' }),
  dashboardRoutes
);

app.use('/api/users',
  auditMiddleware({ resource: 'users', captureBody: true }),
  usersRoutes
);

app.use('/api/clinic-groups',
  auditMiddleware({ resource: 'clinic-groups', captureBody: true }),
  clinicGroupsRoutes
);

app.use('/api/clinics',
  auditMiddleware({ resource: 'clinics', captureBody: true }),
  clinicsRoutes
);

app.use('/api/products',
  auditMiddleware({ resource: 'products', captureBody: true }),
  aestheticProductsRoutes
);

app.use('/api/inventory',
  auditMiddleware({ resource: 'inventory', captureBody: true, level: 'high' }),
  inventoryRoutes
);

// Legacy routes (com auditoria básica)
app.use('/api/restaurantes', auditMiddleware({ resource: 'restaurantes' }), restaurantesRoutes);
app.use('/api/eventos', auditMiddleware({ resource: 'eventos' }), eventosRoutes);
app.use('/api/reservas', auditMiddleware({ resource: 'reservas' }), reservasRoutes);
app.use('/api/eventos-reservas', auditMiddleware({ resource: 'eventos-reservas' }), eventosReservasRoutes);
app.use('/api/diretrizes', auditMiddleware({ resource: 'diretrizes' }), diretrizesRoutes);
app.use('/api/configuracoes', auditMiddleware({ resource: 'configuracoes' }), configuracoesRoutes);

// =====================================
// DETECÇÃO DE ATIVIDADE SUSPEITA
// =====================================

app.use(suspiciousActivityDetector);

// =====================================
// TRATAMENTO DE ERROS
// =====================================

// 404 - Rota não encontrada
app.use('*', (req, res, next) => {
  logger.warn('Rota não encontrada', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(new ApiError(404, 'Rota não encontrada', 'ROUTE_NOT_FOUND'));
});

// Error logger middleware
app.use(errorLogger);

// Handler de erros global
app.use(errorHandler);

// =====================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================

const startServer = async () => {
  try {
    // Inicializar banco de dados
    await initDatabase();
    logger.info('✅ Banco de dados inicializado');

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      logger.info('✅ EstoqueClinic API iniciada com sucesso', {
        port: PORT,
        environment: process.env.NODE_ENV,
        cors: corsOptions.origin,
        docs: process.env.SWAGGER_ENABLED !== 'false' ? `http://localhost:${PORT}/api-docs` : 'disabled'
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`📡 Sinal ${signal} recebido. Iniciando shutdown graceful...`);
      
      server.close(() => {
        logger.info('✅ Servidor HTTP fechado');
        process.exit(0);
      });

      // Forçar shutdown após 10 segundos
      setTimeout(() => {
        logger.error('❌ Forçando shutdown após timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Erro ao inicializar servidor', { 
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Iniciar servidor
startServer();

module.exports = app;