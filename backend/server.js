/**
 * ESTOQUE CLINIC - Servidor Principal da API
 * Sistema de gestão de estoque para clínicas estéticas
 * Inclui multi-tenancy, autenticação JWT, CORS e rotas protegidas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { ApiError, errorHandler } = require('./middleware/errorHandler');

// Importar rotas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');

// EstoqueClinic routes
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

// Importar middleware de autenticação
const { authenticateToken } = require('./middleware/auth');

// Importar configuração do banco de dados
const { initDatabase } = require('./config/database');

const app = express();
// Confiar no primeiro proxy para que o express-rate-limit
// identifique corretamente o IP do cliente quando X-Forwarded-For estiver presente
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Configurações de segurança
app.use(helmet());

// Rate limiting - limita requisições por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela de tempo
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  }
});
app.use(limiter);

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login, tente novamente em 15 minutos.'
  },
  skipSuccessfulRequests: true
});

// Configuração CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rotas de autenticação (aplicar rate limiting específico)
app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);

// Rotas protegidas (requerem autenticação)
app.use('/dashboard', authenticateToken, dashboardRoutes);
app.use('/users', authenticateToken, usersRoutes);

// EstoqueClinic API routes
app.use('/api/clinic-groups', authenticateToken, clinicGroupsRoutes);
app.use('/api/clinics', authenticateToken, clinicsRoutes);
app.use('/api/aesthetic-products', authenticateToken, aestheticProductsRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);

// Legacy routes (manter para compatibilidade)
app.use('/restaurantes', authenticateToken, restaurantesRoutes);
app.use('/eventos', authenticateToken, eventosRoutes);
app.use('/reservas', authenticateToken, reservasRoutes);
app.use('/eventos-reservas', authenticateToken, eventosReservasRoutes);
app.use('/diretrizes', authenticateToken, diretrizesRoutes);
app.use('/configuracoes', authenticateToken, configuracoesRoutes);

// Rotas para servir arquivos estáticos (imagens de produtos, logos de clínicas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/products', express.static(path.join(__dirname, 'uploads/products')));
app.use('/uploads/clinics', express.static(path.join(__dirname, 'uploads/clinics')));

// Middleware de tratamento de erros
app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada'));
});

app.use(errorHandler);

// Inicializar banco de dados e servidor
async function startServer() {
  try {
    // Iniciar servidor primeiro
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`🔒 CORS habilitado para: ${process.env.CORS_ORIGIN}`);
    });
    
    // Inicializar banco de dados em background (não bloquear o servidor)
    initDatabase()
      .then(() => {
        console.log('✅ Banco de dados inicializado com sucesso');
      })
      .catch(error => {
        console.error('❌ Erro ao inicializar banco de dados:', error.message);
        console.warn('⚠️ Servidor continuará rodando sem banco de dados');
      });
      
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de sinais para encerramento graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

