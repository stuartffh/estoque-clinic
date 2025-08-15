# ==================================================
# ESTOQUE CLINIC FRONTEND - DOCKERFILE MULTI-STAGE
# Angular 20 com otimização para produção
# ==================================================

# ==========================================
# STAGE 1: Base Node.js
# ==========================================
FROM node:20-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S angular \
    && adduser -S clinic -u 1001 -g angular

WORKDIR /app

# Copiar package files
COPY package*.json ./

# ==========================================
# STAGE 2: Dependencies
# ==========================================
FROM base AS deps

# Configurar npm para performance
RUN npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000

# Instalar dependências
RUN npm ci --silent \
    && npm cache clean --force

# ==========================================
# STAGE 3: Build
# ==========================================
FROM base AS build

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY --chown=clinic:angular . .

# Build otimizado para produção
RUN npm run build -- \
    --configuration=production \
    --optimization=true \
    --output-hashing=all \
    --source-map=false \
    --extract-css=true \
    --named-chunks=false \
    --aot=true \
    --build-optimizer=true

# ==========================================
# STAGE 4: Production with Nginx
# ==========================================
FROM nginx:alpine AS production

# Labels
LABEL maintainer="EstoqueClinic Team" \
      version="1.0.0" \
      description="EstoqueClinic Frontend - Angular 20 + PrimeNG"

# Instalar dependências mínimas
RUN apk add --no-cache \
    curl \
    ca-certificates

# Remover configuração padrão do nginx
RUN rm -rf /usr/share/nginx/html/* \
    && rm /etc/nginx/conf.d/default.conf

# Copiar aplicação buildada
COPY --from=build /app/dist/estoque-clinic-frontend /usr/share/nginx/html

# Configuração nginx otimizada
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Criar usuário nginx não-root
RUN addgroup -g 1001 -S nginx-user \
    && adduser -S nginx-user -u 1001 -g nginx-user \
    && chown -R nginx-user:nginx-user /var/cache/nginx \
    && chown -R nginx-user:nginx-user /var/log/nginx \
    && chown -R nginx-user:nginx-user /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown -R nginx-user:nginx-user /var/run/nginx.pid

# Configurar usuário
USER nginx-user

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost || exit 1

# Expor porta
EXPOSE 80

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]

# ==========================================
# STAGE 5: Development
# ==========================================
FROM base AS development

# Instalar Angular CLI globalmente
RUN npm install -g @angular/cli@20

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY --chown=clinic:angular . .

# Configurar usuário
USER clinic

# Expor porta de desenvolvimento
EXPOSE 4200

# Comando para desenvolvimento
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]