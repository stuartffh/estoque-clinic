#!/bin/bash

# ==================================================
# ESTOQUE CLINIC - SSL/TLS SETUP
# Script para configurar certificados SSL
# ==================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretórios
SSL_DIR="$(pwd)/nginx/ssl"
CERTS_DIR="$(pwd)/nginx/certs"

# Funções auxiliares
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Criar diretórios necessários
create_directories() {
    log_info "Criando estrutura de diretórios SSL..."
    
    mkdir -p "$SSL_DIR"
    mkdir -p "$CERTS_DIR"
    mkdir -p "./nginx/conf.d"
    
    log_success "Diretórios criados"
}

# Gerar certificado auto-assinado para desenvolvimento
generate_dev_certificate() {
    log_info "Gerando certificado auto-assinado para desenvolvimento..."
    
    # Configuração do certificado
    DOMAIN="localhost"
    COUNTRY="BR"
    STATE="SP"
    CITY="São Paulo"
    ORG="EstoqueClinic Dev"
    UNIT="Development"
    EMAIL="dev@estoqueclinic.com"
    
    # Gerar chave privada
    openssl genrsa -out "$CERTS_DIR/estoqueclinic.dev.key" 2048
    
    # Gerar certificado
    openssl req -new -x509 -key "$CERTS_DIR/estoqueclinic.dev.key" \
        -out "$CERTS_DIR/estoqueclinic.dev.crt" \
        -days 365 \
        -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$UNIT/CN=$DOMAIN/emailAddress=$EMAIL"
    
    # Gerar parâmetros DH
    openssl dhparam -out "$CERTS_DIR/dhparam.pem" 2048
    
    # Configurar permissões
    chmod 600 "$CERTS_DIR"/*.key
    chmod 644 "$CERTS_DIR"/*.crt
    chmod 644 "$CERTS_DIR"/*.pem
    
    log_success "Certificado de desenvolvimento gerado"
    log_warn "Este certificado é apenas para desenvolvimento local!"
}

# Configurar Let's Encrypt para produção
setup_letsencrypt() {
    log_info "Configurando Let's Encrypt para produção..."
    
    DOMAIN=${1:-"estoqueclinic.com"}
    EMAIL=${2:-"admin@estoqueclinic.com"}
    
    if [ "$DOMAIN" = "estoqueclinic.com" ]; then
        log_warn "Usando domínio padrão. Especifique seu domínio:"
        log_warn "  ./ssl-setup.sh letsencrypt yourdomain.com admin@yourdomain.com"
        return 1
    fi
    
    # Instalar certbot se não existir
    if ! command -v certbot &> /dev/null; then
        log_info "Instalando certbot..."
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Ubuntu/Debian
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y certbot python3-certbot-nginx
            # CentOS/RHEL
            elif command -v yum &> /dev/null; then
                sudo yum install -y certbot python3-certbot-nginx
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install certbot
            fi
        fi
    fi
    
    # Obter certificado Let's Encrypt
    log_info "Obtendo certificado Let's Encrypt para $DOMAIN..."
    
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN,app.$DOMAIN,api.$DOMAIN"
    
    # Copiar certificados para nginx
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/estoqueclinic.com.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERTS_DIR/estoqueclinic.com.key"
    
    # Gerar DH params se não existir
    if [ ! -f "$CERTS_DIR/dhparam.pem" ]; then
        log_info "Gerando parâmetros Diffie-Hellman (pode demorar alguns minutos)..."
        openssl dhparam -out "$CERTS_DIR/dhparam.pem" 2048
    fi
    
    log_success "Certificado Let's Encrypt configurado"
}

# Configurar renovação automática
setup_auto_renewal() {
    log_info "Configurando renovação automática de certificados..."
    
    # Criar script de renovação
    cat > "$SSL_DIR/renew-certs.sh" << 'EOF'
#!/bin/bash
# Renovar certificados Let's Encrypt

DOMAIN=${1:-"estoqueclinic.com"}
CERTS_DIR="$(dirname "$0")/../certs"

# Renovar certificado
certbot renew --quiet --no-self-upgrade

# Copiar certificados renovados
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/estoqueclinic.com.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERTS_DIR/estoqueclinic.com.key"
    
    # Reload nginx
    docker-compose exec nginx nginx -s reload
    
    echo "✅ Certificados renovados e nginx recarregado"
fi
EOF
    
    chmod +x "$SSL_DIR/renew-certs.sh"
    
    # Adicionar ao crontab (executar 2x por dia)
    CRON_ENTRY="0 */12 * * * $SSL_DIR/renew-certs.sh"
    
    log_info "Para ativar renovação automática, adicione ao crontab:"
    log_info "  crontab -e"
    log_info "  $CRON_ENTRY"
    
    log_success "Script de renovação criado"
}

