/**
 * ESTOQUE CLINIC - SISTEMA DE BACKUP
 * Script para backup automático do banco de dados
 */

require('dotenv').config();
const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class BackupManager {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'tematico',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    };
    
    this.backupDir = path.join(__dirname, '../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`✅ Diretório de backup criado: ${this.backupDir}`);
    }
  }

  generateBackupFilename(type = 'full') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `estoque-clinic-${type}-${timestamp}.sql`;
  }

  async createDump(filename, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        dataOnly = false,
        schemaOnly = false,
        excludeTables = [],
        includeTables = []
      } = options;

      let pgDumpArgs = [
        '--host', this.config.host,
        '--port', this.config.port,
        '--username', this.config.user,
        '--dbname', this.config.database,
        '--verbose',
        '--no-password',
        '--format=custom',
        '--compress=9'
      ];

      if (dataOnly) pgDumpArgs.push('--data-only');
      if (schemaOnly) pgDumpArgs.push('--schema-only');
      
      excludeTables.forEach(table => {
        pgDumpArgs.push('--exclude-table', table);
      });
      
      includeTables.forEach(table => {
        pgDumpArgs.push('--table', table);
      });

      const outputPath = path.join(this.backupDir, filename);
      pgDumpArgs.push('--file', outputPath);

      const command = `pg_dump ${pgDumpArgs.join(' ')}`;
      
      console.log(`🔄 Criando backup: ${filename}`);
      
      const process = exec(command, {
        env: { ...process.env, PGPASSWORD: this.config.password }
      });

      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data;
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Backup criado com sucesso: ${filename}`);
          resolve(outputPath);
        } else {
          console.error(`❌ Erro no backup: ${stderr}`);
          reject(new Error(`pg_dump falhou com código ${code}: ${stderr}`));
        }
      });
    });
  }

  async createFullBackup() {
    const filename = this.generateBackupFilename('full');
    const startTime = Date.now();
    
    try {
      const backupPath = await this.createDump(filename);
      const stats = await fs.stat(backupPath);
      const duration = Date.now() - startTime;
      
      console.log(`📊 Backup completo finalizado:`);
      console.log(`   Arquivo: ${filename}`);
      console.log(`   Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Duração: ${duration}ms`);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Erro ao criar backup completo:', error.message);
      throw error;
    }
  }

  async createDataBackup() {
    const filename = this.generateBackupFilename('data');
    return await this.createDump(filename, { 
      dataOnly: true,
      excludeTables: ['schema_migrations', 'audit_logs'] 
    });
  }

  async createSchemaBackup() {
    const filename = this.generateBackupFilename('schema');
    return await this.createDump(filename, { schemaOnly: true });
  }

  async createTablesBackup(tables) {
    const filename = this.generateBackupFilename(`tables-${tables.join('-')}`);
    return await this.createDump(filename, { includeTables: tables });
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > retentionMs) {
            await fs.unlink(filePath);
            console.log(`🗑️ Backup antigo removido: ${file}`);
            deletedCount++;
          }
        }
      }
      
      if (deletedCount > 0) {
        console.log(`✅ Limpeza concluída: ${deletedCount} backup(s) antigo(s) removido(s)`);
      } else {
        console.log('✅ Nenhum backup antigo para remover');
      }
      
    } catch (error) {
      console.error('❌ Erro na limpeza de backups:', error.message);
    }
  }

  async restoreBackup(backupFile) {
    return new Promise((resolve, reject) => {
      const backupPath = path.join(this.backupDir, backupFile);
      
      const restoreArgs = [
        '--host', this.config.host,
        '--port', this.config.port,
        '--username', this.config.user,
        '--dbname', this.config.database,
        '--verbose',
        '--no-password',
        '--clean',
        '--if-exists',
        backupPath
      ];

      const command = `pg_restore ${restoreArgs.join(' ')}`;
      
      console.log(`🔄 Restaurando backup: ${backupFile}`);
      console.log('⚠️ ATENÇÃO: Esta operação irá sobrescrever dados existentes!');
      
      const process = exec(command, {
        env: { ...process.env, PGPASSWORD: this.config.password }
      });

      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data;
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Backup restaurado com sucesso: ${backupFile}`);
          resolve();
        } else {
          console.error(`❌ Erro na restauração: ${stderr}`);
          reject(new Error(`pg_restore falhou com código ${code}: ${stderr}`));
        }
      });
    });
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql'));
      
      if (backupFiles.length === 0) {
        console.log('📭 Nenhum backup encontrado');
        return;
      }
      
      console.log('\n📋 BACKUPS DISPONÍVEIS');
      console.log('======================');
      
      for (const file of backupFiles.sort().reverse()) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        const size = (stats.size / 1024 / 1024).toFixed(2);
        const date = stats.mtime.toLocaleString('pt-BR');
        
        console.log(`📁 ${file}`);
        console.log(`   📅 ${date}`);
        console.log(`   📊 ${size} MB`);
        console.log('');
      }
      
    } catch (error) {
      console.error('❌ Erro ao listar backups:', error.message);
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'full';
  const backupManager = new BackupManager();
  
  try {
    await backupManager.ensureBackupDir();
    
    switch (command) {
      case 'full':
        await backupManager.createFullBackup();
        await backupManager.cleanOldBackups();
        break;
        
      case 'data':
        await backupManager.createDataBackup();
        break;
        
      case 'schema':
        await backupManager.createSchemaBackup();
        break;
        
      case 'tables':
        const tables = process.argv.slice(3);
        if (tables.length === 0) {
          console.error('❌ Especifique as tabelas: node backup.js tables users products');
          process.exit(1);
        }
        await backupManager.createTablesBackup(tables);
        break;
        
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('❌ Especifique o arquivo: node backup.js restore backup-file.sql');
          process.exit(1);
        }
        await backupManager.restoreBackup(backupFile);
        break;
        
      case 'list':
        await backupManager.listBackups();
        break;
        
      case 'clean':
        await backupManager.cleanOldBackups();
        break;
        
      default:
        console.log(`
🚀 ESTOQUE CLINIC - BACKUP MANAGER

Comandos disponíveis:
  full            - Backup completo (padrão)
  data            - Backup apenas dos dados
  schema          - Backup apenas do schema
  tables [names]  - Backup de tabelas específicas
  restore [file]  - Restaurar backup
  list            - Listar backups disponíveis
  clean           - Limpar backups antigos

Exemplos:
  node backup.js full
  node backup.js tables users products
  node backup.js restore estoque-clinic-full-2024-01-01.sql
        `);
        break;
    }
  } finally {
    await backupManager.close();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = BackupManager;