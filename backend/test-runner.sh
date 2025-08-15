#!/bin/bash
# Script para execução dos testes com configuração adequada de ambiente

# Configurar variáveis de ambiente para testes
export NODE_ENV=test
export JWT_SECRET="test-jwt-secret-key-super-secure-256-bits-for-testing-only"
export DB_NAME="estoque_clinic_test"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_USER="postgres"
export DB_PASSWORD="test_password"

echo "🧪 Executando testes do EstoqueClinic Backend..."
echo "Environment: $NODE_ENV"
echo "JWT_SECRET: Configured ✓"

# Executar testes baseado no parâmetro
case "$1" in
    "unit")
        echo "🔹 Executando testes unitários..."
        npm run test:unit
        ;;
    "integration")
        echo "🔹 Executando testes de integração..."
        npm run test:integration
        ;;
    "coverage")
        echo "🔹 Executando testes com cobertura..."
        npm run test:coverage
        ;;
    "ci")
        echo "🔹 Executando testes para CI..."
        npm run test:ci
        ;;
    *)
        echo "🔹 Executando todos os testes..."
        npm test
        ;;
esac