/**
 * ESTOQUE CLINIC - SISTEMA DE MIGRAÇÃO
 * Script para executar migrações de banco de dados
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class MigrationManager {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'tematico',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
    
    this.migrationsDir = path.join(__dirname, '../database/migrations');
  }

  async init() {
    // Criar tabela de controle de migrações
    const createMigrationsTable = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(64)
      );
    `;

    try {
      await this.pool.query(createMigrationsTable);
      console.log('✅ Tabela de controle de migrações criada');
    } catch (error) {
      console.error('❌ Erro ao criar tabela de migrações:', error.message);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      console.error('❌ Erro ao buscar migrações executadas:', error.message);
      return [];
    }
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => ({
          version: file.replace('.sql', ''),
          filename: file,
          fullPath: path.join(this.migrationsDir, file)
        }));
    } catch (error) {
      console.error('❌ Erro ao ler arquivos de migração:', error.message);
      return [];
    }
  }

  async calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async executeMigration(migration) {
    const startTime = Date.now();
    
    try {
      const content = await fs.readFile(migration.fullPath, 'utf8');
      const checksum = await this.calculateChecksum(content);
      
      console.log(`🔄 Executando migração: ${migration.filename}`);
      
      // Executar migração em transação
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Executar SQL da migração
        await client.query(content);
        
        // Registrar migração como executada
        const executionTime = Date.now() - startTime;
        await client.query(
          `INSERT INTO schema_migrations (version, filename, execution_time_ms, checksum) 
           VALUES ($1, $2, $3, $4)`,
          [migration.version, migration.filename, executionTime, checksum]
        );
        
        await client.query('COMMIT');
        console.log(`✅ Migração ${migration.filename} executada com sucesso (${executionTime}ms)`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`❌ Erro ao executar migração ${migration.filename}:`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    try {
      console.log('🚀 Iniciando processo de migração...');
      
      await this.init();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      console.log(`📋 Encontradas ${migrationFiles.length} migrações`);
      console.log(`✅ ${executedMigrations.length} migrações já executadas`);
      
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.version)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Todas as migrações estão atualizadas');
        return;
      }
      
      console.log(`🔄 Executando ${pendingMigrations.length} migrações pendentes...`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 Todas as migrações executadas com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro no processo de migração:', error.message);
      process.exit(1);
    }
  }

  async rollback(steps = 1) {
    try {
      console.log(`🔄 Iniciando rollback de ${steps} migração(ões)...`);
      
      const result = await this.pool.query(
        'SELECT version, filename FROM schema_migrations ORDER BY version DESC LIMIT $1',
        [steps]
      );
      
      if (result.rows.length === 0) {
        console.log('❌ Nenhuma migração para fazer rollback');
        return;
      }
      
      for (const row of result.rows) {
        const rollbackFile = path.join(
          this.migrationsDir, 
          'rollback', 
          row.filename.replace('.sql', '_rollback.sql')
        );
        
        try {
          const rollbackContent = await fs.readFile(rollbackFile, 'utf8');
          
          const client = await this.pool.connect();
          try {
            await client.query('BEGIN');
            await client.query(rollbackContent);
            await client.query(
              'DELETE FROM schema_migrations WHERE version = $1',
              [row.version]
            );
            await client.query('COMMIT');
            
            console.log(`✅ Rollback da migração ${row.filename} executado`);
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
          
        } catch (error) {
          console.warn(`⚠️ Arquivo de rollback não encontrado: ${rollbackFile}`);
          console.log(`🔄 Removendo registro da migração ${row.filename} do controle`);
          
          await this.pool.query(
            'DELETE FROM schema_migrations WHERE version = $1',
            [row.version]
          );
        }
      }
      
      console.log('🎉 Rollback executado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro no rollback:', error.message);
      process.exit(1);
    }
  }

  async status() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      console.log('\n📊 STATUS DAS MIGRAÇÕES');
      console.log('========================');
      
      for (const migration of migrationFiles) {
        const isExecuted = executedMigrations.includes(migration.version);
        const status = isExecuted ? '✅ EXECUTADA' : '⏳ PENDENTE';
        console.log(`${status} - ${migration.filename}`);
      }
      
      const pendingCount = migrationFiles.length - executedMigrations.length;
      console.log(`\n📈 Resumo: ${executedMigrations.length} executadas, ${pendingCount} pendentes`);
      
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error.message);
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'migrate';
  const migrationManager = new MigrationManager();
  
  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await migrationManager.runMigrations();
        break;
        
      case 'rollback':
      case 'down':
        const steps = parseInt(process.argv[3]) || 1;
        await migrationManager.rollback(steps);
        break;
        
      case 'status':
        await migrationManager.status();
        break;
        
      default:
        console.log(`
🚀 ESTOQUE CLINIC - MIGRATION MANAGER

Comandos disponíveis:
  migrate, up     - Executar migrações pendentes
  rollback, down  - Fazer rollback (padrão: 1 migração)
  status          - Ver status das migrações

Exemplos:
  node migrate.js migrate
  node migrate.js rollback 2
  node migrate.js status
        `);
        break;
    }
  } finally {
    await migrationManager.close();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = MigrationManager;