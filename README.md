# 🏥 EstoqueClinic

<div align="center">
  <img src="https://img.shields.io/badge/Angular-20.1.0-red?style=for-the-badge&logo=angular" />
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-13+-blue?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/TypeScript-5.8+-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</div>

<p align="center">
  <strong>Sistema completo de gestão de inventário para clínicas estéticas</strong><br>
  Controle total de produtos, movimentações, alertas e relatórios com arquitetura multi-tenant
</p>

---

## 📋 Índice

- [🎯 Sobre o Projeto](#-sobre-o-projeto)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Tecnologias](#️-tecnologias)
- [🚀 Quick Start](#-quick-start)
- [📦 Instalação](#-instalação)
- [⚙️ Configuração](#️-configuração)
- [🏗️ Arquitetura](#️-arquitetura)
- [📖 API Documentation](#-api-documentation)
- [🤝 Contribuindo](#-contribuindo)
- [📄 Licença](#-licença)

---

## 🎯 Sobre o Projeto

**EstoqueClinic** é uma solução moderna e completa para gestão de inventário de clínicas estéticas, desenvolvida com foco em **performance**, **segurança** e **escalabilidade**.

### 🎨 Por que EstoqueClinic?

- **🏥 Multi-Tenancy:** Gerencie múltiplas clínicas em uma única plataforma
- **💉 Especializado:** Foco específico em produtos estéticos (Botox, preenchedores, etc.)
- **📊 Analytics Avançado:** Dashboard com KPIs e relatórios detalhados
- **⚡ Performance:** Interface moderna e responsiva
- **🔒 Seguro:** Autenticação JWT e controle de acesso granular
- **📱 Responsivo:** Funciona perfeitamente em desktop, tablet e mobile

### 🎯 Casos de Uso

- Controle de estoque de produtos estéticos
- Rastreamento de movimentações (entradas/saídas)
- Gestão de profissionais e usuários
- Alertas de estoque baixo e vencimento
- Relatórios gerenciais por período
- Dashboard executivo com KPIs

---

## ✨ Funcionalidades

### 📊 **Dashboard Executivo**
- KPIs em tempo real (produtos, estoque baixo, clínicas ativas)
- Gráficos de movimentação e distribuição por categoria
- Notificações e atividades recentes
- Performance do sistema

### 📦 **Gestão de Produtos**
- Catálogo completo de produtos estéticos
- Controle de estoque atual, mínimo e máximo
- Categorização por tipo (toxinas, preenchedores, peelings)
- Rastreamento de lotes e datas de vencimento

### 🔄 **Movimentações**
- Registro de entradas e saídas
- Histórico completo por produto
- Associação com profissionais responsáveis
- Relatórios de consumo por período

### ⚠️ **Sistema de Alertas**
- Alertas de estoque baixo automáticos
- Notificações de produtos próximos ao vencimento
- Dashboard de alertas com priorização
- Integração com sistema de notificações

### 👥 **Gestão de Profissionais**
- Cadastro de médicos, enfermeiras e esteticistas
- Controle de status (ativo, inativo, férias)
- Associação com clínicas específicas
- Histórico de atividades por profissional

### 🏥 **Multi-Clínicas**
- Gestão centralizada de múltiplas clínicas
- Estatísticas individuais por unidade
- Controle de acesso por clínica
- Relatórios consolidados

### 📈 **Relatórios Avançados**
- Relatórios de estoque por categoria
- Análise de movimentações por período
- Relatórios financeiros de custos
- Análise de giro de estoque
- Exportação em PDF e Excel

---

## 🛠️ Tecnologias

### **Frontend**
- **Angular 20** - Framework moderno e robusto
- **PrimeNG 17** - Componentes UI profissionais
- **TailwindCSS** - Styling utilitário e responsivo
- **TypeScript 5.8** - Tipagem estática e produtividade
- **Chart.js** - Gráficos interativos
- **RxJS** - Programação reativa

### **Backend**
- **Node.js 18+** - Runtime JavaScript performático
- **Express.js** - Framework web minimalista
- **PostgreSQL** - Banco de dados relacional robusto
- **JWT** - Autenticação stateless
- **bcryptjs** - Hash de senhas seguro
- **Helmet** - Middlewares de segurança

### **DevOps & Tools**
- **Docker** - Containerização
- **ESLint** - Linting de código
- **Prettier** - Formatação automática
- **Swagger** - Documentação da API
- **GitHub Actions** - CI/CD pipeline

---

## 🚀 Quick Start

### Pré-requisitos
```bash
node >= 18.0.0
npm >= 8.0.0
postgresql >= 13.0
git
```

### Instalação Rápida
```bash
# Clone o repositório
git clone https://github.com/stuartffh/estoque-clinic.git
cd estoque-clinic

# Backend Setup
cd backend
npm install
cp .env.example .env
# Configure suas variáveis de ambiente no .env
npm run init-db
npm run dev

# Em outro terminal - Frontend Setup
cd ../frontend
npm install
npm start
```

🎉 **Pronto!** Acesse http://localhost:4200

**Credenciais padrão:**
- Email: `admin@estoqueclinic.com`
- Senha: `123456`

---

## 📦 Instalação

### 1. **Clone o Repositório**
```bash
git clone https://github.com/stuartffh/estoque-clinic.git
cd estoque-clinic
```

### 2. **Backend Setup**
```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Configurar banco de dados PostgreSQL
# Editar .env com suas credenciais

# Executar migrações
npm run init-db

# Iniciar servidor de desenvolvimento
npm run dev
```

### 3. **Frontend Setup**
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start
```

### 4. **Acesso**
- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3001

---

## ⚙️ Configuração

### **Variáveis de Ambiente**

Crie o arquivo `.env` no backend:
```env
# Servidor
PORT=3001
NODE_ENV=development

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=estoque_clinic
DB_USER=postgres
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:4200
```

### **Banco de Dados PostgreSQL**

```sql
-- Criar banco e usuário
CREATE DATABASE estoque_clinic;
CREATE USER estoque_user WITH ENCRYPTED PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE estoque_clinic TO estoque_user;
```

---

## 🏗️ Arquitetura

### **Visão Geral**
```
┌─────────────────────────────────────────────────────────────┐
│                    EstoqueClinic System                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Angular 20)                                     │
│  ├── Dashboard         ├── Produtos       ├── Relatórios   │
│  ├── Profissionais     ├── Movimentações  ├── Alertas      │
│  ├── Clínicas          ├── Auth Guard     └── Services     │
│  └── PrimeNG + TailwindCSS                                 │
├─────────────────────────────────────────────────────────────┤
│  Backend (Node.js + Express)                              │
│  ├── Routes: /auth, /products, /movements, /reports       │
│  ├── Middleware: Auth, CORS, Helmet, Rate Limit           │
│  ├── Models: User, Product, Clinic, Movement              │
│  └── Utils: JWT, Bcrypt, Validators                       │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                    │
│  ├── Multi-tenant structure                               │
│  ├── Indexed for performance                              │
│  └── ACID compliance                                       │
└─────────────────────────────────────────────────────────────┘
```

### **Estrutura de Pastas**
```
estoque-clinic/
├── backend/              # API Node.js
│   ├── config/           # Configurações
│   ├── middleware/       # Middlewares Express
│   ├── models/           # Modelos de dados
│   ├── routes/           # Rotas da API
│   ├── utils/            # Utilitários
│   └── server.js         # Entrada da aplicação
├── frontend/             # App Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Componentes
│   │   │   ├── services/      # Serviços
│   │   │   ├── guards/        # Guards de rota
│   │   │   └── interceptors/  # Interceptors HTTP
│   │   ├── assets/            # Assets estáticos
│   │   └── environments/      # Ambientes
├── docs/                 # Documentação
└── scripts/              # Scripts utilitários
```

---

## 📖 API Documentation

### **Endpoints Principais**

#### Autenticação
```http
POST /api/auth/login      # Login do usuário
POST /api/auth/register   # Registro de usuário
POST /api/auth/refresh    # Refresh do token
POST /api/auth/logout     # Logout
```

#### Produtos
```http
GET    /api/products           # Lista produtos
POST   /api/products           # Cria produto
GET    /api/products/:id       # Busca produto
PUT    /api/products/:id       # Atualiza produto
DELETE /api/products/:id       # Remove produto
```

#### Movimentações
```http
GET    /api/movements          # Lista movimentações
POST   /api/movements          # Registra movimentação
GET    /api/movements/:id      # Busca movimentação
```

#### Dashboard
```http
GET /api/dashboard/stats       # KPIs do dashboard
GET /api/dashboard/charts      # Dados dos gráficos
```

### **Autenticação**
Todas as rotas protegidas requerem Bearer Token:
```http
Authorization: Bearer <jwt_token>
```

---

## 🤝 Contribuindo

### **Como Contribuir**

1. **Fork** o projeto
2. Crie sua **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add: amazing feature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### **Padrões de Código**

#### Commits (Conventional Commits)
```bash
feat: adiciona autenticação por biometria
fix: corrige cálculo de estoque
docs: atualiza README com exemplos
style: formata código com prettier
refactor: refatora componente de dashboard
test: adiciona testes unitários
```

### **Code Review**
- Código deve passar em todos os linters
- Documentação deve estar atualizada
- Seguir padrões ESLint e Prettier
- Manter consistência com o projeto

---

## 📞 Suporte

### **Reportar Problemas**
- 🐛 [Issues](https://github.com/stuartffh/estoque-clinic/issues)
- 💬 [Discussions](https://github.com/stuartffh/estoque-clinic/discussions)

### **Recursos Úteis**
- 📚 [Documentação completa](./docs/)
- 🔧 [Plano de produção](./PRODUCTION-PLAN.md)
- 🚀 [Guia de deploy](./docs/deployment.md)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Agradecimentos

- [Angular Team](https://angular.io) - Framework fantástico
- [PrimeNG](https://primeng.org) - Componentes UI profissionais
- [Node.js Community](https://nodejs.org) - Runtime poderoso
- [PostgreSQL](https://postgresql.org) - Banco de dados robusto

---

<div align="center">
  <p>Feito com ❤️ para clínicas estéticas</p>
  <p><strong>EstoqueClinic</strong> - Gestão profissional de inventário</p>
  
  ⭐ **Dê uma estrela se este projeto foi útil!** ⭐
</div>