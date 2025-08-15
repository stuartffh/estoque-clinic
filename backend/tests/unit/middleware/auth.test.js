/**
 * Testes Unitários - Middleware de Autenticação
 */

const jwt = require('jsonwebtoken');
const { generateToken, verifyToken, authenticateToken } = require('../../../middleware/auth');
const AuthTestHelper = require('../../helpers/auth.helper');

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    test('deve gerar token JWT válido', () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateToken(userId, username);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verificar se o token é válido
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
      expect(decoded.username).toBe(username);
    });

    test('deve incluir timestamp de expiração', () => {
      const token = generateToken(1, 'test');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    test('deve verificar token válido', () => {
      const token = AuthTestHelper.generateValidToken();
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe('testuser');
    });

    test('deve retornar null para token inválido', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    test('deve retornar null para token expirado', () => {
      const expiredToken = AuthTestHelper.generateExpiredToken();
      const decoded = verifyToken(expiredToken);
      
      expect(decoded).toBeNull();
    });

    test('deve retornar null para token malformado', () => {
      const malformedToken = 'not.a.jwt';
      const decoded = verifyToken(malformedToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('authenticateToken', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn(() => res),
        json: jest.fn(() => res)
      };
      next = jest.fn();
    });

    test('deve rejeitar requisição sem token', () => {
      authenticateToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Token de acesso requerido',
          code: 'TOKEN_REQUIRED'
        })
      );
    });

    test('deve rejeitar token inválido', (done) => {
      req.headers.authorization = 'Bearer invalid.token';
      
      authenticateToken(req, res, (error) => {
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Token inválido');
        done();
      });
    });

    test('deve rejeitar header malformado', (done) => {
      req.headers.authorization = 'InvalidFormat token';
      
      authenticateToken(req, res, (error) => {
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Token inválido');
        done();
      });
    });

    test('deve rejeitar token sem Bearer prefix', (done) => {
      const token = AuthTestHelper.generateValidToken();
      req.headers.authorization = token; // Sem "Bearer "
      
      authenticateToken(req, res, (error) => {
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Token de acesso requerido');
        done();
      });
    });

    test('deve rejeitar token expirado', (done) => {
      const expiredToken = AuthTestHelper.generateExpiredToken();
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      authenticateToken(req, res, (error) => {
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        done();
      });
    });
  });

  describe('Integração com diferentes payloads', () => {
    test('deve funcionar com payload de admin', () => {
      const adminPayload = {
        userId: 1,
        username: 'admin',
        role: 'admin',
        clinic_id: null
      };
      
      const token = AuthTestHelper.generateValidToken(adminPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.role).toBe('admin');
      expect(decoded.clinic_id).toBeNull();
    });

    test('deve funcionar com payload de usuário comum', () => {
      const userPayload = {
        userId: 2,
        username: 'user',
        role: 'user',
        clinic_id: 1
      };
      
      const token = AuthTestHelper.generateValidToken(userPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.role).toBe('user');
      expect(decoded.clinic_id).toBe(1);
    });
  });
});