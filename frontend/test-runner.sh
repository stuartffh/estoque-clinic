#!/bin/bash
# Script para execução dos testes frontend do EstoqueClinic

# Configurar Chrome para testes
export CHROME_BIN=/usr/bin/chromium-browser

echo "🧪 Executando testes do EstoqueClinic Frontend..."
echo "Chrome: $CHROME_BIN"

# Executar testes baseado no parâmetro
case "$1" in
    "watch")
        echo "🔹 Executando testes em modo watch..."
        npm run test:watch
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
        echo "🔹 Executando testes em modo interativo..."
        npm test
        ;;
esac