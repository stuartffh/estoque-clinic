/**
 * Authentication Test Helper
 * Utilitários para testes de autenticação
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthTestHelper {
  /**
   * Gerar token JWT válido para testes
   */
  static generateValidToken(payload = {}) {
    const defaultPayload = {
      userId: 1,
      username: 'testuser',
      iat: Math.floor(Date.now() / 1000),
      ...payload
    };
    
    return jwt.sign(
      defaultPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'fullstack-app',
        audience: 'fullstack-users'
      }
    );
  }

  /**
   * Gerar token JWT expirado para testes
   */
  static generateExpiredToken(payload = {}) {
    const defaultPayload = {
      userId: 1,
      username: 'testuser',
      iat: Math.floor(Date.now() / 1000),
      ...payload
    };
    
    return jwt.sign(
      defaultPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '-1h', // Token já expirado
        issuer: 'fullstack-app',
        audience: 'fullstack-users'
      }
    );
  }

  /**
   * Gerar token JWT inválido para testes
   */
  static generateInvalidToken() {
    return 'invalid.jwt.token';
  }

  /**
   * Hash de senha para testes
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Criar usuário mock para testes
   */
  static createMockUser(overrides = {}) {
    return {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$hashedpassword', // Senha hasheada mock
      full_name: 'Test User',
      role: 'user',
      clinic_id: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Criar headers de autenticação para testes
   */
  static createAuthHeaders(token = null) {
    const authToken = token || this.generateValidToken();
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Criar payload de login para testes
   */
  static createLoginPayload(overrides = {}) {
    return {
      username: 'testuser',
      password: 'testpassword',
      ...overrides
    };
  }
}

module.exports = AuthTestHelper;