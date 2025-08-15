/**
 * Testes Unitários - Rotas de Usuários
 * Testa listagem, criação, atualização e exclusão de usuários
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const AuthTestHelper = require('../../helpers/auth.helper');
const { ApiError, errorHandler } = require('../../../middleware/errorHandler');
const { authenticateToken } = require('../../../middleware/auth');

// Mock do banco de dados
const mockDatabase = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn()
};

jest.mock('../../../config/database', () => ({
  getDatabase: () => mockDatabase
}));

// Mock do middleware de autenticação
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    next();
  }
}));

// Importar rotas após mocks
const userRoutes = require('../../../routes/users');

describe('User Routes', () => {
  let app;

  const mockUsers = [
    {
      id: 1,
      username: 'user1',
      email: 'user1@test.com',
      full_name: 'User One',
      is_active: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      username: 'user2',
      email: 'user2@test.com',
      full_name: 'User Two',
      is_active: 1,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/users', userRoutes);
    app.use(errorHandler);
    
    // Reset mocks
    jest.clearAllMocks();
    mockDatabase.get.mockReset();
    mockDatabase.all.mockReset();
    mockDatabase.run.mockReset();
  });

  describe('GET /users', () => {
    test('deve listar usuários com paginação padrão', async () => {
      // Mock database responses
      mockDatabase.all.mockImplementation((query, params, callback) => {
        callback(null, mockUsers);
      });
      
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, { count: 2 });
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0]).toEqual({
        id: 1,
        username: 'user1',
        email: 'user1@test.com',
        fullName: 'User One',
        is_active: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    test('deve listar usuários com paginação customizada', async () => {
      mockDatabase.all.mockImplementation((query, params, callback) => {
        expect(params).toEqual([5, 5]); // limit, offset
        callback(null, mockUsers.slice(0, 1));
      });
      
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, { count: 10 });
      });

      const response = await request(app)
        .get('/users')
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 10,
        totalPages: 2
      });
    });

    test('deve tratar erros do banco na listagem', async () => {
      mockDatabase.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao listar usuários');
      expect(response.body.code).toBe('LIST_USERS_ERROR');
    });

    test('deve tratar erro ao contar usuários', async () => {
      mockDatabase.all.mockImplementation((query, params, callback) => {
        callback(null, mockUsers);
      });
      
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(new Error('Count error'), null);
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao contar usuários');
    });
  });

  describe('GET /users/:id', () => {
    test('deve retornar usuário por ID', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        expect(params).toEqual([1]);
        callback(null, mockUsers[0]);
      });

      const response = await request(app).get('/users/1');

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('user1');
      expect(response.body.user.fullName).toBe('User One');
    });

    test('deve retornar 404 para usuário inexistente', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/users/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    test('deve tratar erro de ID inválido', async () => {
      const response = await request(app).get('/users/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID do usuário deve ser um número válido');
    });

    test('deve tratar erros do banco na busca por ID', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/users/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar usuário');
      expect(response.body.code).toBe('GET_USER_ERROR');
    });
  });

  describe('POST /users', () => {
    const newUserData = {
      username: 'newuser',
      email: 'newuser@test.com',
      password: 'password123',
      fullName: 'New User'
    };

    test('deve criar usuário com dados válidos', async () => {
      // Mock password hashing
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$hashedPassword');
      
      mockDatabase.run.mockImplementation(function(query, params, callback) {
        this.lastID = 3;
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/users')
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Usuário criado com sucesso');
      expect(response.body.userId).toBe(3);
    });

    test('deve rejeitar criação sem campos obrigatórios', async () => {
      const response = await request(app)
        .post('/users')
        .send({ username: 'onlyusername' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username, email e password são obrigatórios');
      expect(response.body.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    test('deve rejeitar criação com email inválido', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          ...newUserData,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email deve ter um formato válido');
      expect(response.body.code).toBe('INVALID_EMAIL_FORMAT');
    });

    test('deve rejeitar senha muito curta', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          ...newUserData,
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password deve ter pelo menos 6 caracteres');
      expect(response.body.code).toBe('PASSWORD_TOO_SHORT');
    });

    test('deve tratar erros do bcrypt', async () => {
      jest.spyOn(bcrypt, 'hash').mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/users')
        .send(newUserData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    test('deve tratar erro de usuário duplicado', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$hashedPassword');
      
      mockDatabase.run.mockImplementation(function(query, params, callback) {
        const error = new Error('UNIQUE constraint failed');
        error.code = 'SQLITE_CONSTRAINT_UNIQUE';
        callback.call(this, error);
      });

      const response = await request(app)
        .post('/users')
        .send(newUserData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Username ou email já existem');
      expect(response.body.code).toBe('USER_ALREADY_EXISTS');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});