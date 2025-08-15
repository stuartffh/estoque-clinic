# ==================================================
# ESTOQUE CLINIC - MAKEFILE
# Comandos para desenvolvimento e produção
# ==================================================

.PHONY: help dev prod build test clean install migrate backup ssl

# Cores
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BLUE := \033[34m
NC := \033[0m

# Configurações
COMPOSE_DEV := docker-compose -f docker-compose.dev.yml
COMPOSE_PROD := docker-compose -f docker-compose.prod.yml
PROJECT_NAME := estoque-clinic

# ==========================================
# HELP
# ==========================================

help: ## Mostrar ajuda
	@echo ""
	@echo "$(BLUE)🚀 ESTOQUE CLINIC - COMANDOS DISPONÍVEIS$(NC)"
	@echo "=========================================="
	@echo ""
	@echo "$(GREEN)Desenvolvimento:$(NC)"
	@echo "  make install    - Instalar dependências"
	@echo "  make dev        - Iniciar ambiente de desenvolvimento"
	@echo "  make dev-logs   - Ver logs do desenvolvimento"
	@echo "  make dev-stop   - Parar ambiente de desenvolvimento"
	@echo ""
	@echo "$(GREEN)Produção:$(NC)"
	@echo "  make prod       - Iniciar ambiente de produção"
	@echo "  make prod-logs  - Ver logs de produção"
	@echo "  make prod-stop  - Parar ambiente de produção"
	@echo ""
	@echo "$(GREEN)Build e Deploy:$(NC)"
	@echo "  make build      - Build de produção"
	@echo "  make build-dev  - Build de desenvolvimento"
	@echo "  make push       - Push para registry"
	@echo ""
	@echo "$(GREEN)Banco de Dados:$(NC)"
	@echo "  make migrate    - Executar migrações"
	@echo "  make migrate-status - Status das migrações"
	@echo "  make backup     - Criar backup do banco"
	@echo "  make restore    - Restaurar backup"
	@echo ""
	@echo "$(GREEN)Testes:$(NC)"
	@echo "  make test       - Executar todos os testes"
	@echo "  make test-unit  - Testes unitários"
	@echo "  make test-integration - Testes de integração"
	@echo "  make test-coverage - Coverage dos testes"
	@echo ""
	@echo "$(GREEN)Segurança:$(NC)"
	@echo "  make ssl-dev    - Certificados SSL para desenvolvimento"
	@echo "  make ssl-prod   - Certificados SSL para produção"
	@echo "  make security-check - Auditoria de segurança"
	@echo ""
	@echo "$(GREEN)Utilitários:$(NC)"
	@echo "  make clean      - Limpar containers e volumes"
	@echo "  make logs       - Ver todos os logs"
	@echo "  make health     - Verificar saúde do sistema"
	@echo "  make shell      - Shell no container backend"
	@echo ""

# ==========================================
# DESENVOLVIMENTO
# ==========================================

install: ## Instalar dependências
	@echo "$(BLUE)📦 Instalando dependências...$(NC)"
	cd backend && npm install
	cd frontend && npm install
	@echo "$(GREEN)✅ Dependências instaladas$(NC)"

dev: ## Iniciar desenvolvimento
	@echo "$(BLUE)🚀 Iniciando ambiente de desenvolvimento...$(NC)"
	$(COMPOSE_DEV) up -d
	@echo "$(GREEN)✅ Ambiente de desenvolvimento iniciado$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:4200$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Adminer: http://localhost:8080$(NC)"
	@echo "$(YELLOW)Redis UI: http://localhost:8081$(NC)"

dev-logs: ## Ver logs de desenvolvimento
	$(COMPOSE_DEV) logs -f

dev-stop: ## Parar desenvolvimento
	@echo "$(BLUE)⏹️ Parando ambiente de desenvolvimento...$(NC)"
	$(COMPOSE_DEV) down
	@echo "$(GREEN)✅ Ambiente parado$(NC)"

dev-restart: ## Reiniciar desenvolvimento
	@echo "$(BLUE)🔄 Reiniciando ambiente de desenvolvimento...$(NC)"
	$(COMPOSE_DEV) restart
	@echo "$(GREEN)✅ Ambiente reiniciado$(NC)"

# ==========================================
# PRODUÇÃO
# ==========================================

prod: ## Iniciar produção
	@echo "$(BLUE)🚀 Iniciando ambiente de produção...$(NC)"
	@echo "$(RED)⚠️ Certifique-se de configurar as variáveis de ambiente!$(NC)"
	$(COMPOSE_PROD) up -d
	@echo "$(GREEN)✅ Ambiente de produção iniciado$(NC)"

prod-logs: ## Ver logs de produção
	$(COMPOSE_PROD) logs -f

prod-stop: ## Parar produção
	@echo "$(BLUE)⏹️ Parando ambiente de produção...$(NC)"
	$(COMPOSE_PROD) down
	@echo "$(GREEN)✅ Ambiente de produção parado$(NC)"

# ==========================================
# BUILD E DEPLOY
# ==========================================

build: ## Build de produção
	@echo "$(BLUE)🔨 Buildando imagens de produção...$(NC)"
	docker build -t $(PROJECT_NAME)-backend:latest ./backend
	docker build -t $(PROJECT_NAME)-frontend:latest ./frontend
	@echo "$(GREEN)✅ Build de produção concluído$(NC)"

build-dev: ## Build de desenvolvimento
	@echo "$(BLUE)🔨 Buildando imagens de desenvolvimento...$(NC)"
	$(COMPOSE_DEV) build
	@echo "$(GREEN)✅ Build de desenvolvimento concluído$(NC)"

push: ## Push para registry
	@echo "$(BLUE)📤 Fazendo push das imagens...$(NC)"
	docker push $(PROJECT_NAME)-backend:latest
	docker push $(PROJECT_NAME)-frontend:latest
	@echo "$(GREEN)✅ Imagens enviadas para registry$(NC)"

# ==========================================
# BANCO DE DADOS
# ==========================================

migrate: ## Executar migrações
	@echo "$(BLUE)🗃️ Executando migrações...$(NC)"
	cd backend && npm run migrate
	@echo "$(GREEN)✅ Migrações executadas$(NC)"

migrate-status: ## Status das migrações
	@echo "$(BLUE)📊 Verificando status das migrações...$(NC)"
	cd backend && npm run migrate:status

backup: ## Criar backup
	@echo "$(BLUE)💾 Criando backup do banco...$(NC)"
	cd backend && npm run backup
	@echo "$(GREEN)✅ Backup criado$(NC)"

restore: ## Restaurar backup
	@echo "$(RED)⚠️ Esta operação irá sobrescrever dados existentes!$(NC)"
	@read -p "Digite o nome do arquivo de backup: " backup_file; \
	cd backend && npm run backup:restore $$backup_file

# ==========================================
# TESTES
# ==========================================

test: ## Executar todos os testes
	@echo "$(BLUE)🧪 Executando todos os testes...$(NC)"
	cd backend && npm test
	cd frontend && npm test
	@echo "$(GREEN)✅ Todos os testes executados$(NC)"

test-unit: ## Testes unitários
	@echo "$(BLUE)🧪 Executando testes unitários...$(NC)"
	cd backend && npm run test:unit

test-integration: ## Testes de integração
	@echo "$(BLUE)🧪 Executando testes de integração...$(NC)"
	cd backend && npm run test:integration

test-coverage: ## Coverage dos testes
	@echo "$(BLUE)📊 Gerando coverage dos testes...$(NC)"
	cd backend && npm run test:coverage
	cd frontend && npm run test:coverage

# ==========================================
# SEGURANÇA
# ==========================================

ssl-dev: ## Configurar SSL para desenvolvimento
	@echo "$(BLUE)🔒 Configurando SSL para desenvolvimento...$(NC)"
	./scripts/ssl-setup.sh dev
	@echo "$(GREEN)✅ SSL de desenvolvimento configurado$(NC)"

ssl-prod: ## Configurar SSL para produção
	@echo "$(BLUE)🔒 Configurando SSL para produção...$(NC)"
	@read -p "Digite seu domínio: " domain; \
	read -p "Digite seu email: " email; \
	./scripts/ssl-setup.sh letsencrypt $$domain $$email

security-check: ## Auditoria de segurança
	@echo "$(BLUE)🔍 Executando auditoria de segurança...$(NC)"
	cd backend && npm run security:audit
	cd frontend && npm run security:audit

# ==========================================
# UTILITÁRIOS
# ==========================================

clean: ## Limpar containers e volumes
	@echo "$(BLUE)🧹 Limpando containers e volumes...$(NC)"
	docker-compose down -v --remove-orphans
	$(COMPOSE_DEV) down -v --remove-orphans
	$(COMPOSE_PROD) down -v --remove-orphans
	docker system prune -f
	@echo "$(GREEN)✅ Limpeza concluída$(NC)"

logs: ## Ver todos os logs
	@echo "$(BLUE)📋 Mostrando logs do sistema...$(NC)"
	docker-compose logs -f

health: ## Verificar saúde do sistema
	@echo "$(BLUE)🏥 Verificando saúde do sistema...$(NC)"
	@curl -s http://localhost:3001/health/detailed | jq . || echo "Sistema não está respondendo"

shell: ## Shell no container backend
	@echo "$(BLUE)🐚 Abrindo shell no backend...$(NC)"
	docker-compose exec backend sh

shell-db: ## Shell no banco de dados
	@echo "$(BLUE)🗃️ Abrindo shell no banco...$(NC)"
	docker-compose exec postgres psql -U postgres -d tematico

# ==========================================
# PRODUÇÃO - COMANDOS ESPECIAIS
# ==========================================

prod-init: ## Inicializar produção
	@echo "$(BLUE)⚙️ Inicializando ambiente de produção...$(NC)"
	cd backend && npm run production:init
	@echo "$(GREEN)✅ Produção inicializada$(NC)"

prod-validate: ## Validar configuração de produção
	@echo "$(BLUE)🔍 Validando configuração de produção...$(NC)"
	cd backend && npm run production:validate

prod-health: ## Health check de produção
	@echo "$(BLUE)🏥 Verificando saúde da produção...$(NC)"
	cd backend && npm run production:health

# ==========================================
# DEPLOY
# ==========================================

deploy-staging: ## Deploy para staging
	@echo "$(BLUE)🚀 Deploy para staging...$(NC)"
	@echo "$(RED)⚠️ Comando a ser implementado na CI/CD$(NC)"

deploy-production: ## Deploy para produção
	@echo "$(BLUE)🚀 Deploy para produção...$(NC)"
	@echo "$(RED)⚠️ Comando a ser implementado na CI/CD$(NC)"

# Default target
.DEFAULT_GOAL := help