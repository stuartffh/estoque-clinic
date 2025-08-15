/**
 * Jest Setup - EstoqueClinic API
 * Configurações globais para todos os testes
 */

// Configurar variáveis de ambiente PRIMEIRO (antes de qualquer import)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-super-secure-256-bits-for-testing-only';
process.env.DB_NAME = 'estoque_clinic_test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test_password';

console.log('🔧 Test environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET ? '✓ Configured' : '❌ Missing',
  DB_NAME: process.env.DB_NAME
});

// Configurar timeout padrão para testes
jest.setTimeout(10000);

// Mock de console.log para testes mais limpos (opcional)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Silenciar logs durante testes (descomente se necessário)
  // console.log = jest.fn();
  // console.error = jest.fn();
});

afterAll(() => {
  // Restaurar console original
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Configuração global para limpeza após cada teste
afterEach(() => {
  // Limpar mocks após cada teste
  jest.clearAllMocks();
});

// Helper para aguardar tempo determinado
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para gerar dados de teste aleatórios
global.generateTestData = {
  email: () => `test${Date.now()}@example.com`,
  username: () => `user${Date.now()}`,
  password: () => 'Test123!@#',
  clinic: () => ({
    name: `Test Clinic ${Date.now()}`,
    email: `clinic${Date.now()}@test.com`,
    phone: '(11) 99999-9999'
  }),
  product: () => ({
    name: `Test Product ${Date.now()}`,
    brand: 'Test Brand',
    category: 'botox',
    current_stock: 10,
    min_stock: 5,
    max_stock: 50
  })
};

// Console personalizado para testes
global.testLog = (message) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(`[TEST] ${message}`);
  }
};