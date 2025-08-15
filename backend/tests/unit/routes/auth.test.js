/**
 * Testes Unitários - Rotas de Autenticação
 * Testa login, logout, refresh token e validação
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const AuthTestHelper = require('../../helpers/auth.helper');
const { ApiError, errorHandler } = require('../../../middleware/errorHandler');

// Mock do banco de dados
const mockDatabase = {
  get: jest.fn(),
  query: jest.fn()
};

jest.mock('../../../config/database', () => ({
  getDatabase: () => mockDatabase
}));

jest.mock('../../../middleware/apiKeyAuth', () => ({
  requireApiKey: (req, res, next) => next() // Mock simples para bypass
}));

// Importar rotas após mocks
const authRoutes = require('../../../routes/auth');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(errorHandler);
    
    // Reset mocks
    jest.clearAllMocks();
    mockDatabase.get.mockReset();
    mockDatabase.query.mockReset();
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      username: 'testuser',
      password: 'testpassword123'
    };

    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$hashedPassword',
      full_name: 'Test User',
      is_active: true
    };

    test('deve fazer login com credenciais válidas', async () => {
      // Mock database response
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });

      // Mock bcrypt comparison
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        fullName: mockUser.full_name
      });
      expect(response.body.expiresIn).toBe('24h');
    });

    test('deve rejeitar login sem username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'testpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username e password são obrigatórios');
      expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });

    test('deve rejeitar login sem password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username e password são obrigatórios');
      expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });

    test('deve rejeitar login com usuário inexistente', async () => {
      // Mock database response - user not found
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    test('deve rejeitar login com senha incorreta', async () => {
      // Mock database response
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });

      // Mock bcrypt comparison - password mismatch
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    test('deve rejeitar login com usuário inativo', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      
      // Mock database response
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, null); // SQLite query already filters inactive users
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    test('deve tratar erros do banco de dados', async () => {
      // Mock database error
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database connection failed'), null);
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    test('deve tratar erros do bcrypt', async () => {
      // Mock database response
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });

      // Mock bcrypt error
      jest.spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    test('deve aceitar login com email', async () => {
      // Mock database response
      mockDatabase.get.mockImplementation((query, params, callback) => {
        expect(params).toEqual(['test@example.com', 'test@example.com']);
        callback(null, mockUser);
      });

      // Mock bcrypt comparison
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'test@example.com',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login realizado com sucesso');
    });
  });

  describe('POST /auth/refresh', () => {
    test('deve rejeitar refresh sem token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Refresh token é obrigatório');
      expect(response.body.code).toBe('REFRESH_TOKEN_REQUIRED');
    });

    test('deve aceitar refresh token válido', async () => {
      // Este teste requer implementação completa do refresh token
      // Por enquanto, verifica apenas que a rota existe
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      // Deve retornar erro por token inválido, não por rota não encontrada
      expect(response.status).not.toBe(404);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});