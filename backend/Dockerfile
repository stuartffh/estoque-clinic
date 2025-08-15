# ==================================================
# ESTOQUE CLINIC - DOCKERFILE MULTI-STAGE OTIMIZADO
# Backend Node.js com segurança e performance
# ==================================================

# ==========================================
# STAGE 1: Base dependencies
# ==========================================
FROM node:20-alpine AS base

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S clinic -u 1001 -g nodejs

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# ==========================================
# STAGE 2: Development dependencies
# ==========================================
FROM base AS deps

# Configurar npm para performance
RUN npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000

# Instalar todas as dependências (dev + prod)
RUN npm ci --only=production --silent \
    && npm cache clean --force

# ==========================================
# STAGE 3: Build stage (para futuras otimizações)
# ==========================================
FROM base AS build

# Copiar dependências de produção
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY --chown=clinic:nodejs . .

# Remover arquivos desnecessários
RUN rm -rf \
    tests/ \
    coverage/ \
    logs/ \
    *.test.js \
    *.spec.js \
    jest.config.js \
    test-runner.sh \
    README.md \
    docs/

# ==========================================
# STAGE 4: Production image
# ==========================================
FROM node:20-alpine AS production

# Labels para metadados
LABEL maintainer="EstoqueClinic Team" \
      version="1.0.0" \
      description="EstoqueClinic API - Sistema de gestão de estoque para clínicas estéticas" \
      org.opencontainers.image.source="https://github.com/codex/estoque-clinic"

# Instalar dependências de sistema mínimas
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && addgroup -g 1001 -S nodejs \
    && adduser -S clinic -u 1001 -g nodejs

# Configurar usuário e diretório
USER clinic
WORKDIR /app

# Copiar aplicação buildada
COPY --from=build --chown=clinic:nodejs /app ./

# Criar diretórios necessários
RUN mkdir -p logs public uploads temp

# Configurar variáveis de ambiente de produção
ENV NODE_ENV=production \
    PORT=3001 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_AUDIT_LEVEL=high \
    NODE_OPTIONS="--max-old-space-size=512"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Expor porta
EXPOSE 3001

# Usar dumb-init para proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicialização
CMD ["node", "server.js"]

# ==========================================
# DOCKER BUILD COMMANDS:
# ==========================================
# Development: docker build --target base -t estoque-clinic:dev .
# Production:  docker build --target production -t estoque-clinic:prod .
# Multi-arch:  docker buildx build --platform linux/amd64,linux/arm64 -t estoque-clinic:latest .