# Validar certificados
validate_certificates() {
    log_info "Validando certificados SSL..."
    
    local cert_file="$CERTS_DIR/estoqueclinic.com.crt"
    local key_file="$CERTS_DIR/estoqueclinic.com.key"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        log_error "Certificados não encontrados"
        return 1
    fi
    
    # Verificar validade do certificado
    EXPIRY=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    
    log_info "Certificado expira em: $EXPIRY"
    log_info "Dias restantes: $DAYS_LEFT"
    
    if [ $DAYS_LEFT -lt 30 ]; then
        log_warn "Certificado expira em menos de 30 dias!"
    else
        log_success "Certificado válido"
    fi
    
    # Verificar se chave e certificado combinam
    CERT_HASH=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    KEY_HASH=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [ "$CERT_HASH" = "$KEY_HASH" ]; then
        log_success "Certificado e chave privada combinam"
    else
        log_error "Certificado e chave privada NÃO combinam!"
        return 1
    fi
    
    return 0
}

# Configurar SSL no backend Node.js
configure_nodejs_ssl() {
    log_info "Configurando SSL no Node.js..."
    
    cat > "./backend/config/ssl.js" << 'EOF'
/**
 * ESTOQUE CLINIC - SSL CONFIGURATION
 * Configuração SSL/TLS para Node.js
 */

const fs = require('fs');
const path = require('path');

class SSLConfig {
  constructor() {
    this.sslEnabled = process.env.SSL_ENABLED === 'true';
    this.certPath = process.env.SSL_CERT_PATH || '../nginx/certs/estoqueclinic.com.crt';
    this.keyPath = process.env.SSL_KEY_PATH || '../nginx/certs/estoqueclinic.com.key';
  }

  getSSLOptions() {
    if (!this.sslEnabled) {
      return null;
    }

    try {
      const cert = fs.readFileSync(path.resolve(__dirname, this.certPath));
      const key = fs.readFileSync(path.resolve(__dirname, this.keyPath));
      
      return {
        cert,
        key,
        // Configurações de segurança
        secureProtocol: 'TLS_method',
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA384'
        ].join(':'),
        honorCipherOrder: true
      };
    } catch (error) {
      console.error('❌ Erro ao carregar certificados SSL:', error.message);
      return null;
    }
  }

  isEnabled() {
    return this.sslEnabled;
  }
}

module.exports = new SSLConfig();
EOF
    
    log_success "Configuração SSL do Node.js criada"
}

# Menu principal
show_menu() {
    echo ""
    echo "🔒 ESTOQUE CLINIC - SSL SETUP"
    echo "=============================="
    echo ""
    echo "Opções disponíveis:"
    echo "  dev                   - Gerar certificado para desenvolvimento"
    echo "  letsencrypt [domain]  - Configurar Let's Encrypt para produção"
    echo "  renew                 - Configurar renovação automática"
    echo "  validate              - Validar certificados existentes"
    echo "  nodejs                - Configurar SSL no Node.js"
    echo "  all                   - Configuração completa para desenvolvimento"
    echo ""
    echo "Exemplos:"
    echo "  ./ssl-setup.sh dev"
    echo "  ./ssl-setup.sh letsencrypt yourdomain.com admin@yourdomain.com"
    echo "  ./ssl-setup.sh validate"
    echo ""
}

# Main
main() {
    case "${1:-help}" in
        dev)
            create_directories
            generate_dev_certificate
            configure_nodejs_ssl
            log_success "Configuração SSL de desenvolvimento concluída!"
            ;;
        letsencrypt)
            create_directories
            setup_letsencrypt "$2" "$3"
            setup_auto_renewal
            configure_nodejs_ssl
            ;;
        renew)
            setup_auto_renewal
            ;;
        validate)
            validate_certificates
            ;;
        nodejs)
            configure_nodejs_ssl
            ;;
        all)
            create_directories
            generate_dev_certificate
            configure_nodejs_ssl
            log_success "Configuração completa para desenvolvimento!"
            log_info "Para produção, execute: ./ssl-setup.sh letsencrypt yourdomain.com"
            ;;
        help|*)
            show_menu
            ;;
    esac
}

main "$@"