/**
 * Environment Setup - Jest
 * Configuração de variáveis de ambiente para testes
 * Este arquivo é executado ANTES de qualquer teste ou setup
 */

// Configurar variáveis de ambiente PRIMEIRO
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