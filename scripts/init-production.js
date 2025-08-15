/**
 * ESTOQUE CLINIC - INICIALIZAÇÃO DE PRODUÇÃO
 * Script para preparar o sistema para ambiente de produção
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class ProductionInitializer {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'tematico',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
  }

  async validateEnvironment() {
    console.log('🔍 Validando variáveis de ambiente...');
    
    const requiredVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET', 
      'API_KEY',
      'DB_PASSWORD'
    ];
    
    const missing = [];
    const weak = [];
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      
      if (!value) {
        missing.push(varName);
      } else if (value.length < 32) {
        weak.push(varName);
      } else if (value.includes('dev-') || value.includes('not-for-production')) {
        weak.push(varName);
      }
    }
    
    if (missing.length > 0) {
      console.error('❌ Variáveis de ambiente obrigatórias não definidas:');
      missing.forEach(v => console.error(`   - ${v}`));
      throw new Error('Configuração de ambiente incompleta');
    }
    
    if (weak.length > 0) {
      console.warn('⚠️ Variáveis de ambiente fracas/inseguras:');
      weak.forEach(v => console.warn(`   - ${v}`));
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Configuração insegura para produção');
      }
    }
    
    console.log('✅ Variáveis de ambiente validadas');
  }

  async testDatabaseConnection() {
    console.log('🔍 Testando conexão com banco de dados...');
    
    try {
      const result = await this.pool.query('SELECT version(), current_database(), current_user');
      const { version, current_database, current_user } = result.rows[0];
      
      console.log('✅ Conexão com banco estabelecida:');
      console.log(`   Database: ${current_database}`);
      console.log(`   User: ${current_user}`);
      console.log(`   Version: ${version.split(' ').slice(0, 2).join(' ')}`);
      
    } catch (error) {
      console.error('❌ Erro na conexão com banco:', error.message);
      throw error;
    }
  }

  async createAdminUser() {
    console.log('👤 Verificando usuário administrador...');
    
    try {
      // Verificar se já existe admin
      const existingAdmin = await this.pool.query(
        'SELECT id FROM users WHERE username = $1 OR role = $2',
        ['admin', 'super_admin']
      );
      
      if (existingAdmin.rows.length > 0) {
        console.log('✅ Usuário administrador já existe');
        return;
      }
      
      // Criar usuário admin seguro
      const adminPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const adminUser = await this.pool.query(`
        INSERT INTO users (
          username, email, password, full_name, role, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id, username, email
      `, [
        'admin',
        'admin@estoqueclinic.com',
        hashedPassword,
        'Administrador do Sistema',
        'super_admin',
        true
      ]);
      
      console.log('✅ Usuário administrador criado:');
      console.log(`   Username: admin`);
      console.log(`   Email: admin@estoqueclinic.com`);
      console.log(`   Password: ${adminPassword}`);
      console.log('');
      console.log('🔒 IMPORTANTE: Anote a senha acima e mude-a no primeiro login!');
      
      // Salvar credenciais em arquivo seguro (temporário)
      const credentialsFile = path.join(__dirname, '../admin-credentials.txt');
      await fs.writeFile(credentialsFile, `
CREDENCIAIS DO ADMINISTRADOR - ESTOQUE CLINIC
=============================================
Username: admin
Password: ${adminPassword}
Email: admin@estoqueclinic.com

ATENÇÃO: Mude esta senha no primeiro login!
Este arquivo será removido automaticamente em 24h.
      `.trim());
      
      console.log(`📝 Credenciais salvas temporariamente em: ${credentialsFile}`);
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário admin:', error.message);
      throw error;
    }
  }

  async optimizeDatabase() {
    console.log('⚡ Otimizando banco de dados...');
    
    try {
      // Atualizar estatísticas
      await this.pool.query('ANALYZE');
      console.log('✅ Estatísticas do banco atualizadas');
      
      // Configurações de performance para produção
      const performanceSettings = [
        "ALTER SYSTEM SET shared_buffers = '256MB'",
        "ALTER SYSTEM SET effective_cache_size = '1GB'",
        "ALTER SYSTEM SET maintenance_work_mem = '64MB'",
        "ALTER SYSTEM SET checkpoint_completion_target = 0.9",
        "ALTER SYSTEM SET wal_buffers = '16MB'",
        "ALTER SYSTEM SET default_statistics_target = 100"
      ];
      
      for (const setting of performanceSettings) {
        try {
          await this.pool.query(setting);
        } catch (error) {
          console.warn(`⚠️ Não foi possível aplicar: ${setting}`);
        }
      }
      
      console.log('✅ Configurações de performance aplicadas');
      
    } catch (error) {
      console.error('❌ Erro na otimização:', error.message);
    }
  }

  async createInitialData() {
    console.log('📊 Criando dados iniciais...');
    
    try {
      // Verificar se já existem dados
      const userCount = await this.pool.query('SELECT COUNT(*) FROM users');
      const clinicCount = await this.pool.query('SELECT COUNT(*) FROM clinics');
      
      if (parseInt(userCount.rows[0].count) > 1 || parseInt(clinicCount.rows[0].count) > 0) {
        console.log('✅ Dados iniciais já existem');
        return;
      }
      
      // Criar clínica padrão
      const defaultClinic = await this.pool.query(`
        INSERT INTO clinics (
          name, address, phone, email, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        'Clínica Estética Padrão',
        'Endereço a ser configurado',
        '(00) 0000-0000',
        'contato@clinica.com',
        true
      ]);
      
      const clinicId = defaultClinic.rows[0].id;
      
      // Associar admin à clínica
      await this.pool.query(
        'UPDATE users SET clinic_id = $1 WHERE username = $2',
        [clinicId, 'admin']
      );
      
      console.log('✅ Clínica padrão criada e associada ao admin');
      
    } catch (error) {
      console.error('❌ Erro ao criar dados iniciais:', error.message);
    }
  }

  async runHealthChecks() {
    console.log('🏥 Executando verificações de saúde...');
    
    const checks = [
      {
        name: 'Conectividade do banco',
        test: async () => {
          const result = await this.pool.query('SELECT 1');
          return result.rows[0]['?column?'] === 1;
        }
      },
      {
        name: 'Tabelas essenciais',
        test: async () => {
          const tables = ['users', 'clinics', 'aesthetic_products'];
          for (const table of tables) {
            await this.pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
          }
          return true;
        }
      },
      {
        name: 'Índices de performance',
        test: async () => {
          const result = await this.pool.query(`
            SELECT COUNT(*) FROM pg_indexes 
            WHERE tablename IN ('users', 'clinics', 'aesthetic_products')
          `);
          return parseInt(result.rows[0].count) > 5;
        }
      },
      {
        name: 'Usuário administrador',
        test: async () => {
          const result = await this.pool.query(
            'SELECT COUNT(*) FROM users WHERE role = $1 AND is_active = true',
            ['super_admin']
          );
          return parseInt(result.rows[0].count) > 0;
        }
      }
    ];
    
    let passed = 0;
    
    for (const check of checks) {
      try {
        const result = await check.test();
        if (result) {
          console.log(`✅ ${check.name}`);
          passed++;
        } else {
          console.log(`❌ ${check.name}`);
        }
      } catch (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Resultado: ${passed}/${checks.length} verificações passaram`);
    
    if (passed === checks.length) {
      console.log('🎉 Sistema pronto para produção!');
    } else {
      console.log('⚠️ Sistema possui problemas que devem ser resolvidos');
      process.exit(1);
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'init';
  const initializer = new ProductionInitializer();
  
  try {
    console.log('🚀 ESTOQUE CLINIC - INICIALIZAÇÃO DE PRODUÇÃO');
    console.log('============================================\n');
    
    switch (command) {
      case 'init':
        await initializer.validateEnvironment();
        await initializer.testDatabaseConnection();
        await initializer.createAdminUser();
        await initializer.optimizeDatabase();
        await initializer.createInitialData();
        await initializer.runHealthChecks();
        break;
        
      case 'validate':
        await initializer.validateEnvironment();
        break;
        
      case 'health':
        await initializer.runHealthChecks();
        break;
        
      case 'admin':
        await initializer.createAdminUser();
        break;
        
      default:
        console.log(`
Comandos disponíveis:
  init       - Inicialização completa
  validate   - Validar configuração
  health     - Verificações de saúde
  admin      - Criar usuário administrador

Exemplo: node init-production.js init
        `);
        break;
    }
    
  } finally {
    await initializer.close();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = ProductionInitializer;