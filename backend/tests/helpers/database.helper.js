/**
 * Database Test Helper
 * Utilitários para testes de banco de dados
 */

const { getDatabase } = require('../../config/database');

class DatabaseTestHelper {
  /**
   * Limpar todas as tabelas de teste
   */
  static async clearAllTables() {
    const db = getDatabase();
    
    const tables = [
      'inventory_movements',
      'product_batches', 
      'users',
      'clinics',
      'clinic_groups',
      'aesthetic_products'
    ];

    for (const table of tables) {
      try {
        await new Promise((resolve, reject) => {
          db.run(`DELETE FROM ${table}`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (error) {
        // Ignorar erros se tabela não existir
        console.warn(`Warning: Could not clear table ${table}:`, error.message);
      }
    }
  }

  /**
   * Inserir usuário de teste
   */
  static async insertTestUser(userData = {}) {
    const db = getDatabase();
    
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$test.hashed.password',
      full_name: 'Test User',
      role: 'user',
      clinic_id: 1,
      is_active: true
    };

    const user = { ...defaultUser, ...userData };

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (username, email, password, full_name, role, clinic_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        user.username,
        user.email, 
        user.password,
        user.full_name,
        user.role,
        user.clinic_id,
        user.is_active
      ], function(err) {
        if (err) reject(err);
        else resolve({ ...user, id: this.lastID });
      });
    });
  }

  /**
   * Inserir clínica de teste
   */
  static async insertTestClinic(clinicData = {}) {
    const db = getDatabase();
    
    const defaultClinic = {
      name: 'Test Clinic',
      email: 'clinic@test.com',
      phone: '(11) 99999-9999',
      address: 'Test Address',
      city: 'São Paulo',
      state: 'SP',
      is_active: true
    };

    const clinic = { ...defaultClinic, ...clinicData };

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO clinics (name, email, phone, address_street, address_city, address_state, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        clinic.name,
        clinic.email,
        clinic.phone,
        clinic.address,
        clinic.city,
        clinic.state,
        clinic.is_active
      ], function(err) {
        if (err) reject(err);
        else resolve({ ...clinic, id: this.lastID });
      });
    });
  }

  /**
   * Inserir produto de teste
   */
  static async insertTestProduct(productData = {}) {
    const db = getDatabase();
    
    const defaultProduct = {
      name: 'Test Product',
      brand: 'Test Brand',
      category: 'botox',
      description: 'Test product description',
      is_active: true
    };

    const product = { ...defaultProduct, ...productData };

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO aesthetic_products (name, brand, category, description, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        product.name,
        product.brand,
        product.category,
        product.description,
        product.is_active
      ], function(err) {
        if (err) reject(err);
        else resolve({ ...product, id: this.lastID });
      });
    });
  }

  /**
   * Contar registros em uma tabela
   */
  static async countRecords(tableName) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  /**
   * Executar query customizada para testes
   */
  static async query(sql, params = []) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Inicializar banco de teste com dados básicos
   */
  static async seedTestData() {
    await this.clearAllTables();
    
    // Inserir dados básicos para testes
    const clinic = await this.insertTestClinic();
    const user = await this.insertTestUser({ clinic_id: clinic.id });
    const product = await this.insertTestProduct();
    
    return {
      clinic,
      user, 
      product
    };
  }
}

module.exports = DatabaseTestHelper;